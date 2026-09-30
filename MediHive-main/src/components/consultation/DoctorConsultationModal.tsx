import React from "react";
import { X, Stethoscope, History } from "lucide-react";
import {
  Patient,
  QueueItem,
  OPDRecord,
  DoctorProfile,
  ClinicSettings,
} from "../../types";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { ConsultationForm } from "./ConsultationForm";

interface DoctorConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  queueItem: QueueItem;
  patient: Patient;
  doctor: DoctorProfile;
  clinic: ClinicSettings;
  existingPatients: Patient[];
  onCompleteConsultation: (opdRecord: OPDRecord, autoCallNext: boolean) => void;
  onViewHistory: (patient: Patient) => void;
  onPreviewPrescription?: (patient: Patient, record: OPDRecord) => void;
}

export const DoctorConsultationModal: React.FC<
  DoctorConsultationModalProps
> = ({
  isOpen,
  onClose,
  queueItem,
  patient,
  doctor,
  clinic,
  existingPatients,
  onCompleteConsultation,
  onViewHistory,
  onPreviewPrescription,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consultation-modal-title"
        className="bg-white w-full max-w-5xl rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96dvh] sm:max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-[#194358] text-white px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/30 shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-900 text-xs font-bold font-mono">
                  {queueItem.queueNumber}
                </span>
                <h2
                  id="consultation-modal-title"
                  className="text-sm sm:text-lg font-bold text-white truncate"
                >
                  Active Consultation
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-sky-200/90 truncate">
                <span className="font-semibold text-white">
                  {patient.fullName}
                </span>{" "}
                ({patient.age}y, {patient.gender}) • ID: {patient.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => onViewHistory(patient)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-medium transition flex items-center gap-1 border border-white/15"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Past History</span> (
              {patient.records ? patient.records.length : 0})
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 touch-scroll">
          <ConsultationForm
            mode="modal"
            patient={patient}
            queueItem={queueItem}
            doctor={doctor}
            clinic={clinic}
            existingPatients={existingPatients}
            onSave={(
              record,
              updatedPatient,
              autoCallNext,
              generatePrescription,
            ) => {
              onCompleteConsultation(record, Boolean(autoCallNext));
              if (generatePrescription && onPreviewPrescription) {
                onPreviewPrescription(updatedPatient, record);
              }
              onClose();
            }}
            onCancel={onClose}
            onPreviewPrescription={onPreviewPrescription}
            onViewHistory={onViewHistory}
          />
        </div>
      </div>
    </div>
  );
};
