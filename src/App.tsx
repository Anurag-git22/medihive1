import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AppState,
  Patient,
  OPDRecord,
  Appointment,
  DoctorProfile,
  ClinicSettings,
  EmailConfig,
  UserAccount,
} from "./types";
import {
  loadAppState,
  saveAppState,
  setStoredAuthUser,
  getStoredAuthUser,
  subscribeQueueEvents,
  callPatientIntoCabin,
  completeConsultationAndAdvanceQueue,
  completeCurrentAndCallNextPatient,
  cancelPatientQueueItem,
  syncAccountsFromSupabase,
} from "./services/storage";
import {
  fetchFullAppStateFromSupabase,
  createPatientInSupabase,
  updatePatientInSupabase,
  saveOpdRecordInSupabase,
  saveAppointmentInSupabase,
  deleteAppointmentInSupabase,
  saveDailyNoteInSupabase,
  updateDoctorProfileInSupabase,
  updateClinicSettingsInSupabase,
  updateEmailConfigInSupabase,
  subscribeToClinicRealtime,
  deletePatientInSupabase,
  deleteOpdRecordInSupabase,
  deleteDailyNoteInSupabase,
  deleteQueueItemInSupabase,
  clearCompletedQueueInSupabase,
  clearAllClinicDataFromSupabase,
  insertVisitAndQueueInSupabase,
  updateQueueItemStatusInSupabase,
  cancelQueueTicketInSupabase,
  RealtimeSyncStatus,
  mapQueueItemFromDb,
  mapPatientFromDb,
  mapOpdRecordFromDb,
  mapVisitFromDb,
  mapAppointmentFromDb,
} from "./services/supabaseService";
import { exchangeOAuthCode } from "./services/googleSyncService";
import { isSupabaseConfigured } from "./lib/supabase";
import { QueueItem } from "./types";
import { ToastProvider, useToast } from "./components/common/Toast";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar, NavigationTab } from "./components/layout/Sidebar";
import { LoginScreen } from "./components/auth/LoginScreen";
import { Dashboard } from "./components/dashboard/Dashboard";
import { OpdRegistration } from "./components/opd/OpdRegistration";
import { PrescriptionModal } from "./components/prescription/PrescriptionModal";
import { PatientManagement } from "./components/patients/PatientManagement";
import { PatientDetailsModal } from "./components/patients/PatientDetailsModal";
import { EditPatientModal } from "./components/patients/EditPatientModal";
import { CalendarView } from "./components/calendar/CalendarView";
import { SettingsView } from "./components/settings/SettingsView";
import { HelpCenter } from "./components/help/HelpCenter";
import { ReceptionistLayout } from "./components/receptionist/ReceptionistLayout";
import { ReceptionistQueueView } from "./components/receptionist/ReceptionistQueueView";
import { DoctorConsultationModal } from "./components/consultation/DoctorConsultationModal";
import { format } from "date-fns";

const VALID_DOCTOR_TABS: NavigationTab[] = [
  "dashboard",
  "queue",
  "opd",
  "patients",
  "calendar",
  "settings",
  "help",
];

const getInitialTabFromUrl = (): {
  tab: NavigationTab;
  opdPatientId?: string;
} => {
  try {
    if (typeof window === "undefined") return { tab: "dashboard" };
    const rawHash = window.location.hash.replace(/^#\/?/, "");
    if (rawHash) {
      const [path, query] = rawHash.split("?");
      const cleanPath = path.toLowerCase();
      if (VALID_DOCTOR_TABS.includes(cleanPath as NavigationTab)) {
        let opdPatientId: string | undefined;
        if (query) {
          const qParams = new URLSearchParams(query);
          opdPatientId = qParams.get("patientId") || undefined;
        }
        return { tab: cleanPath as NavigationTab, opdPatientId };
      }
    }
    const saved = sessionStorage.getItem("medihive_active_tab");
    if (saved && VALID_DOCTOR_TABS.includes(saved as NavigationTab)) {
      return { tab: saved as NavigationTab };
    }
  } catch {
    // fallback
  }
  return { tab: "dashboard" };
};

const MainAppContent: React.FC = () => {
  const initialRoute = getInitialTabFromUrl();
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [currentTab, setCurrentTab] = useState<NavigationTab>(initialRoute.tab);
  const [preselectedOpdPatientId, setPreselectedOpdPatientId] = useState<
    string | undefined
  >(initialRoute.opdPatientId);

  // Keep route synced with URL hash and sessionStorage only when logged in as doctor
  useEffect(() => {
    if (!appState.currentUser || appState.currentUser.role === "receptionist") {
      return;
    }
    try {
      sessionStorage.setItem("medihive_active_tab", currentTab);
      let hash = `#${currentTab}`;
      if (currentTab === "opd" && preselectedOpdPatientId) {
        hash += `?patientId=${encodeURIComponent(preselectedOpdPatientId)}`;
      }
      if (window.location.hash !== hash) {
        window.history.replaceState(null, "", hash);
      }
    } catch {
      // non-blocking
    }
  }, [currentTab, preselectedOpdPatientId, appState.currentUser]);

  useEffect(() => {
    const handleHashChange = () => {
      if (
        !appState.currentUser ||
        appState.currentUser.role === "receptionist"
      ) {
        return;
      }
      const { tab, opdPatientId } = getInitialTabFromUrl();
      setCurrentTab(tab);
      if (opdPatientId) {
        setPreselectedOpdPatientId(opdPatientId);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [appState.currentUser]);

  // Modals
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<{
    patient: Patient;
    record: OPDRecord;
  } | null>(null);
  const [activeConsultationQueueItem, setActiveConsultationQueueItem] =
    useState<QueueItem | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeSyncStatus>(
    isSupabaseConfigured() ? "CONNECTING" : "DISCONNECTED",
  );

  const { showToast } = useToast();

  // Guard flag: when a state update originates from a received realtime/cross-tab
  // event, we update local UI state only and must NOT save+broadcast again (which
  // would cause an infinite A <-> B sync loop).
  const isApplyingRemoteUpdate = useRef(false);

  const applyRemoteState = (updater: (prev: AppState) => AppState) => {
    isApplyingRemoteUpdate.current = true;
    setAppState(updater);
  };

  // Keep state synced in localStorage as fallback/cache
  useEffect(() => {
    // Skip save+broadcast when this update came from a remote realtime/cross-tab
    // event. Remote updates are applied to the UI only; re-saving would re-broadcast
    // them to other tabs and cause an infinite sync loop.
    if (isApplyingRemoteUpdate.current) {
      isApplyingRemoteUpdate.current = false;
      return;
    }
    saveAppState(appState);
  }, [appState]);

  // Google OAuth callback redirect handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      showToast(`Google authorization canceled or denied: ${error}`, "info");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (
      code &&
      (state === "medihive_google_oauth" || state?.startsWith("medihive"))
    ) {
      // Clear URL params immediately so refreshed tab doesn't re-attempt exchange with stale code
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast("Connecting authorized Google account...", "info");

      exchangeOAuthCode(code)
        .then((res) => {
          if (res.success) {
            showToast(
              `Google account successfully connected! (${res.email || "Drive & Sheets ready"})`,
              "success",
            );
            setCurrentTab("settings");
          } else {
            showToast(
              `Google authorization failed: ${res.error || "Unknown error"}`,
              "error",
            );
          }
        })
        .catch((err: any) => {
          showToast(
            `Google OAuth error: ${err.message || "Failed to exchange authorization code"}`,
            "error",
          );
        });
    }
  }, []);

  // Global Keyboard Navigation Shortcuts (Alt + 1..7, '/', and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputActive =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      // Escape closes mobile sidebar if open
      if (e.key === "Escape" && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
        return;
      }

      // Alt + 1..7 tab switching
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case "1":
            e.preventDefault();
            setCurrentTab("dashboard");
            break;
          case "2":
            e.preventDefault();
            setCurrentTab("queue");
            break;
          case "3":
            e.preventDefault();
            setPreselectedOpdPatientId(undefined);
            setCurrentTab("opd");
            break;
          case "4":
            e.preventDefault();
            setCurrentTab("patients");
            break;
          case "5":
            e.preventDefault();
            setCurrentTab("calendar");
            break;
          case "6":
            e.preventDefault();
            setCurrentTab("settings");
            break;
          case "7":
            e.preventDefault();
            setCurrentTab("help");
            break;
          default:
            break;
        }
        return;
      }

      // '/' to focus patient search
      if (
        e.key === "/" &&
        !isInputActive &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        if (currentTab !== "patients") {
          setCurrentTab("patients");
        }
        setTimeout(() => {
          const searchInput = document.getElementById(
            "patient-search-input",
          ) as HTMLInputElement | null;
          searchInput?.focus();
          searchInput?.select();
        }, 50);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTab, mobileSidebarOpen]);

  // Initial load from Supabase & Real-time multi-device sync
  useEffect(() => {
    let isMounted = true;
    let unsubscribeRealtime: (() => void) | null = null;
    let syncDebounceTimer: any = null;
    let reconnectTimer: any = null;

    const triggerDebouncedReconciliation = () => {
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => {
        if (!isMounted) return;
        fetchFullAppStateFromSupabase().then((refreshed) => {
          if (refreshed && isMounted) {
            applyRemoteState((prev) => ({
              ...prev,
              ...refreshed,
              currentUser: prev.currentUser,
            }));
          }
        });
      }, 300);
    };

    const handleRealtimeChange = (
      table: string,
      eventType: string,
      payload: any,
    ) => {
      console.log(
        `[Supabase Realtime] Event on ${table} (${eventType}):`,
        payload,
      );

      applyRemoteState((prev) => {
        let updatedQueue = prev.queue ? [...prev.queue] : [];
        let updatedPatients = prev.patients ? [...prev.patients] : [];
        let updatedVisits = prev.visits ? [...prev.visits] : [];
        let updatedAppointments = prev.appointments
          ? [...prev.appointments]
          : [];
        let updatedDailyNotes = { ...(prev.dailyNotes || {}) };
        let updatedDoctor = prev.doctor;
        let updatedClinic = prev.clinic;

        if (table === "queue_items") {
          if (
            (eventType === "INSERT" || eventType === "UPDATE") &&
            payload.new
          ) {
            const item = mapQueueItemFromDb(payload.new);
            const exists = updatedQueue.some((q) => q.id === item.id);
            if (exists) {
              updatedQueue = updatedQueue.map((q) =>
                q.id === item.id ? item : q,
              );
            } else {
              updatedQueue.push(item);
            }
          } else if (eventType === "DELETE" && payload.old) {
            updatedQueue = updatedQueue.filter((q) => q.id !== payload.old.id);
          }

          // Strictly maintain FIFO queue order based on sequenceNumber (and arrival time)
          updatedQueue.sort((a, b) => {
            const seqA = Number(a.sequenceNumber) || 0;
            const seqB = Number(b.sequenceNumber) || 0;
            if (seqA !== seqB) return seqA - seqB;
            return (a.arrivalTime || "").localeCompare(b.arrivalTime || "");
          });
        } else if (table === "patients") {
          if (
            (eventType === "INSERT" || eventType === "UPDATE") &&
            payload.new
          ) {
            const incomingPatient = mapPatientFromDb(payload.new, []);
            const patientExists = updatedPatients.some(
              (p) => p.id === incomingPatient.id,
            );
            if (patientExists) {
              updatedPatients = updatedPatients.map((p) =>
                p.id === incomingPatient.id
                  ? { ...incomingPatient, records: p.records || [] }
                  : p,
              );
            } else {
              updatedPatients = [incomingPatient, ...updatedPatients];
            }
          } else if (eventType === "DELETE" && payload.old) {
            updatedPatients = updatedPatients.filter(
              (p) => p.id !== payload.old.id,
            );
          }
        } else if (table === "opd_records") {
          if (
            (eventType === "INSERT" || eventType === "UPDATE") &&
            payload.new
          ) {
            const newRecord = mapOpdRecordFromDb(payload.new);
            updatedPatients = updatedPatients.map((p) => {
              if (p.id === newRecord.patientId) {
                const existingRecords = p.records || [];
                const recordExists = existingRecords.some(
                  (r) => r.id === newRecord.id,
                );
                const nextRecords = recordExists
                  ? existingRecords.map((r) =>
                      r.id === newRecord.id ? newRecord : r,
                    )
                  : [newRecord, ...existingRecords];
                return {
                  ...p,
                  records: nextRecords,
                  totalVisits: nextRecords.length,
                  lastVisitDate: nextRecords[0]?.visitDate || p.lastVisitDate,
                };
              }
              return p;
            });
          } else if (eventType === "DELETE" && payload.old) {
            updatedPatients = updatedPatients.map((p) => {
              const nextRecords = (p.records || []).filter(
                (r) => r.id !== payload.old.id,
              );
              return {
                ...p,
                records: nextRecords,
                totalVisits: nextRecords.length,
              };
            });
          }
        } else if (table === "patient_visits") {
          if (
            (eventType === "INSERT" || eventType === "UPDATE") &&
            payload.new
          ) {
            const newVisit = mapVisitFromDb(payload.new);
            const visitExists = updatedVisits.some((v) => v.id === newVisit.id);
            updatedVisits = visitExists
              ? updatedVisits.map((v) => (v.id === newVisit.id ? newVisit : v))
              : [newVisit, ...updatedVisits];
          } else if (eventType === "DELETE" && payload.old) {
            updatedVisits = updatedVisits.filter(
              (v) => v.id !== payload.old.id,
            );
          }
        } else if (table === "appointments") {
          if (
            (eventType === "INSERT" || eventType === "UPDATE") &&
            payload.new
          ) {
            const newApt = mapAppointmentFromDb(payload.new);
            const aptExists = updatedAppointments.some(
              (a) => a.id === newApt.id,
            );
            updatedAppointments = aptExists
              ? updatedAppointments.map((a) =>
                  a.id === newApt.id ? newApt : a,
                )
              : [newApt, ...updatedAppointments];
          } else if (eventType === "DELETE" && payload.old) {
            updatedAppointments = updatedAppointments.filter(
              (a) => a.id !== payload.old.id,
            );
          }
        } else if (table === "daily_notes") {
          if (
            (eventType === "INSERT" || eventType === "UPDATE") &&
            payload.new
          ) {
            updatedDailyNotes[payload.new.date] = payload.new.note;
          } else if (eventType === "DELETE" && payload.old) {
            delete updatedDailyNotes[payload.old.date];
          }
        }

        return {
          ...prev,
          queue: updatedQueue,
          patients: updatedPatients,
          visits: updatedVisits,
          appointments: updatedAppointments,
          dailyNotes: updatedDailyNotes,
          doctor: updatedDoctor,
          clinic: updatedClinic,
        };
      });

      triggerDebouncedReconciliation();
    };

    const initSupabaseSync = () => {
      if (!isSupabaseConfigured()) {
        setRealtimeStatus("DISCONNECTED");
        return;
      }

      setRealtimeStatus("CONNECTING");

      console.log(
        "[MediHive] Supabase cloud connection active. Hydrating clinic data...",
      );

      // 1. Initial hydration from Supabase
      fetchFullAppStateFromSupabase()
        .then((dbState) => {
          if (dbState && isMounted) {
            applyRemoteState((prev) => {
              // 1. Identify any local patients created that are not yet in Supabase
              const supabasePatientIds = new Set(
                (dbState.patients || []).map((p) => p.id),
              );
              const localUnsyncedPatients = (prev.patients || []).filter(
                (p) => !supabasePatientIds.has(p.id),
              );

              // Upload unsynced local patients to Supabase in background
              if (localUnsyncedPatients.length > 0) {
                localUnsyncedPatients.forEach((patient) => {
                  createPatientInSupabase(patient).catch((err) => {
                    console.warn(
                      "Initial sync of local patient to Supabase:",
                      err,
                    );
                  });
                  (patient.records || []).forEach((r) => {
                    saveOpdRecordInSupabase(patient, r).catch(() => {});
                  });
                });
              }

              // 2. Identify any local queue items created that are not yet in Supabase
              const supabaseQueueIds = new Set(
                (dbState.queue || []).map((q) => q.id),
              );
              const localUnsyncedQueue = (prev.queue || []).filter(
                (q) => !supabaseQueueIds.has(q.id),
              );
              if (localUnsyncedQueue.length > 0) {
                localUnsyncedQueue.forEach((q) => {
                  const matchingVisit = (prev.visits || []).find(
                    (v) => v.id === q.visitId || v.queueId === q.id,
                  );
                  if (matchingVisit) {
                    insertVisitAndQueueInSupabase(matchingVisit, q).catch(
                      () => {},
                    );
                  }
                });
              }

              // Merge Supabase data with any local unsynced patients/queue
              const mergedPatients = [
                ...(dbState.patients || []),
                ...localUnsyncedPatients,
              ];
              const mergedQueue = [
                ...(dbState.queue || []),
                ...localUnsyncedQueue,
              ].sort((a, b) => {
                const seqA = Number(a.sequenceNumber) || 0;
                const seqB = Number(b.sequenceNumber) || 0;
                if (seqA !== seqB) return seqA - seqB;
                return (a.arrivalTime || "").localeCompare(b.arrivalTime || "");
              });
              const mergedVisits = [
                ...(dbState.visits || []),
                ...(prev.visits || []).filter(
                  (v) => !(dbState.visits || []).some((sv) => sv.id === v.id),
                ),
              ];

              return {
                ...prev,
                ...dbState,
                patients: mergedPatients,
                queue: mergedQueue,
                visits: mergedVisits,
                currentUser: prev.currentUser || getStoredAuthUser(),
              };
            });
          }
        })
        .catch((err) => {
          console.warn("Initial Supabase hydration notice:", err);
        });

      // Sync user accounts from Supabase into accounts cache
      syncAccountsFromSupabase().catch(() => {});

      // 2. Real-time PostgreSQL subscription across all clinic screens & logins
      if (unsubscribeRealtime) {
        unsubscribeRealtime();
      }
      unsubscribeRealtime = subscribeToClinicRealtime(
        handleRealtimeChange,
        (status) => {
          if (!isMounted) return;
          setRealtimeStatus(status);
          if (status === "CONNECTED") {
            // Immediately catch up on any mutations that happened while offline
            fetchFullAppStateFromSupabase().then((latest) => {
              if (latest && isMounted) {
                applyRemoteState((prev) => ({
                  ...prev,
                  ...latest,
                  currentUser: prev.currentUser,
                }));
              }
            });
          } else if (status === "DISCONNECTED" || status === "ERROR") {
            // Reconnect after a disconnect/error so realtime sync recovers
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
              if (isMounted) initSupabaseSync();
            }, 3000);
          }
        },
      );
    };

    initSupabaseSync();

    const handleConfigChange = () => {
      initSupabaseSync();
    };
    window.addEventListener(
      "medihive_supabase_config_changed",
      handleConfigChange,
    );

    return () => {
      isMounted = false;
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (unsubscribeRealtime) unsubscribeRealtime();
      window.removeEventListener(
        "medihive_supabase_config_changed",
        handleConfigChange,
      );
    };
  }, []);

  // Real-time synchronization across browser tabs (via BroadcastChannel & Storage events)
  useEffect(() => {
    const unsubscribe = subscribeQueueEvents((event) => {
      const fresh = loadAppState();
      applyRemoteState((prev) => ({
        ...fresh,
        currentUser: prev.currentUser || getStoredAuthUser(),
      }));

      // Single "patient called" alert: event-driven via BroadcastChannel only.
      if (event?.type === "PATIENT_CALLED" && event.payload?.activePatient) {
        const called = event.payload.activePatient;
        if (appState.currentUser?.role === "receptionist") {
          showToast(
            `📢 Doctor called Token ${called.queueNumber} (${called.patientName}) into the Cabin!`,
            "info",
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [appState.currentUser]);

  // Check follow-ups due today on load
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todaysFollowUps = useMemo(() => {
    const list: { patient: Patient; record: OPDRecord }[] = [];
    appState.patients.forEach((p) => {
      p.records.forEach((r) => {
        if (r.nextVisitDate === todayStr) {
          list.push({ patient: p, record: r });
        }
      });
    });
    return list;
  }, [appState.patients, todayStr]);

  // Waiting queue count for today
  const activeWaitingQueueCount = useMemo(() => {
    return (appState.queue || []).filter(
      (q) =>
        q.visitDate === todayStr &&
        (q.status === "Waiting" || q.status === "Next"),
    ).length;
  }, [appState.queue, todayStr]);

  // Next patient in line and current patient in cabin for Doctor Navbar
  const nextWaitingPatient = useMemo(() => {
    return (appState.queue || [])
      .filter(
        (q) =>
          q.visitDate === todayStr &&
          (q.status === "Waiting" || q.status === "Next"),
      )
      .sort((a, b) => {
        if (a.status === "Next" && b.status !== "Next") return -1;
        if (b.status === "Next" && a.status !== "Next") return 1;
        const seqA = Number(a.sequenceNumber) || 0;
        const seqB = Number(b.sequenceNumber) || 0;
        if (seqA !== seqB) return seqA - seqB;
        return (a.arrivalTime || "").localeCompare(b.arrivalTime || "");
      })[0];
  }, [appState.queue, todayStr]);

  const currentPatientInCabin = useMemo(() => {
    return (appState.queue || []).find(
      (q) => q.visitDate === todayStr && q.status === "With Doctor",
    );
  }, [appState.queue, todayStr]);

  // Handle Login / Logout
  const handleLogin = (user: UserAccount) => {
    setStoredAuthUser(user);
    if (user.role === "receptionist") {
      const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
      if (!hash.startsWith("rec-")) {
        window.history.replaceState(null, "", "#rec-dashboard");
      }
    } else {
      const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
      if (
        hash.startsWith("rec-") ||
        !VALID_DOCTOR_TABS.includes(hash as NavigationTab)
      ) {
        setCurrentTab("dashboard");
        window.history.replaceState(null, "", "#dashboard");
      }
    }
    setAppState((prev) => ({ ...prev, currentUser: user }));
  };

  const handleLogout = () => {
    setStoredAuthUser(null);
    setAppState((prev) => ({ ...prev, currentUser: null }));
    try {
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      // non-blocking
    }
    showToast("Logged out successfully", "info");
  };

  // State update actions (Optimistic UI + Supabase Persistence)
  const handleSaveOpdRecord = (patient: Patient, opdRecord: OPDRecord) => {
    let completedQueueItemId: string | null = null;
    const completedTime = new Date().toISOString();

    setAppState((prev) => {
      const existingIdx = prev.patients.findIndex((p) => p.id === patient.id);
      let updatedPatients = [...prev.patients];

      if (existingIdx >= 0) {
        updatedPatients[existingIdx] = patient;
      } else {
        updatedPatients = [patient, ...updatedPatients];
      }

      // Check if this patient has an active queue item today
      const activeQueueItem = (prev.queue || []).find(
        (q) =>
          (q.patientId === patient.id ||
            q.patientName.trim().toLowerCase() ===
              patient.fullName.trim().toLowerCase()) &&
          q.visitDate === opdRecord.visitDate &&
          (q.status === "Waiting" ||
            q.status === "Next" ||
            q.status === "With Doctor"),
      );

      let updatedQueue = prev.queue || [];
      let updatedVisits = prev.visits || [];

      if (activeQueueItem) {
        completedQueueItemId = activeQueueItem.id;
        updatedQueue = updatedQueue.map((q) =>
          q.id === activeQueueItem.id
            ? {
                ...q,
                status: "Completed" as const,
                completedAt: completedTime,
              }
            : q,
        );
        updatedVisits = updatedVisits.map((v) =>
          v.queueId === activeQueueItem.id || v.patientId === patient.id
            ? { ...v, status: "Completed" as const }
            : v,
        );
      }

      return {
        ...prev,
        patients: updatedPatients,
        queue: updatedQueue,
        visits: updatedVisits,
      };
    });

    if (activeConsultationQueueItem?.patientId === patient.id) {
      setActiveConsultationQueueItem(null);
    }

    // Write to Supabase
    saveOpdRecordInSupabase(patient, opdRecord).catch((err) => {
      console.warn("Supabase saveOpdRecord error:", err);
    });

    if (completedQueueItemId) {
      updateQueueItemStatusInSupabase(completedQueueItemId, "Completed", {
        completedAt: completedTime,
      }).catch((err) => {
        console.warn("Supabase updateQueueItemStatus error:", err);
      });
    }
  };

  const handleSavePatient = (updatedPatient: Patient) => {
    setAppState((prev) => {
      const updatedPatients = prev.patients.map((p) =>
        p.id === updatedPatient.id ? updatedPatient : p,
      );
      return {
        ...prev,
        patients: updatedPatients,
      };
    });
    if (viewingPatient && viewingPatient.id === updatedPatient.id) {
      setViewingPatient(updatedPatient);
    }

    // Write to Supabase
    updatePatientInSupabase(updatedPatient).catch((err) => {
      console.warn("Supabase updatePatient error:", err);
    });
  };

  const handleSaveDailyNote = (date: string, note: string) => {
    setAppState((prev) => ({
      ...prev,
      dailyNotes: {
        ...prev.dailyNotes,
        [date]: note,
      },
    }));

    // Write to Supabase
    saveDailyNoteInSupabase(date, note).catch((err) => {
      console.warn("Supabase saveDailyNote error:", err);
    });
  };

  const handleSaveAppointment = (appointment: Appointment) => {
    setAppState((prev) => ({
      ...prev,
      appointments: [appointment, ...prev.appointments],
    }));

    // Write to Supabase
    saveAppointmentInSupabase(appointment).catch((err) => {
      console.warn("Supabase saveAppointment error:", err);
    });
  };

  const handleDeleteAppointment = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      appointments: prev.appointments.filter((a) => a.id !== id),
    }));
    showToast("Appointment removed", "info");

    // Delete from Supabase
    deleteAppointmentInSupabase(id).catch((err) => {
      console.warn("Supabase deleteAppointment error:", err);
    });
  };

  const handleDeletePatient = (patientId: string) => {
    setAppState((prev) => ({
      ...prev,
      patients: prev.patients.filter((p) => p.id !== patientId),
      visits: prev.visits.filter((v) => v.patientId !== patientId),
      queue: prev.queue.filter((q) => q.patientId !== patientId),
      appointments: prev.appointments.filter((a) => a.patientId !== patientId),
    }));
    if (viewingPatient?.id === patientId) {
      setViewingPatient(null);
    }
    if (editingPatient?.id === patientId) {
      setEditingPatient(null);
    }
    showToast("Patient and associated records deleted.", "info");
    deletePatientInSupabase(patientId).catch((err) => {
      console.warn("Supabase deletePatient error:", err);
    });
  };

  const handleDeleteOpdRecord = (patientId: string, recordId: string) => {
    setAppState((prev) => {
      const updatedPatients = prev.patients.map((p) => {
        if (p.id === patientId) {
          const updatedRecords = p.records.filter((r) => r.id !== recordId);
          return {
            ...p,
            records: updatedRecords,
            totalVisits: updatedRecords.length,
            lastVisitDate: updatedRecords[0]?.visitDate || p.registrationDate,
          };
        }
        return p;
      });

      return {
        ...prev,
        patients: updatedPatients,
      };
    });

    if (viewingPatient && viewingPatient.id === patientId) {
      setViewingPatient((prev) => {
        if (!prev) return null;
        const updatedRecords = prev.records.filter((r) => r.id !== recordId);
        return {
          ...prev,
          records: updatedRecords,
          totalVisits: updatedRecords.length,
          lastVisitDate: updatedRecords[0]?.visitDate || prev.registrationDate,
        };
      });
    }

    showToast("Consultation record deleted.", "info");
    deleteOpdRecordInSupabase(recordId, patientId).catch((err) => {
      console.warn("Supabase deleteOpdRecord error:", err);
    });
  };

  const handleDeleteDailyNote = (date: string) => {
    setAppState((prev) => {
      const nextNotes = { ...prev.dailyNotes };
      delete nextNotes[date];
      return {
        ...prev,
        dailyNotes: nextNotes,
      };
    });
    deleteDailyNoteInSupabase(date).catch((err) => {
      console.warn("Supabase deleteDailyNote error:", err);
    });
  };

  const handleDeleteQueueItem = (queueId: string) => {
    setAppState((prev) => ({
      ...prev,
      queue: prev.queue.filter((q) => q.id !== queueId),
    }));
    deleteQueueItemInSupabase(queueId).catch((err) => {
      console.warn("Supabase deleteQueueItem error:", err);
    });
  };

  const handleClearCompletedQueue = () => {
    const today = new Date().toISOString().slice(0, 10);
    setAppState((prev) => ({
      ...prev,
      queue: prev.queue.filter(
        (q) =>
          !(
            q.visitDate === today &&
            (q.status === "Completed" || q.status === "Cancelled")
          ),
      ),
    }));
    clearCompletedQueueInSupabase().catch((err) => {
      console.warn("Supabase clearCompletedQueue error:", err);
    });
  };

  const handleClearAllClinicData = () => {
    setAppState((prev) => ({
      ...prev,
      patients: [],
      visits: [],
      queue: [],
      appointments: [],
      dailyNotes: {},
    }));
    setViewingPatient(null);
    setEditingPatient(null);
    setPrescriptionData(null);
    setActiveConsultationQueueItem(null);
    clearAllClinicDataFromSupabase().catch((err) => {
      console.warn("Supabase clearAllClinicData error:", err);
    });
  };

  const handleUpdateDoctor = (doctor: DoctorProfile) => {
    setAppState((prev) => ({ ...prev, doctor }));
    updateDoctorProfileInSupabase(doctor).catch((err) => {
      console.warn("Supabase updateDoctorProfile error:", err);
    });
  };

  const handleUpdateClinic = (clinic: ClinicSettings) => {
    setAppState((prev) => ({ ...prev, clinic }));
    updateClinicSettingsInSupabase(clinic).catch((err) => {
      console.warn("Supabase updateClinicSettings error:", err);
    });
  };

  const handleUpdateEmailConfig = (emailConfig: EmailConfig) => {
    setAppState((prev) => ({ ...prev, emailConfig }));
    updateEmailConfigInSupabase(emailConfig).catch((err) => {
      console.warn("Supabase updateEmailConfig error:", err);
    });
  };

  const handleRestoreBackup = (restoredState: AppState) => {
    setAppState(restoredState);
    saveAppState(restoredState);
    showToast("Restoring clinic backup...", "info");
    if (restoredState.doctor) {
      updateDoctorProfileInSupabase(restoredState.doctor).catch((err) =>
        console.warn("Restore doctor profile notice:", err),
      );
    }
    if (restoredState.clinic) {
      updateClinicSettingsInSupabase(restoredState.clinic).catch((err) =>
        console.warn("Restore clinic settings notice:", err),
      );
    }
    if (restoredState.emailConfig) {
      updateEmailConfigInSupabase(restoredState.emailConfig).catch((err) =>
        console.warn("Restore email config notice:", err),
      );
    }
    if (Array.isArray(restoredState.patients)) {
      restoredState.patients.forEach((p) => {
        createPatientInSupabase(p).catch(() => {});
        if (Array.isArray(p.records)) {
          p.records.forEach((r) => {
            saveOpdRecordInSupabase(p, r).catch(() => {});
          });
        }
      });
    }
    showToast("Clinic data restored and synchronized successfully!", "success");
  };

  // Queue actions for doctor
  const handleDoctorCallPatient = (queueId?: string) => {
    const { updatedState, activePatient } = callPatientIntoCabin(
      appState,
      queueId,
    );
    setAppState(updatedState);
    if (activePatient) {
      showToast(
        `Calling ${activePatient.patientName} (${activePatient.queueNumber}) into Cabin`,
        "info",
      );
      updateQueueItemStatusInSupabase(activePatient.id, "With Doctor", {
        calledAt: new Date().toISOString(),
      }).catch((err) => {
        console.warn("Supabase updateQueueItemStatus error:", err);
      });
    }
  };

  const handleDoctorCompleteAndCallNext = (
    currentQueueId: string,
    nextQueueId: string,
  ) => {
    const { updatedState, calledPatient } = completeCurrentAndCallNextPatient(
      appState,
      currentQueueId,
      nextQueueId,
    );
    setAppState(updatedState);
    if (calledPatient) {
      showToast(
        `Completed current consultation & calling ${calledPatient.patientName} (${calledPatient.queueNumber})`,
        "info",
      );
    }
  };

  const handleCompleteConsultation = (
    opdRecord: OPDRecord,
    autoCallNext: boolean,
  ) => {
    if (!activeConsultationQueueItem) return;
    const { updatedState, nextPatient } = completeConsultationAndAdvanceQueue(
      appState,
      activeConsultationQueueItem.id,
      opdRecord,
    );

    // Explicitly persist completed consultation & OPD record to Supabase
    const updatedPatient = updatedState.patients.find(
      (p) => p.id === opdRecord.patientId,
    );
    if (updatedPatient) {
      saveOpdRecordInSupabase(updatedPatient, opdRecord).catch((err) => {
        console.warn("Supabase saveOpdRecord error:", err);
      });
    }
    if (
      viewingPatient &&
      viewingPatient.id === opdRecord.patientId &&
      updatedPatient
    ) {
      setViewingPatient(updatedPatient);
    }
    updateQueueItemStatusInSupabase(
      activeConsultationQueueItem.id,
      "Completed",
      {
        completedAt: new Date().toISOString(),
      },
    ).catch((err) => {
      console.warn("Supabase updateQueueItemStatus error:", err);
    });

    if (autoCallNext && nextPatient) {
      const advanced = callPatientIntoCabin(updatedState, nextPatient.id);
      setAppState(advanced.updatedState);
      setActiveConsultationQueueItem(advanced.activePatient);
      if (advanced.activePatient) {
        updateQueueItemStatusInSupabase(
          advanced.activePatient.id,
          "With Doctor",
          {
            calledAt: new Date().toISOString(),
          },
        ).catch(() => {});
      }
    } else {
      setAppState(updatedState);
      setActiveConsultationQueueItem(null);
    }
  };

  const handleCancelQueueItem = (queueId: string) => {
    const updated = cancelPatientQueueItem(appState, queueId);
    setAppState(updated);
    showToast("Queue ticket cancelled", "info");
    cancelQueueTicketInSupabase(queueId).catch((err) => {
      console.warn("Supabase cancelQueueTicket error:", err);
    });
  };

  // If user is not logged in, show Login Screen
  if (!appState.currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // If user is receptionist, show dedicated Receptionist Portal
  if (appState.currentUser.role === "receptionist") {
    return (
      <ReceptionistLayout
        appState={appState}
        realtimeStatus={realtimeStatus}
        onUpdateAppState={setAppState}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="flex h-dvh min-h-dvh bg-[#f4f7f9] overflow-hidden">
      {/* Skip to main content link for keyboard / screen reader users */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Left Sidebar (Desktop fixed + Mobile/Tablet slide-in drawer) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setPreselectedOpdPatientId(undefined);
          setCurrentTab(tab);
          setMobileSidebarOpen(false);
        }}
        onLogout={handleLogout}
        pendingFollowUpsCount={todaysFollowUps.length}
        activeQueueCount={activeWaitingQueueCount}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-dvh min-h-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          doctor={appState.doctor}
          clinic={appState.clinic}
          realtimeStatus={realtimeStatus}
          activeFollowUpsCount={todaysFollowUps.length}
          nextPatientInQueue={nextWaitingPatient}
          currentPatientInCabin={currentPatientInCabin}
          onCallNextPatient={handleDoctorCallPatient}
          onOpenConsultationModal={(item) =>
            setActiveConsultationQueueItem(item)
          }
          onNavigateToCalendar={() => setCurrentTab("calendar")}
          onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* Scrollable View Container */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto focus:outline-none"
        >
          {currentTab === "dashboard" && (
            <Dashboard
              patients={appState.patients}
              queue={appState.queue}
              onAddPatient={() => {
                setPreselectedOpdPatientId(undefined);
                setCurrentTab("opd");
              }}
              onViewPatient={(patient) => setViewingPatient(patient)}
              onEditPatient={(patient) => setEditingPatient(patient)}
              onNavigateToOpd={(patientId) => {
                setPreselectedOpdPatientId(patientId);
                setCurrentTab("opd");
              }}
              onNavigateToCalendar={() => setCurrentTab("calendar")}
              onNavigateToPatients={() => setCurrentTab("patients")}
              onCallPatientIntoCabin={handleDoctorCallPatient}
              onCompleteAndCallNext={handleDoctorCompleteAndCallNext}
              onOpenConsultation={(item) =>
                setActiveConsultationQueueItem(item)
              }
              onNavigateToQueue={() => setCurrentTab("queue")}
            />
          )}

          {currentTab === "queue" && (
            <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 page-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Doctor's Live Clinic Queue
                  </h1>
                  <p className="text-xs text-slate-500">
                    Live FIFO patient sequence and cabin admission
                  </p>
                </div>
              </div>
              <ReceptionistQueueView
                queue={appState.queue}
                onCancelQueueItem={handleCancelQueueItem}
                onDeleteQueueItem={handleDeleteQueueItem}
                onClearCompletedQueue={handleClearCompletedQueue}
              />
            </div>
          )}

          {currentTab === "opd" && (
            <OpdRegistration
              patients={appState.patients}
              preselectedPatientId={preselectedOpdPatientId}
              doctor={appState.doctor}
              clinic={appState.clinic}
              onBack={() => setCurrentTab("dashboard")}
              onSaveOpdRecord={handleSaveOpdRecord}
              onGeneratePrescription={(patient, record) => {
                setPrescriptionData({ patient, record });
              }}
            />
          )}

          {currentTab === "patients" && (
            <PatientManagement
              patients={appState.patients}
              onAddPatient={() => {
                setPreselectedOpdPatientId(undefined);
                setCurrentTab("opd");
              }}
              onViewPatient={(patient) => setViewingPatient(patient)}
              onEditPatient={(patient) => setEditingPatient(patient)}
              onDeletePatient={handleDeletePatient}
              onPrintLatestPrescription={(patient, record) => {
                setPrescriptionData({ patient, record });
              }}
              onBack={() => setCurrentTab("dashboard")}
            />
          )}

          {currentTab === "calendar" && (
            <CalendarView
              patients={appState.patients}
              appointments={appState.appointments}
              dailyNotes={appState.dailyNotes}
              onSaveDailyNote={handleSaveDailyNote}
              onDeleteDailyNote={handleDeleteDailyNote}
              onSaveAppointment={handleSaveAppointment}
              onDeleteAppointment={handleDeleteAppointment}
              onBack={() => setCurrentTab("dashboard")}
            />
          )}

          {currentTab === "settings" && (
            <SettingsView
              doctor={appState.doctor}
              clinic={appState.clinic}
              emailConfig={appState.emailConfig}
              fullState={appState}
              onUpdateDoctor={handleUpdateDoctor}
              onUpdateClinic={handleUpdateClinic}
              onUpdateEmailConfig={handleUpdateEmailConfig}
              onRestoreBackup={handleRestoreBackup}
              onClearAllClinicData={handleClearAllClinicData}
              onBack={() => setCurrentTab("dashboard")}
            />
          )}

          {currentTab === "help" && (
            <HelpCenter onBack={() => setCurrentTab("dashboard")} />
          )}
        </main>
      </div>

      {/* MODAL: View Patient Multi-Visit History (Page 8) */}
      <PatientDetailsModal
        patient={viewingPatient}
        isOpen={Boolean(viewingPatient)}
        onClose={() => setViewingPatient(null)}
        onDeleteOpdRecord={handleDeleteOpdRecord}
        onPreviewPrescription={(record) => {
          if (viewingPatient) {
            setPrescriptionData({ patient: viewingPatient, record });
          }
        }}
        onPrintPrescription={(record) => {
          if (viewingPatient) {
            setPrescriptionData({ patient: viewingPatient, record });
          }
        }}
        onAddNewOpd={(patientId) => {
          setViewingPatient(null);
          setPreselectedOpdPatientId(patientId);
          setCurrentTab("opd");
        }}
      />

      {/* MODAL: Edit Patient Demographics */}
      <EditPatientModal
        patient={editingPatient}
        isOpen={Boolean(editingPatient)}
        onClose={() => setEditingPatient(null)}
        onSavePatient={handleSavePatient}
      />

      {/* MODAL: Prescription Preview, Letterhead, Print & PDF (Page 6) */}
      {prescriptionData && (
        <PrescriptionModal
          patient={prescriptionData.patient}
          record={prescriptionData.record}
          doctor={appState.doctor}
          clinic={appState.clinic}
          isOpen={Boolean(prescriptionData)}
          onClose={() => setPrescriptionData(null)}
          onEdit={() => {
            setPrescriptionData(null);
            setPreselectedOpdPatientId(prescriptionData.patient.id);
            setCurrentTab("opd");
          }}
          onConfirmSave={() => {
            setPrescriptionData(null);
            showToast("Prescription confirmed and archived!", "success");
          }}
        />
      )}

      {/* MODAL: Doctor Active Consultation Modal */}
      {activeConsultationQueueItem && (
        <DoctorConsultationModal
          isOpen={Boolean(activeConsultationQueueItem)}
          onClose={() => setActiveConsultationQueueItem(null)}
          queueItem={activeConsultationQueueItem}
          patient={
            appState.patients.find(
              (p) => p.id === activeConsultationQueueItem.patientId,
            ) || {
              id: activeConsultationQueueItem.patientId,
              fullName: activeConsultationQueueItem.patientName,
              age: activeConsultationQueueItem.patientAge,
              gender: activeConsultationQueueItem.patientGender,
              mobile: activeConsultationQueueItem.patientMobile,
              registrationDate: todayStr,
              lastVisitDate: todayStr,
              records: [],
              totalVisits: 0,
              createdAt: "",
            }
          }
          doctor={appState.doctor}
          clinic={appState.clinic}
          existingPatients={appState.patients}
          onCompleteConsultation={handleCompleteConsultation}
          onViewHistory={(patient) => setViewingPatient(patient)}
          onPreviewPrescription={(patient, record) => {
            setPrescriptionData({ patient, record });
          }}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <ToastProvider>
      <MainAppContent />
    </ToastProvider>
  );
}

export default App;
