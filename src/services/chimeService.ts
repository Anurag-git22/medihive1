/**
 * Web Audio API Hospital Bell Chime Service
 *
 * Synthesizes a two-tone "Ding-Dong" chime (E5 ~659Hz -> C5 ~523Hz) using native
 * Web Audio oscillators. Zero external MP3 or audio files required.
 * Handles Autoplay policy, volume controls, mute persistence, and audio context unlocking.
 */

const STORAGE_KEY_MUTED = "medihive_chime_muted";
const STORAGE_KEY_VOLUME = "medihive_chime_volume";

// Shared lazy AudioContext instance
let sharedAudioCtx: AudioContext | null = null;
let isAutoplayListenerAttached = false;
let isAudioUnlocked = false;

// Audio context getter (lazy initialization)
export const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  return sharedAudioCtx;
};

// Check if AudioContext is currently active/unlocked
export const isAudioContextReady = (): boolean => {
  if (!sharedAudioCtx) return false;
  return sharedAudioCtx.state === "running";
};

// Unlock AudioContext on the first user interaction
export const initAutoplayUnlock = (): void => {
  if (typeof window === "undefined" || isAutoplayListenerAttached) return;

  const unlock = async () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
        isAudioUnlocked = true;
      } catch (err) {
        console.warn("[ChimeService] AudioContext resume error:", err);
      }
    } else if (ctx && ctx.state === "running") {
      isAudioUnlocked = true;
    }

    // Remove listeners once unlocked
    window.removeEventListener("click", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    window.removeEventListener("touchstart", unlock, true);
    isAutoplayListenerAttached = false;
  };

  window.addEventListener("click", unlock, { capture: true, once: true });
  window.addEventListener("keydown", unlock, { capture: true, once: true });
  window.addEventListener("touchstart", unlock, { capture: true, once: true });
  isAutoplayListenerAttached = true;
};

// Immediately prime autoplay listener
if (typeof window !== "undefined") {
  initAutoplayUnlock();
}

// Volume & Mute Settings (with localStorage persistence)
export const getChimeMuted = (): boolean => {
  try {
    if (typeof window === "undefined") return false;
    const val = localStorage.getItem(STORAGE_KEY_MUTED);
    return val === "true";
  } catch {
    return false;
  }
};

export const setChimeMuted = (muted: boolean): void => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
    window.dispatchEvent(
      new CustomEvent("medihive_chime_settings_changed", {
        detail: { muted, volume: getChimeVolume() },
      }),
    );
  } catch (err) {
    console.warn("[ChimeService] Could not persist mute state:", err);
  }
};

export const getChimeVolume = (): number => {
  try {
    if (typeof window === "undefined") return 0.8;
    const val = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (val !== null) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return 0.8; // default 80% volume
};

export const setChimeVolume = (volume: number): void => {
  try {
    if (typeof window === "undefined") return;
    const clamped = Math.max(0, Math.min(1, volume));
    localStorage.setItem(STORAGE_KEY_VOLUME, String(clamped));
    window.dispatchEvent(
      new CustomEvent("medihive_chime_settings_changed", {
        detail: { muted: getChimeMuted(), volume: clamped },
      }),
    );
  } catch (err) {
    console.warn("[ChimeService] Could not persist volume:", err);
  }
};

export interface ChimeResult {
  played: boolean;
  muted: boolean;
  suspended: boolean;
  error?: string;
}

/**
 * Synthesize and play the two-tone hospital chime:
 * Tone 1: E5 (~659.25 Hz) decaying over 0.8s
 * Tone 2: C5 (~523.25 Hz) decaying over 1.2s (250ms later)
 */
export const playHospitalChime = async (forcePlay = false): Promise<ChimeResult> => {
  const isMuted = getChimeMuted();
  if (isMuted && !forcePlay) {
    return { played: false, muted: true, suspended: false };
  }

  const ctx = getAudioContext();
  if (!ctx) {
    return {
      played: false,
      muted: false,
      suspended: false,
      error: "Web Audio API not supported",
    };
  }

  // If suspended, attempt to resume if user interacted
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Browser autoplay policy blocked resume without user gesture
      return { played: false, muted: false, suspended: true };
    }
  }

  if (ctx.state !== "running") {
    return { played: false, muted: false, suspended: true };
  }

  try {
    const masterVol = getChimeVolume();
    const effectiveGain = Math.max(0.01, masterVol) * 0.3; // base 0.3 master ceiling

    const now = ctx.currentTime;

    // ==========================================
    // 1. TONE 1 ("Ding"): E5 (659.25 Hz)
    // ==========================================
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);

    // Initial attack & smooth exponential decay
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(effectiveGain, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.85);

    // ==========================================
    // 2. TONE 2 ("Dong"): C5 (523.25 Hz), 250ms later
    // ==========================================
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    const t2 = now + 0.25;

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(523.25, t2);

    gain2.gain.setValueAtTime(0.001, t2);
    gain2.gain.exponentialRampToValueAtTime(effectiveGain * 0.95, t2 + 0.025);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 1.2);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(t2);
    osc2.stop(t2 + 1.25);

    return { played: true, muted: false, suspended: false };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("[ChimeService] Play chime error:", err);
    return { played: false, muted: false, suspended: false, error: errMsg };
  }
};
