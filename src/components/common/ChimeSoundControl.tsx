import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Volume1, Sliders, Play, Check } from "lucide-react";
import {
  getChimeMuted,
  setChimeMuted,
  getChimeVolume,
  setChimeVolume,
  playHospitalChime,
} from "../../services/chimeService";

interface ChimeSoundControlProps {
  className?: string;
}

export const ChimeSoundControl: React.FC<ChimeSoundControlProps> = ({
  className = "",
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => getChimeMuted());
  const [volume, setVolume] = useState<number>(() => getChimeVolume());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state if changed externally
  useEffect(() => {
    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ muted: boolean; volume: number }>;
      if (customEvent.detail) {
        setIsMuted(customEvent.detail.muted);
        setVolume(customEvent.detail.volume);
      }
    };
    window.addEventListener("medihive_chime_settings_changed", handleSettingsChange);
    return () => {
      window.removeEventListener("medihive_chime_settings_changed", handleSettingsChange);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMuted;
    setIsMuted(next);
    setChimeMuted(next);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setChimeVolume(newVol);
    if (isMuted && newVol > 0) {
      setIsMuted(false);
      setChimeMuted(false);
    }
  };

  const handleTestChime = async () => {
    setIsPlayingTest(true);
    await playHospitalChime(true);
    setTimeout(() => setIsPlayingTest(false), 1200);
  };

  const VolumeIcon = isMuted ? VolumeX : volume > 0.5 ? Volume2 : Volume1;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Sound Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={
          isMuted
            ? "Chime Sound: Muted (Click to open audio settings)"
            : `Chime Sound: On (${Math.round(volume * 100)}%) - Click to adjust`
        }
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border shadow-2xs ${
          isMuted
            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
            : "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
        }`}
      >
        <VolumeIcon
          className={`w-3.5 h-3.5 ${
            isMuted ? "text-rose-600" : "text-teal-600"
          }`}
        />
        <span className="hidden xs:inline">
          {isMuted ? "Muted" : `${Math.round(volume * 100)}%`}
        </span>
      </button>

      {/* Popover Settings Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-teal-600" />
              <span>Chime Bell Audio</span>
            </span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              Web Audio
            </span>
          </div>

          {/* Mute Toggle Row */}
          <div className="flex items-center justify-between py-1 mb-3">
            <span className="text-xs font-medium text-slate-700">Mute Chime</span>
            <button
              type="button"
              onClick={handleToggleMute}
              className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                isMuted ? "bg-rose-500 justify-end" : "bg-slate-200 justify-start"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Volume</span>
              <span className="font-mono font-bold text-slate-800">
                {isMuted ? "0% (Muted)" : `${Math.round(volume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              disabled={isMuted}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Test Sound Button */}
          <button
            type="button"
            onClick={handleTestChime}
            disabled={isPlayingTest}
            className="w-full py-2 px-3 bg-gradient-to-r from-teal-600 to-[#1e536e] hover:from-teal-700 hover:to-[#174358] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
          >
            {isPlayingTest ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                <span>Chiming (Ding-Dong)...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Test Bell Chime</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
