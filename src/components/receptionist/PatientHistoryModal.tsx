import React from "react";
import {
  X,
  Calendar,
  Clock,
  Activity,
  FileText,
  Pill,
  AlertCircle,
  Shield,
  User,
  Phone,
  MapPin,
  Edit2,
  Trash2,
} from "lucide-react";
import { Patient, OPDRecord, PatientVisit } from "../../types";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface PatientHistoryModalProps {
  patient: Patient | null;
  visits?: PatientVisit[];
  isOpen: boolean;
  onClose: () => void;
  onStartNewVisit?: (patient: Patient) => void;
  onEditPatient?: (patient: Patient) => void;
  onDeletePatient?: (patientId: string) => void;
  onDeleteVisit?: (visitId: string) => void;
}

export const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({
  patient,
  visits = [],
  isOpen,
  onClose,
  onStartNewVisit,
  onEditPatient,
  onDeletePatient,
  onDeleteVisit,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({
    isOpen: Boolean(isOpen && patient),
    onClose,
  });

  if (!isOpen || !patient) return null;

  const records = [...(patient.records || [])].sort(
    (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime(),
  );

  const patientVisits = (visits || []).filter(
    (v) => v.patientId === patient.id,
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-history-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[96dvh] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-linear-to-r from-[#1e536e] to-[#256382] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <User className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="patient-history-title"
                  className="text-lg font-bold text-white capitalize"
                >
                  {patient.fullName}
                </h2>
                <span className="text-xs bg-sky-900/60 border border-sky-400/30 px-2 py-0.5 rounded-full font-mono text-sky-200">
                  {patient.id}
                </span>
              </div>
              <p className="text-xs text-sky-100/80">
                {patient.gender} {patient.age} yrs Mobile: {patient.mobile}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Key Medical Profile Chips */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {patient.bloodGroup && (
              <span className="px-2 py-1 bg-rose-50 text-rose-700 font-semibold rounded border border-rose-200">
                Blood: {patient.bloodGroup}
              </span>
            )}
            {patient.weight && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 font-medium rounded border border-blue-200">
                Weight: {patient.weight} kg
              </span>
            )}
            {patient.height && (
              <span className="px-2 py-1 bg-teal-50 text-teal-700 font-medium rounded border border-teal-200">
                Height: {patient.height}
              </span>
            )}
            {patient.allergies && (
              <span className="px-2 py-1 bg-amber-50 text-amber-800 font-medium rounded border border-amber-200">
                Allergies: {patient.allergies}
              </span>
            )}
            {patient.medicalHistory && (
              <span className="px-2 py-1 bg-purple-50 text-purple-700 font-medium rounded border border-purple-200">
                History: {patient.medicalHistory}
              </span>
            )}
            <span className="text-slate-500">
              Total Visits:{" "}
              <strong className="text-slate-800">
                {records.length || patient.totalVisits || 0}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>View-Only Clinical History</span>
          </div>
        </div>

        {/* Scrollable History Content */}
        <div className="flex-1 overflow-y-auto touch-scroll p-3 sm:p-6 space-y-4 sm:space-y-6">
          {records.length === 0 && patientVisits.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                No previous visit records found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                This is a newly registered patient.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((rec, idx) => (
                <div
                  key={rec.id || idx}
                  className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-4 h-4 text-sky-700" />
                      <span className="font-bold text-slate-800 font-mono">
                        {rec.visitDate}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-semibold">
                        {rec.opdType || "Consultation"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {rec.id}
                    </span>
                  </div>

                  {/* Diagnosis & Symptoms */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Diagnosis & Complaint
                    </h4>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {rec.diagnosis || "General Consultation"}
                    </p>
                    {rec.symptoms && rec.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {rec.symptoms.map((s, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Doctor Notes */}
                  {rec.clinicalNotes && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900 block mb-0.5">
                        Doctor Notes:
                      </span>
                      {rec.clinicalNotes}
                    </div>
                  )}

                  {/* Prescribed Medicines (Doctor Authored - View Only) */}
                  {rec.medicines && rec.medicines.length > 0 && (
                    <div>
                      <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <Pill className="w-3 h-3 text-teal-600" />
                        <span>Prescriptions Given</span>
                      </h5>
                      <div className="divide-y divide-slate-100 bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
                        {rec.medicines.map((m, mi) => (
                          <div
                            key={mi}
                            className="p-2 flex items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-bold text-slate-800">
                                {m.name}
                              </span>
                              <span className="text-slate-500 ml-2">
                                ({m.dosage} {m.frequency})
                              </span>
                            </div>
                            <span className="text-slate-500 text-[11px]">
                              {m.timing} {m.duration}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up reminder if any */}
                  {rec.nextVisitDate && (
                    <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        Follow-up Scheduled:{" "}
                        <strong>{rec.nextVisitDate}</strong>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Recent Reception Visits & Queue Entries */}
          {patientVisits.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recent Reception Visits & Queue Tokens ({patientVisits.length})
              </h4>
              <div className="space-y-2">
                {patientVisits.map((v) => (
                  <div
                    key={v.id}
                    className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">
                          {v.visitDate} {v.visitTime}
                        </span>
                        {v.queueNumber && (
                          <span className="font-mono font-extrabold bg-white text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                            {v.queueNumber}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            v.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : v.status === "Cancelled"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">
                        <strong>Complaint:</strong>{" "}
                        {v.complaint || "General Checkup"}
                      </p>
                    </div>

                    {onDeleteVisit && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete visit record from ${v.visitDate} (${v.queueNumber || v.id})?`,
                            )
                          ) {
                            onDeleteVisit(v.id);
                          }
                        }}
                        title="Delete this visit entry"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition text-center"
            >
              Close
            </button>

            {onEditPatient && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPatient(patient);
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Details</span>
              </button>
            )}

            {onDeletePatient && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to permanently delete patient ${patient.fullName} (${patient.id})? This will also remove all their visits and queue records.`,
                    )
                  ) {
                    onClose();
                    onDeletePatient(patient.id);
                  }
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Patient</span>
              </button>
            )}
          </div>

          {onStartNewVisit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartNewVisit(patient);
              }}
              className="px-4 py-2 text-xs font-bold bg-[#2ba4c7] hover:bg-[#228da8] text-white rounded-lg transition shadow-sm text-center"
            >
              Start New Visit for {patient.fullName}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
