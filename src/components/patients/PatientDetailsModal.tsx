import React from "react";
import {
  X,
  Calendar,
  Clock,
  Phone,
  User,
  FileText,
  Printer,
  Eye,
  IndianRupee,
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  Pill,
  AlertCircle,
  MapPin,
  Activity,
  HeartPulse,
  History,
  ShieldAlert,
} from "lucide-react";
import { Patient, OPDRecord } from "../../types";
import { format } from "date-fns";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface PatientDetailsModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onPreviewPrescription: (record: OPDRecord) => void;
  onPrintPrescription: (record: OPDRecord) => void;
  onAddNewOpd: (patientId: string) => void;
  onDeleteOpdRecord?: (patientId: string, recordId: string) => void;
}

export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({
  patient,
  isOpen,
  onClose,
  onPreviewPrescription,
  onPrintPrescription,
  onAddNewOpd,
  onDeleteOpdRecord,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({
    isOpen: Boolean(isOpen && patient),
    onClose,
  });

  if (!isOpen || !patient) return null;

  // Helper: calculate BMI if valid weight & height are available
  const calculateBmi = (): string | null => {
    if (!patient.weight || !patient.height) return null;
    const w = parseFloat(patient.weight.replace(/[^\d.]/g, ""));
    const hRaw = parseFloat(patient.height.replace(/[^\d.]/g, ""));
    if (!w || !hRaw || w <= 0 || hRaw <= 0) return null;
    // Assume height in cm if > 30, else meters
    const hMeters = hRaw > 30 ? hRaw / 100 : hRaw;
    const bmi = w / (hMeters * hMeters);
    return isFinite(bmi) && bmi > 5 && bmi < 100 ? bmi.toFixed(1) : null;
  };

  const bmiVal = calculateBmi();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 no-print">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-details-title"
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full flex flex-col max-h-[96dvh] sm:max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <h2
                id="patient-details-title"
                className="text-base sm:text-lg font-bold text-slate-900 capitalize truncate"
              >
                {patient.fullName}
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                {patient.id}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              {patient.gender} • {patient.age} yrs • Registered{" "}
              {patient.registrationDate}
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => {
                onClose();
                onAddNewOpd(patient.id);
              }}
              className="text-xs bg-[#2da478] hover:bg-[#258d67] text-white font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Visit</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-slate-100/40 touch-scroll">
          {/* Section 1: Patient Profile & Demographics Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#1e536e]" />
                <span>Patient Demographics & Medical Profile</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Total Visits:{" "}
                <strong className="text-slate-800">
                  {patient.totalVisits ||
                    (patient.records ? patient.records.length : 0)}
                </strong>
              </span>
            </div>

            {/* Demographics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-medium">
                  Mobile Phone
                </span>
                <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{patient.mobile || "N/A"}</span>
                </p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-medium">
                  Date of Birth
                </span>
                <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{patient.dob || `${patient.age} years old`}</span>
                </p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-medium">
                  Blood Group
                </span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {patient.bloodGroup || "Not specified"}
                </p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-medium">
                  Physical Baseline
                </span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {patient.weight ? `${patient.weight} kg` : "—"}{" "}
                  {patient.height ? `• ${patient.height}` : ""}
                  {bmiVal && (
                    <span className="text-[10px] text-teal-700 block font-normal">
                      BMI: {bmiVal}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Secondary Profile Strip: Emergency Contact & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {patient.emergencyContact && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-medium">
                    Emergency Contact
                  </span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {patient.emergencyContact}
                  </p>
                </div>
              )}
              {patient.address && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-medium">
                    Address / Residence
                  </span>
                  <p className="font-medium text-slate-800 mt-0.5 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>{patient.address}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Known Allergies Alert Banner */}
            {patient.allergies && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2 text-xs text-rose-900">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-rose-800">
                    Known Allergies:{" "}
                  </strong>
                  <span className="font-semibold text-rose-950">
                    {patient.allergies}
                  </span>
                </div>
              </div>
            )}

            {/* Medical History & Notes */}
            {(patient.medicalHistory || patient.notes) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-100">
                {patient.medicalHistory && (
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">
                      Medical History
                    </span>
                    <p className="text-slate-700 mt-0.5">
                      {patient.medicalHistory}
                    </p>
                  </div>
                )}
                {patient.notes && (
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">
                      General Clinical Notes
                    </span>
                    <p className="text-slate-700 mt-0.5">{patient.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Visit & Consultation Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-teal-600" />
                <span>
                  OPD Consultation History ({patient.records?.length || 0})
                </span>
              </h3>
            </div>
            {patient.records.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
                No OPD consultation records found for this patient.
              </div>
            ) : (
              patient.records.map((record, index) => (
                <div
                  key={record.id || index}
                  className="bg-white rounded-xl shadow-sm border border-slate-200/90 p-5 space-y-3"
                >
                  {/* Visit Top Strip */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-600" />
                      <span className="text-sm font-bold text-slate-800">
                        {record.visitDate}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ({record.id})
                      </span>
                    </div>
                    <span className="text-xs bg-sky-50 text-sky-700 font-semibold px-2.5 py-0.5 rounded-full border border-sky-100">
                      {record.chargeType || "First Visit"}
                    </span>
                  </div>

                  {/* Chief Complaint */}
                  {record.complaint && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                      <span className="font-bold text-slate-700">
                        Chief Complaint:{" "}
                      </span>
                      <span className="text-slate-800">{record.complaint}</span>
                    </div>
                  )}

                  {/* Vitals Recorded during this Visit */}
                  {record.vitals &&
                    (record.vitals.bp ||
                      record.vitals.pulse ||
                      record.vitals.temp ||
                      record.vitals.spo2 ||
                      record.vitals.weight ||
                      record.vitals.height) && (
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {record.vitals.bp && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-100 font-medium">
                            BP: {record.vitals.bp} mmHg
                          </span>
                        )}
                        {record.vitals.pulse && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-100 font-medium">
                            Pulse: {record.vitals.pulse} bpm
                          </span>
                        )}
                        {record.vitals.temp && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-100 font-medium">
                            Temp: {record.vitals.temp} °F
                          </span>
                        )}
                        {record.vitals.spo2 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100 font-medium">
                            SpO2: {record.vitals.spo2}%
                          </span>
                        )}
                        {record.vitals.weight && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                            Wt: {record.vitals.weight} kg
                          </span>
                        )}
                        {record.vitals.height && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                            Ht: {record.vitals.height}
                          </span>
                        )}
                      </div>
                    )}

                  {/* Symptoms & Diagnosis */}
                  <div className="text-xs space-y-1 text-slate-700">
                    {record.diagnosis && (
                      <p>
                        <strong>Diagnosis:</strong> {record.diagnosis}
                      </p>
                    )}
                    {record.symptoms && record.symptoms.length > 0 && (
                      <p>
                        <strong>Symptoms:</strong> {record.symptoms.join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Lab Investigations / Tests */}
                  {record.tests && (
                    <div className="p-2.5 bg-sky-50/70 rounded-lg border border-sky-200 text-xs">
                      <strong className="text-[#1e536e]">
                        Lab Investigations / Tests:{" "}
                      </strong>
                      <span className="text-slate-800">{record.tests}</span>
                    </div>
                  )}

                  {/* Medicines List */}
                  {(() => {
                    const meds =
                      record.medicines && record.medicines.length > 0
                        ? record.medicines
                        : record.prescriptions || [];
                    if (meds.length === 0) {
                      return (
                        <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/70 text-xs text-slate-500 italic">
                          No medicines prescribed for this consultation visit.
                        </div>
                      );
                    }
                    return (
                      <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/80 text-xs space-y-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <Pill className="w-3.5 h-3.5 text-teal-600" />
                          <span>Prescribed Medicines ({meds.length}):</span>
                        </span>
                        <div className="space-y-1.5">
                          {meds.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="bg-white p-2 rounded-lg border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-2xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900">
                                  {m.name}
                                </span>
                                {m.dosage && (
                                  <span className="text-slate-600">
                                    {" "}
                                    • {m.dosage}
                                  </span>
                                )}
                                {m.duration && (
                                  <span className="text-teal-700 font-medium">
                                    {" "}
                                    • For {m.duration}
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-500 text-[11px]">
                                <span className="font-medium text-slate-700">
                                  {m.frequency}
                                </span>
                                {m.timing && <span> ({m.timing})</span>}
                                {(m.instruction || m.instructions) && (
                                  <span className="text-slate-400 italic">
                                    {" "}
                                    — {m.instruction || m.instructions}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Panchakarma, Dietary Advice & Clinical Notes */}
                  <div className="text-xs space-y-1 text-slate-600">
                    {record.clinicalNotes && (
                      <p>
                        <strong>Notes:</strong> {record.clinicalNotes}
                      </p>
                    )}
                    {record.panchakarmaNotes && (
                      <p>
                        <strong className="text-emerald-800">
                          Panchakarma Notes:
                        </strong>{" "}
                        {record.panchakarmaNotes}
                      </p>
                    )}
                    {record.dietaryAdvice && (
                      <p className="text-amber-900 bg-amber-50/60 p-2 rounded-lg border border-amber-200">
                        <strong>Dietary Advice:</strong> {record.dietaryAdvice}
                      </p>
                    )}
                    {record.nextVisitDate && (
                      <p className="flex items-center gap-1.5 text-sky-800 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          Next Visit Reminder:{" "}
                          <strong>{record.nextVisitDate}</strong>
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Uploaded Clinical / Prescription Photos */}
                  {record.uploadedImages &&
                    record.uploadedImages.length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                          <span>
                            Clinical / Prescription Photos (
                            {record.uploadedImages.length}):
                          </span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {record.uploadedImages.map((img, imgIdx) => (
                            <a
                              key={imgIdx}
                              href={img}
                              target="_blank"
                              rel="noreferrer"
                              className="relative group block w-14 h-14 rounded-lg overflow-hidden border border-slate-200 hover:border-teal-500 shadow-xs transition"
                              title="Click to view full image in new tab"
                            >
                              <img
                                src={img}
                                alt={`Photo ${imgIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-semibold transition">
                                View
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Card Footer: Itemized Billing & Actions (Preview / Print) */}
                  <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span>
                          Consultation: ₹{record.consultationFee ?? 0}
                        </span>
                        {record.medicineFee ? (
                          <span>• Meds: ₹{record.medicineFee}</span>
                        ) : null}
                        {record.panchakarmaFee ? (
                          <span>• Panchakarma: ₹{record.panchakarmaFee}</span>
                        ) : null}
                        {record.discountValue ? (
                          <span className="text-emerald-700 font-semibold">
                            • Disc: ₹{record.discountValue}
                          </span>
                        ) : null}
                        {record.paymentMode && (
                          <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {record.paymentMode}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        Total Fee:{" "}
                        <span className="font-black text-medihive-800">
                          ₹{record.totalFee}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onPreviewPrescription(record)}
                        className="px-3 py-1.5 text-xs font-semibold bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={() => onPrintPrescription(record)}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#1e536e] text-white hover:bg-[#18445a] rounded-lg flex items-center gap-1 shadow-sm transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>

                      {onDeleteOpdRecord && (
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to delete consultation record from ${record.visitDate}? This will remove it from database history.`,
                              )
                            ) {
                              onDeleteOpdRecord(patient.id, record.id);
                            }
                          }}
                          title="Delete Consultation Record"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
