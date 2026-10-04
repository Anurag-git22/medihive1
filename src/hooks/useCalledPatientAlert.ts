import { useState, useEffect, useCallback, useRef } from "react";
import {
  playHospitalChime,
  getChimeMuted,
  setChimeMuted,
  getChimeVolume,
  setChimeVolume,
  isAudioContextReady,
} from "../services/chimeService";
import {
  shouldTriggerPatientAlert,
  subscribeToQueueBroadcastChannel,
  PatientCalledPayload,
} from "../services/queueAlertService";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface CalledPatientAlert {
  id: string; // unique alert instance ID
  token: string;
  patientName: string;
  calledAt: string;
  timestamp: number;
  isAudioSuspended: boolean;
}

interface UseCalledPatientAlertOptions {
  userRole?: string; // 'receptionist' | 'doctor' | 'admin'
  isWaitingArea?: boolean; // true for TV display screen
  onPatientCalled?: (alert: CalledPatientAlert) => void;
}

export const useCalledPatientAlert = (options: UseCalledPatientAlertOptions = {}) => {
  const { userRole, isWaitingArea = false, onPatientCalled } = options;

  const [alerts, setAlerts] = useState<CalledPatientAlert[]>([]);
  const [isMuted, setIsMutedState] = useState<boolean>(() => getChimeMuted());
  const [volume, setVolumeState] = useState<number>(() => getChimeVolume());
  const [isAudioSuspended, setIsAudioSuspended] = useState<boolean>(false);

  // Store known previous statuses of queue items to strictly detect status change to "With Doctor"
  const previousStatusMap = useRef<Map<string, string>>(new Map());

  // Listen for external chime settings changes (e.g. across components)
  useEffect(() => {
    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ muted: boolean; volume: number }>;
      if (customEvent.detail) {
        setIsMutedState(customEvent.detail.muted);
        setVolumeState(customEvent.detail.volume);
      }
    };
    window.addEventListener("medihive_chime_settings_changed", handleSettingsChange);
    return () => {
      window.removeEventListener("medihive_chime_settings_changed", handleSettingsChange);
    };
  }, []);

  // Dismiss a specific banner
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  // Dismiss all alerts
  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Trigger alert workflow
  const triggerAlert = useCallback(
    async (token: string, patientName: string, calledAt: string, queueId?: string) => {
      // Rule 3.a: Only trigger if receptionist or waiting area screen
      const isEligible = isWaitingArea || userRole === "receptionist";
      if (!isEligible) return;

      // Rule 2: Deduplication check
      if (!shouldTriggerPatientAlert(token, calledAt, queueId)) {
        console.log(`[QueueAlert] Deduplicated alert for ${token}`);
        return;
      }

      console.log(`[QueueAlert] 🔔 Alerting for Token ${token} (${patientName})`);

      // Rule 4 & 5: Play hospital chime
      const chimeResult = await playHospitalChime();
      const suspended = chimeResult.suspended || !isAudioContextReady();
      setIsAudioSuspended(suspended);

      const alertItem: CalledPatientAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        token,
        patientName,
        calledAt,
        timestamp: Date.now(),
        isAudioSuspended: suspended,
      };

      // Add to alerts stack (keep latest 3 max)
      setAlerts((prev) => [alertItem, ...prev.slice(0, 2)]);

      onPatientCalled?.(alertItem);

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== alertItem.id));
      }, 8000);
    },
    [isWaitingArea, userRole, onPatientCalled],
  );

  // 1. Same-machine / Multi-tab: BroadcastChannel listener
  useEffect(() => {
    const isEligible = isWaitingArea || userRole === "receptionist";
    if (!isEligible) return;

    const unsubscribe = subscribeToQueueBroadcastChannel((event: PatientCalledPayload) => {
      if (event.type === "PATIENT_CALLED" && event.token) {
        triggerAlert(event.token, event.patientName, event.calledAt, event.queueId);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isWaitingArea, userRole, triggerAlert]);

  // 2. Cross-device: Supabase Realtime postgres_changes UPDATE listener on queue_items
  useEffect(() => {
    const isEligible = isWaitingArea || userRole === "receptionist";
    if (!isEligible || !isSupabaseConfigured()) return;

    const channelName = `medihive_queue_alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "queue_items",
        },
        (payload: any) => {
          const oldRow = payload.old;
          const newRow = payload.new;
          if (!newRow) return;

          const oldStatus =
            oldRow?.status || previousStatusMap.current.get(newRow.id) || "Waiting";
          const newStatus = newRow.status;

          // Track in status map
          previousStatusMap.current.set(newRow.id, newStatus);

          // Rule 3.b: Check if status changed to "With Doctor"
          if (newStatus === "With Doctor" && oldStatus !== "With Doctor") {
            const token = newRow.queue_number || newRow.queueNumber;
            const patientName = newRow.patient_name || newRow.patientName || "Patient";
            const calledAt = newRow.called_at || newRow.calledAt || new Date().toISOString();

            triggerAlert(token, patientName, calledAt, newRow.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isWaitingArea, userRole, triggerAlert]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMutedState(nextMuted);
    setChimeMuted(nextMuted);
  }, [isMuted]);

  // Update volume
  const updateVolume = useCallback((newVol: number) => {
    setVolumeState(newVol);
    setChimeVolume(newVol);
  }, []);

  // Test sound helper
  const testChime = useCallback(async () => {
    const res = await playHospitalChime(true);
    setIsAudioSuspended(res.suspended);
    return res;
  }, []);

  return {
    alerts,
    dismissAlert,
    clearAllAlerts,
    isMuted,
    toggleMute,
    volume,
    updateVolume,
    testChime,
    isAudioSuspended,
  };
};
