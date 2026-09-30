import { DoctorProfile, ClinicSettings, QueueItem } from "../../types";
import { RealtimeSyncStatus } from "../../services/supabaseService";
import {
  User,
  Bell,
  Calendar as CalendarIcon,
  Menu,
  UserCheck,
  Stethoscope,
} from "lucide-react";
import { format } from "date-fns";

interface NavbarProps {
  doctor: DoctorProfile;
  clinic: ClinicSettings;
  realtimeStatus?: RealtimeSyncStatus;
  activeFollowUpsCount?: number;
  nextPatientInQueue?: QueueItem;
  currentPatientInCabin?: QueueItem;
  onCallNextPatient?: (queueId?: string) => void;
  onOpenConsultationModal?: (item: QueueItem) => void;
  onNavigateToCalendar?: () => void;
  onOpenFollowUps?: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  doctor,
  clinic,
  realtimeStatus = "CONNECTED",
  activeFollowUpsCount = 0,
  nextPatientInQueue,
  currentPatientInCabin,
  onCallNextPatient,
  onOpenConsultationModal,
  onNavigateToCalendar,
  onOpenFollowUps,
  onToggleSidebar,
}) => {
  const currentDateFormatted = format(new Date(), "dd MMMM yyyy");

  return (
    <header className="bg-linear-to-r from-[#1e536e] via-[#236484] to-[#1e536e] text-white px-3 sm:px-6 py-2.5 shadow-md flex items-center justify-between z-30 no-print">
      {/* Left side: Mobile Menu Toggle + Brand or Greeting */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Hamburger button on mobile & tablet */}
        <button
          onClick={onToggleSidebar}
          className="p-1.5 -ml-1 text-white hover:bg-white/15 rounded-lg lg:hidden transition flex items-center justify-center cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-sky-100">
            Welcome <span className="text-white font-bold">{doctor.name}</span>
          </span>
        </div>
      </div>

      {/* Right side: Next Patient Button, Date, Reminders & Profile Badge */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Next Waiting Patient Call Action */}
        {nextPatientInQueue && onCallNextPatient && (
          <button
            onClick={() => onCallNextPatient(nextPatientInQueue.id)}
            title={`Take Next Patient: ${nextPatientInQueue.patientName} (${nextPatientInQueue.queueNumber}) into Cabin`}
            className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 transition border border-emerald-300 cursor-pointer animate-pulse hover:animate-none"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Call Next:</span>
            <span className="bg-white/25 px-1.5 py-0.5 rounded text-[11px] font-mono tracking-tight">
              {nextPatientInQueue.queueNumber}
            </span>
          </button>
        )}

        {/* Current Patient in Cabin Quick Badge */}
        {currentPatientInCabin && onOpenConsultationModal && (
          <button
            onClick={() => onOpenConsultationModal(currentPatientInCabin)}
            title={`In Cabin: ${currentPatientInCabin.patientName} (${currentPatientInCabin.queueNumber}). Click to open consultation.`}
            className="hidden sm:flex items-center gap-1.5 text-xs text-teal-100 bg-[#163f54] hover:bg-[#1b4b64] px-2.5 py-1.5 rounded-full border border-teal-400/30 transition cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <Stethoscope className="w-3 h-3 text-teal-300" />
            <span className="font-semibold text-white">
              {currentPatientInCabin.queueNumber}
            </span>
            <span className="text-[11px] text-teal-200 truncate max-w-22.5">
              {currentPatientInCabin.patientName.split(" ")[0]}
            </span>
          </button>
        )}

        {/* Date indicator */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-sky-100 bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
          <CalendarIcon className="w-3.5 h-3.5 text-sky-300" />
          <span>{currentDateFormatted}</span>
        </div>

        {/* Follow-up Reminder Bell */}
        {activeFollowUpsCount > 0 && (
          <button
            onClick={onOpenFollowUps || onNavigateToCalendar}
            title={`${activeFollowUpsCount} Follow-ups due today`}
            className="relative p-1.5 rounded-full bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 transition border border-amber-300/40"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {activeFollowUpsCount}
            </span>
          </button>
        )}

        {/* Live Supabase Cloud Realtime Indicator */}
        <div
          className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
            realtimeStatus === "CONNECTED"
              ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/40"
              : realtimeStatus === "CONNECTING"
                ? "bg-amber-500/20 text-amber-100 border-amber-400/40 animate-pulse"
                : "bg-slate-700/40 text-slate-300 border-slate-500/30"
          }`}
          title={
            realtimeStatus === "CONNECTED"
              ? "Real-time Live Sync active with Supabase Cloud"
              : realtimeStatus === "CONNECTING"
                ? "Connecting to Supabase Realtime..."
                : "Offline / Reconnecting to Supabase Cloud..."
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              realtimeStatus === "CONNECTED"
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                : realtimeStatus === "CONNECTING"
                  ? "bg-amber-400 animate-ping"
                  : "bg-slate-400"
            }`}
          />
          <span className="font-semibold text-[11px] tracking-tight">
            {realtimeStatus === "CONNECTED"
              ? "Live"
              : realtimeStatus === "CONNECTING"
                ? "Connecting..."
                : "Reconnecting..."}
          </span>
        </div>

        {/* Doctor & Clinic Profile Pill matching screenshots (top-right card) */}
        <div className="flex items-center gap-2.5 bg-white text-slate-800 px-3 py-1 rounded-full shadow-sm border border-slate-100 text-left">
          <div className="w-7 h-7 rounded-full bg-[#1e536e] text-white flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
            {doctor.photoUrl ? (
              <img
                src={doctor.photoUrl}
                alt={doctor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-sky-200" />
            )}
          </div>
          <div className="pr-1 leading-tight hidden xs:block">
            <p className="text-xs font-bold text-slate-900 truncate max-w-37.5 sm:max-w-45">
              {doctor.name}
            </p>
            <p className="text-[10px] font-medium text-slate-500 truncate max-w-37.5 sm:max-w-45">
              {clinic.name}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
