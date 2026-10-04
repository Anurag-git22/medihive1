import React, { useEffect, useState } from "react";
import { Bell, X, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { CalledPatientAlert } from "../../hooks/useCalledPatientAlert";
import { getAudioContext } from "../../services/chimeService";

interface CalledPatientBannerProps {
  alerts: CalledPatientAlert[];
  onDismiss: (alertId: string) => void;
  isMuted?: boolean;
}

export const CalledPatientBanner: React.FC<CalledPatientBannerProps> = ({
  alerts,
  onDismiss,
  isMuted = false,
}) => {
  const [audioSuspended, setAudioSuspended] = useState(false);

  // Check if AudioContext needs user gesture
  useEffect(() => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      setAudioSuspended(true);
    }
  }, [alerts]);

  const handleResumeAudio = async () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
        setAudioSuspended(false);
      } catch (err) {
        console.warn("Could not resume audio context:", err);
      }
    }
  };

  if (alerts.length === 0) return null;

  return (
    <aside
      aria-label="Patient Call Notifications"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] pointer-events-none"
    >
      {/* Audio Suspended Hint */}
      {audioSuspended && (
        <div
          onClick={handleResumeAudio}
          role="button"
          tabIndex={0}
          className="pointer-events-auto bg-amber-500 hover:bg-amber-600 text-white text-xs px-3.5 py-2 rounded-xl shadow-lg flex items-center justify-between gap-2 cursor-pointer transition animate-bounce"
        >
          <div className="flex items-center gap-2">
            <VolumeX className="w-4 h-4 shrink-0" />
            <span className="font-semibold">
              Click anywhere on screen to enable bell chime audio!
            </span>
          </div>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase">
            Enable
          </span>
        </div>
      )}

      {/* Stacked Alert Cards */}
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-[#1e536e] text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-300/40 relative overflow-hidden animate-in slide-in-from-top-3 fade-in duration-300"
        >
          {/* Subtle pulse ring */}
          <span className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></span>

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              {/* Token badge */}
              <div className="w-12 h-12 rounded-xl bg-white text-emerald-800 flex flex-col items-center justify-center font-extrabold shadow-md shrink-0">
                <span className="text-[9px] font-bold uppercase text-emerald-600 tracking-wider">
                  Token
                </span>
                <span className="text-base font-mono leading-none font-black">
                  {alert.token}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1">
                    <Bell className="w-3 h-3 text-emerald-200" />
                    Doctor Calling Patient
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-white truncate max-w-[210px] sm:max-w-[260px] drop-shadow-xs">
                  {alert.patientName}
                </h4>
                <p className="text-[11px] text-teal-100 font-medium">
                  Token <strong className="font-mono text-white font-bold">{alert.token}</strong> is being called into the Cabin.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {isMuted && (
                <span
                  title="Audio is currently muted in settings"
                  className="p-1 rounded-md bg-white/15 text-amber-200"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </span>
              )}
              <button
                onClick={() => onDismiss(alert.id)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
                title="Dismiss"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 8-second animated countdown line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 overflow-hidden">
            <div
              className="h-full bg-emerald-300/80 rounded-r transition-all duration-[8000ms] ease-linear"
              style={{
                width: "100%",
                animation: "medihive-progress-shrink 8s linear forwards",
              }}
            />
          </div>
        </div>
      ))}
    </aside>
  );
};
