import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Users,
  Building2,
  Stethoscope,
  Volume2,
  Maximize2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { QueueItem, ClinicSettings, DoctorProfile } from "../../types";
import { useCalledPatientAlert } from "../../hooks/useCalledPatientAlert";
import { CalledPatientBanner } from "../common/CalledPatientBanner";
import { ChimeSoundControl } from "../common/ChimeSoundControl";
import { format } from "date-fns";

interface WaitingAreaScreenProps {
  queue: QueueItem[];
  clinic: ClinicSettings;
  doctor: DoctorProfile;
  onBack?: () => void;
}

export const WaitingAreaScreen: React.FC<WaitingAreaScreenProps> = ({
  queue,
  clinic,
  doctor,
  onBack,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mount the alert hook with isWaitingArea=true so it chimes and banners!
  const { alerts, dismissAlert, isMuted } = useCalledPatientAlert({
    isWaitingArea: true,
  });

  // Keep clock updated every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = format(currentTime, "yyyy-MM-dd");

  const todaysQueue = useMemo(
    () => (queue || []).filter((q) => q.visitDate === todayStr),
    [queue, todayStr],
  );

  // Patient currently in cabin
  const currentInCabin = useMemo(
    () => todaysQueue.find((q) => q.status === "With Doctor"),
    [todaysQueue],
  );

  // Next waiting patients
  const upcomingQueue = useMemo(
    () =>
      todaysQueue
        .filter((q) => q.status === "Next" || q.status === "Waiting")
        .sort((a, b) => {
          if (a.status === "Next" && b.status !== "Next") return -1;
          if (b.status === "Next" && a.status !== "Next") return 1;
          const seqA = Number(a.sequenceNumber) || 0;
          const seqB = Number(b.sequenceNumber) || 0;
          if (seqA !== seqB) return seqA - seqB;
          return (a.arrivalTime || "").localeCompare(b.arrivalTime || "");
        }),
    [todaysQueue],
  );

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans select-none relative overflow-hidden">
      {/* Real-time Alert Banner Mounted on Waiting Screen */}
      <CalledPatientBanner
        alerts={alerts}
        onDismiss={dismissAlert}
        isMuted={isMuted}
      />

      {/* Top Banner Header */}
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/80 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Return to Receptionist Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {clinic.name || "MediHive Clinic"}
            </h1>
            <p className="text-xs sm:text-sm text-teal-300/90 font-medium">
              Consulting: {doctor.name} ({doctor.specialisation})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ChimeSoundControl />

          <button
            onClick={handleFullscreen}
            className="p-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          {/* Clock */}
          <div className="text-right pl-3 border-l border-slate-700">
            <div className="text-lg sm:text-xl font-black font-mono tracking-wider text-white">
              {format(currentTime, "hh:mm:ss a")}
            </div>
            <div className="text-xs text-slate-400">
              {format(currentTime, "EEEE, dd MMMM yyyy")}
            </div>
          </div>
        </div>
      </header>

      {/* Main Display Area */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* NOW CALLING / IN CABIN CARD */}
        <section className="lg:col-span-7 flex flex-col">
          <div className="bg-gradient-to-br from-[#16435c] via-[#103347] to-slate-900 border-2 border-teal-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl flex-1 flex flex-col justify-between relative overflow-hidden">
            <span className="absolute -top-16 -right-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></span>

            <div>
              <div className="flex items-center justify-between pb-4 border-b border-teal-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                    Now in Consultation Cabin
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">Cabin 1</span>
              </div>

              {currentInCabin ? (
                <div className="pt-8 sm:pt-12 text-center space-y-4">
                  <div className="inline-block bg-teal-500/20 text-teal-300 font-mono font-black text-6xl sm:text-8xl px-8 py-3 rounded-3xl border-2 border-teal-400/40 shadow-inner">
                    {currentInCabin.queueNumber}
                  </div>

                  <div>
                    <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                      {currentInCabin.patientName}
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base mt-1">
                      Patient ID: {currentInCabin.patientId}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pt-16 sm:pt-24 text-center space-y-3">
                  <Stethoscope className="w-16 h-16 text-slate-600 mx-auto animate-pulse" />
                  <h3 className="text-2xl font-bold text-slate-400">
                    Cabin Ready for Next Patient
                  </h3>
                  <p className="text-sm text-slate-500">
                    Please listen for your token announcement.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-teal-500/20 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>Live Clinic Queue System</span>
              </span>
              <span>Tokens called in strict order</span>
            </div>
          </div>
        </section>

        {/* UPCOMING PATIENTS LIST */}
        <section className="lg:col-span-5 flex flex-col">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-6 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Next in Line
                </h3>
              </div>
              <span className="text-xs bg-sky-500/20 text-sky-300 font-bold px-2.5 py-0.5 rounded-full border border-sky-500/30">
                {upcomingQueue.length} Waiting
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pt-4 touch-scroll max-h-[500px]">
              {upcomingQueue.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Waiting lounge queue is currently clear.
                </div>
              ) : (
                upcomingQueue.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl flex items-center justify-between transition border ${
                      idx === 0
                        ? "bg-amber-500/15 border-amber-400/40 text-amber-200"
                        : "bg-slate-700/40 border-slate-700 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 ${
                          idx === 0
                            ? "bg-amber-500 text-slate-950 shadow-sm"
                            : "bg-slate-600 text-white"
                        }`}
                      >
                        {item.queueNumber}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white truncate max-w-[170px] sm:max-w-[220px]">
                          {item.patientName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Arrived: {item.arrivalTime || "Just now"}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        idx === 0
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                          : "bg-slate-600/40 text-slate-400"
                      }`}
                    >
                      {idx === 0 ? "Next in Queue" : `#${idx + 1}`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
