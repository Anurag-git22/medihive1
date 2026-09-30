import React, { useState, useMemo } from "react";
import {
  Users,
  Clock,
  UserCheck,
  CheckCircle2,
  Search,
  UserPlus,
  ListOrdered,
  ArrowRight,
  Activity,
  Stethoscope,
  Sparkles,
  Phone,
  Eye,
  Calendar,
  AlertCircle,
  Thermometer,
  Edit2,
  Trash2,
} from "lucide-react";
import { Patient, PatientVisit, QueueItem } from "../../types";
import { PatientHistoryModal } from "./PatientHistoryModal";
import { getLocalDateString } from "../../services/storage";

interface ReceptionistDashboardProps {
  patients: Patient[];
  visits: PatientVisit[];
  queue: QueueItem[];
  onNavigateToSearch: (initialQuery?: string) => void;
  onNavigateToNewPatient: () => void;
  onNavigateToQueue: () => void;
  onStartVisit: (patient: Patient) => void;
  onEditPatient?: (patient: Patient) => void;
  onDeletePatient?: (patientId: string) => void;
  onDeleteVisit?: (visitId: string) => void;
}

export const ReceptionistDashboard: React.FC<ReceptionistDashboardProps> = ({
  patients,
  visits,
  queue,
  onNavigateToSearch,
  onNavigateToNewPatient,
  onNavigateToQueue,
  onStartVisit,
  onEditPatient,
  onDeletePatient,
  onDeleteVisit,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientForHistory, setSelectedPatientForHistory] =
    useState<Patient | null>(null);

  const today = getLocalDateString();
  const todaysVisits = useMemo(
    () => (visits || []).filter((v) => v.visitDate === today),
    [visits, today],
  );
  const todaysQueue = useMemo(
    () => (queue || []).filter((q) => q.visitDate === today),
    [queue, today],
  );

  // Current Patient with doctor
  const currentWithDoctor = useMemo(() => {
    return todaysQueue.find((q) => q.status === "With Doctor");
  }, [todaysQueue]);

  // Next patient in line
  const nextInLine = useMemo(() => {
    return todaysQueue
      .filter((q) => q.status === "Next" || q.status === "Waiting")
      .sort((a, b) => {
        if (a.status === "Next" && b.status !== "Next") return -1;
        if (b.status === "Next" && a.status !== "Next") return 1;
        const seqA = Number(a.sequenceNumber) || 0;
        const seqB = Number(b.sequenceNumber) || 0;
        if (seqA !== seqB) return seqA - seqB;
        return (a.arrivalTime || "").localeCompare(b.arrivalTime || "");
      })[0];
  }, [todaysQueue]);

  // Counts
  const waitingCount = useMemo(() => {
    return todaysQueue.filter(
      (q) => q.status === "Waiting" || q.status === "Next",
    ).length;
  }, [todaysQueue]);

  const completedCount = useMemo(() => {
    return todaysQueue.filter((q) => q.status === "Completed").length;
  }, [todaysQueue]);

  // Quick search results
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return patients
      .filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.mobile.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
          (p.dob && p.dob.includes(q)),
      )
      .slice(0, 5);
  }, [patients, searchQuery]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 page-fade-in">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-[#194358] via-[#205570] to-[#2c7295] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Reception Desk Online
            </span>
            <span className="text-xs text-sky-200">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Patient Reception Portal
          </h1>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onNavigateToNewPatient}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Patient</span>
          </button>
          <button
            onClick={onNavigateToQueue}
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-sm font-semibold backdrop-blur-sm transition flex items-center gap-2"
          >
            <ListOrdered className="w-4 h-4" />
            <span>Live Queue ({waitingCount})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Registered Patients
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {patients.length}
            </h3>
            <p className="text-[11px] text-slate-400">
              Total in clinic records
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today's Visits
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {todaysVisits.length}
            </h3>
            <p className="text-[11px] text-indigo-600 font-medium">
              Admitted today
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Waiting in Queue
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {waitingCount}
            </h3>
            <p className="text-[11px] text-amber-600 font-medium">
              In waiting area
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed Today
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {completedCount}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium">
              Consultations done
            </p>
          </div>
        </div>
      </div>

      {/* Live Cabin Status Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Currently With Doctor */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                In Doctor's Cabin Now
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Consultation
            </span>
          </div>

          {currentWithDoctor ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex flex-col items-center justify-center font-bold text-base shadow-sm">
                    <span>{currentWithDoctor.queueNumber}</span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {currentWithDoctor.patientName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {currentWithDoctor.patientAge} yrs •{" "}
                      {currentWithDoctor.patientGender} • ID:{" "}
                      {currentWithDoctor.patientId}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Called{" "}
                  {currentWithDoctor.calledAt
                    ? new Date(currentWithDoctor.calledAt).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" },
                      )
                    : "recently"}
                </span>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-100">
                <span className="font-semibold text-slate-700">
                  Complaint:{" "}
                </span>
                <span className="text-slate-600">
                  {currentWithDoctor.complaint || "General Checkup"}
                </span>
                {currentWithDoctor.symptoms &&
                  currentWithDoctor.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {currentWithDoctor.symptoms.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 text-[10px] font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <Stethoscope className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">
                Cabin is currently open
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Doctor has not called the next patient yet.
              </p>
            </div>
          )}
        </div>

        {/* Next Patient In Line */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Next Patient In Line
              </h3>
            </div>
            <button
              onClick={onNavigateToQueue}
              className="text-xs font-semibold text-[#194358] hover:underline flex items-center gap-1"
            >
              <span>Full Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {nextInLine ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex flex-col items-center justify-center font-bold text-base shadow-sm">
                    <span>{nextInLine.queueNumber}</span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {nextInLine.patientName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {nextInLine.patientAge} yrs • {nextInLine.patientGender} •
                      ID: {nextInLine.patientId}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                  Status: {nextInLine.status}
                </span>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-100">
                <span className="font-semibold text-slate-700">
                  Complaint:{" "}
                </span>
                <span className="text-slate-600">
                  {nextInLine.complaint || "Checkup"}
                </span>
                {nextInLine.vitals && (
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400">BP:</span>{" "}
                      {nextInLine.vitals.bp || "—"}
                    </div>
                    <div>
                      <span className="text-slate-400">Temp:</span>{" "}
                      {nextInLine.vitals.temp
                        ? `${nextInLine.vitals.temp}°F`
                        : "—"}
                    </div>
                    <div>
                      <span className="text-slate-400">SpO2:</span>{" "}
                      {nextInLine.vitals.spo2
                        ? `${nextInLine.vitals.spo2}%`
                        : "—"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">
                No patients waiting in queue
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Register a walk-in or search an existing patient to assign
                token.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Search & Admit Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Quick Patient Check-in
            </h3>
            <p className="text-xs text-slate-500">
              Search patient by Name, ID, Mobile number or DOB
            </p>
          </div>
          <button
            onClick={() => onNavigateToSearch(searchQuery)}
            className="text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline flex items-center gap-1"
          >
            <span>Open Advanced Search</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="receptionist-quick-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type patient name, mobile (e.g. 9876543210), or ID (e.g. P0001)..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#194358] focus:bg-white transition"
          />
        </div>

        {/* Instant Search Results Dropdown / Preview */}
        {searchQuery.trim() && (
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white shadow-sm">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {p.fullName}
                      </span>
                      <span className="text-[11px] font-mono bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded">
                        {p.id}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({p.age}y, {p.gender})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {p.mobile}
                      </span>
                      <span>
                        Total Visits:{" "}
                        {p.totalVisits || (p.records ? p.records.length : 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedPatientForHistory(p)}
                      title="View Medical History"
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>History</span>
                    </button>

                    {onEditPatient && (
                      <button
                        onClick={() => onEditPatient(p)}
                        title="Edit Patient Details"
                        className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeletePatient && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete patient ${p.fullName} (${p.id})? This will also remove their visits and queue items.`,
                            )
                          ) {
                            onDeletePatient(p.id);
                          }
                        }}
                        title="Delete Patient Record"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => onStartVisit(p)}
                      className="px-3 py-1.5 text-xs text-white bg-[#194358] hover:bg-[#205570] rounded-lg font-semibold shadow-sm transition flex items-center gap-1.5"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Admit / New Visit</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-5 text-center">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                <p className="text-sm font-semibold text-slate-800">
                  No patient found matching "{searchQuery}"
                </p>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">
                  Would you like to register this person as a new patient?
                </p>
                <button
                  onClick={onNavigateToNewPatient}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register as New Patient</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patient History Modal */}
      {selectedPatientForHistory && (
        <PatientHistoryModal
          patient={selectedPatientForHistory}
          visits={visits}
          isOpen={Boolean(selectedPatientForHistory)}
          onClose={() => setSelectedPatientForHistory(null)}
          onStartNewVisit={(patient) => {
            setSelectedPatientForHistory(null);
            onStartVisit(patient);
          }}
          onEditPatient={onEditPatient}
          onDeletePatient={onDeletePatient}
          onDeleteVisit={onDeleteVisit}
        />
      )}
    </div>
  );
};
