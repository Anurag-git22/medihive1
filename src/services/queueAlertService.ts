/**
 * Real-time Patient Called Alert & Deduplication Service
 *
 * Provides BroadcastChannel management and event deduplication between
 * Supabase Realtime (cross-device) and BroadcastChannel (multi-tab).
 */

export const QUEUE_BROADCAST_CHANNEL = "medihive_queue_channel";

export interface PatientCalledPayload {
  type: "PATIENT_CALLED";
  token: string; // e.g. "Q-003"
  patientName: string;
  calledAt: string; // ISO date-time string
  queueId?: string;
  timestamp?: number;
}

// In-memory deduplication cache: `${token}_${calledAt}` -> timestamp
const deduplicationCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000; // 60 seconds cache window

/**
 * Clean up old keys from the deduplication map
 */
const pruneDeduplicationCache = () => {
  const now = Date.now();
  for (const [key, timestamp] of deduplicationCache.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      deduplicationCache.delete(key);
    }
  }
};

/**
 * Check whether a "Patient Called" alert has already been fired recently.
 * Returns true if this is a fresh event (should alert), false if duplicate.
 */
export const shouldTriggerPatientAlert = (
  token: string,
  calledAt?: string,
  queueId?: string,
): boolean => {
  if (!token) return false;
  pruneDeduplicationCache();

  // Create primary and secondary composite keys
  const dateKey = calledAt ? calledAt.slice(0, 19) : "recent"; // second precision
  const primaryKey = `${token}_${dateKey}`.toLowerCase();
  const secondaryKey = queueId ? `${queueId}_${dateKey}`.toLowerCase() : null;

  if (deduplicationCache.has(primaryKey)) {
    return false;
  }
  if (secondaryKey && deduplicationCache.has(secondaryKey)) {
    return false;
  }

  const now = Date.now();
  deduplicationCache.set(primaryKey, now);
  if (secondaryKey) {
    deduplicationCache.set(secondaryKey, now);
  }

  return true;
};

// Singleton BroadcastChannel instance
let queueBroadcastChannel: BroadcastChannel | null = null;

export const getQueueBroadcastChannel = (): BroadcastChannel | null => {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }
  if (!queueBroadcastChannel) {
    try {
      queueBroadcastChannel = new BroadcastChannel(QUEUE_BROADCAST_CHANNEL);
    } catch (err) {
      console.warn("[QueueAlert] BroadcastChannel initialization failed:", err);
    }
  }
  return queueBroadcastChannel;
};

/**
 * Broadcast "PATIENT_CALLED" event to other tabs on the same computer
 */
export const broadcastPatientCalled = (payload: {
  token: string;
  patientName: string;
  calledAt: string;
  queueId?: string;
}): void => {
  try {
    const channel = getQueueBroadcastChannel();
    const eventPayload: PatientCalledPayload = {
      type: "PATIENT_CALLED",
      token: payload.token,
      patientName: payload.patientName,
      calledAt: payload.calledAt,
      queueId: payload.queueId,
      timestamp: Date.now(),
    };
    if (channel) {
      channel.postMessage(eventPayload);
    }
  } catch (err) {
    console.warn("[QueueAlert] Broadcast error:", err);
  }
};

/**
 * Subscribe to the local BroadcastChannel for multi-tab notifications
 */
export const subscribeToQueueBroadcastChannel = (
  onEvent: (event: PatientCalledPayload) => void,
): (() => void) => {
  const channel = getQueueBroadcastChannel();
  if (!channel) return () => {};

  const handler = (msg: MessageEvent) => {
    if (msg.data && msg.data.type === "PATIENT_CALLED") {
      onEvent(msg.data as PatientCalledPayload);
    }
  };

  channel.addEventListener("message", handler);
  return () => {
    channel.removeEventListener("message", handler);
  };
};
