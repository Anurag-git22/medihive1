import React, { useState, useEffect } from "react";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Check,
} from "lucide-react";
import { Patient, Appointment } from "../../types";
import { useToast } from "../common/Toast";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { getLocalDateString } from "../../services/storage";

interface AddAppointmentModalProps {
  patients: Patient[];
  defaultDate?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveAppointment: (appointment: Appointment) => void;
}

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  patients,
  defaultDate,
  isOpen,
  onClose,
  onSaveAppointment,
}) => {
  const { showToast } = useToast();
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientMobile, setPatientMobile] = useState("");
  const [date, setDate] = useState(() => defaultDate || getLocalDateString());
  const [time, setTime] = useState("11:00");
  const [reason, setReason] = useState("");
  const [type, setType] = useState<"Appointment" | "Follow-up Reminder">(
    "Appointment",
  );

  // Synchronize appointment date with the active selected calendar date whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate || getLocalDateString());
    }
  }, [isOpen, defaultDate]);

  if (!isOpen) return null;

  const handlePatientSelect = (pId: string) => {
    setPatientId(pId);
    const p = patients.find((pat) => pat.id === pId);
    if (p) {
      setPatientName(p.fullName);
      setPatientMobile(p.mobile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      showToast("Please specify patient name", "error");
      return;
    }

    const newApt: Appointment = {
      id: `APT-${Date.now()}`,
      patientId: patientId || "NEW",
      patientName: patientName.trim(),
      patientMobile: patientMobile.trim(),
      date,
      time,
      reason: reason.trim() || "General Follow-up / Consultation",
      type,
      status: "Scheduled",
    };

    onSaveAppointment(newApt);
    showToast(
      `Appointment booked for ${newApt.patientName} on ${date}`,
      "success",
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 no-print">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-modal-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[96dvh] flex flex-col overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2
              id="appointment-modal-title"
              className="text-base font-bold text-slate-800"
            >
              Schedule Appointment / Reminder
            </h2>
            <p className="text-xs text-slate-500">
              Book visit or set a patient follow-up
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto touch-scroll"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Existing Patient
            </label>
            <select
              value={patientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
            >
              <option value="">
                -- Choose Existing Patient or Type Below --
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.id}) - {p.mobile}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Patient Name *
            </label>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient name"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              value={patientMobile}
              onChange={(e) => setPatientMobile(e.target.value)}
              placeholder="Enter mobile number"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Entry Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              >
                <option value="Follow-up Reminder">Follow-up Reminder</option>
                <option value="Appointment">Booked Appointment</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reason / Notes
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for visit / consultation notes"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto justify-center px-5 py-2 rounded-lg bg-[#2da478] hover:bg-[#258d67] text-white font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Check className="w-4 h-4" />
              <span>Save Appointment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
