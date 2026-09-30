import React, { useState } from "react";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  User,
  Activity,
  AlertCircle,
  Clock,
  Thermometer,
  HeartPulse,
  Scale,
  ShieldAlert,
} from "lucide-react";
import {
  Patient,
  PatientVisit,
  PatientVitals,
  QueueItem,
  UserAccount,
} from "../../types";
import { useToast } from "../common/Toast";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface PatientVisitFormProps {
  patient: Patient;
  currentUser: UserAccount | null;
  onBack: () => void;
  onSubmitVisit: (visitData: {
    complaint: string;
    symptoms: string[];
    symptomDuration?: string;
    vitals: PatientVitals;
  }) => { newQueueItem: QueueItem; newVisit: PatientVisit };
  onQueueSuccess: (queueItem: QueueItem) => void;
}

const COMMON_ILLNESSES = [
  "Fever",
  "Cold",
  "Cough",
  "Headache",
  "Body Pain",
  "Stomach Pain",
  "Vomiting",
  "Diarrhea",
  "Sore Throat",
  "Weakness",
];

export const PatientVisitForm: React.FC<PatientVisitFormProps> = ({
  patient,
  currentUser,
  onBack,
  onSubmitVisit,
  onQueueSuccess,
}) => {
  const { showToast } = useToast();

  const [date] = useState(new Date().toISOString().slice(0, 10));
  const [time] = useState(
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  );

  // Complaint & Symptoms
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [otherSymptom, setOtherSymptom] = useState("");
  const [hasOther, setHasOther] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [symptomDuration, setSymptomDuration] = useState("1-2 days");

  // Vitals
  const [temperature, setTemperature] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [weight, setWeight] = useState("");
  const [spO2, setSpO2] = useState("");
  const [pulse, setPulse] = useState("");
  const [otherVitals, setOtherVitals] = useState("");

  // Confirmation Modal
  const [confirmationData, setConfirmationData] = useState<QueueItem | null>(
    null,
  );

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allSymptoms = [...selectedSymptoms];
    if (hasOther && otherSymptom.trim()) {
      allSymptoms.push(otherSymptom.trim());
    }

    if (!complaint.trim() && allSymptoms.length === 0) {
      showToast(
        "Please specify the main complaint or select at least one symptom.",
        "error",
      );
      return;
    }

    const vitals: PatientVitals = {
      temperature: temperature.trim() || undefined,
      bloodPressure: bloodPressure.trim() || undefined,
      weight: weight.trim() || undefined,
      spO2: spO2.trim() || undefined,
      pulse: pulse.trim() || undefined,
      otherVitals: otherVitals.trim() || undefined,
    };

    const finalComplaint =
      complaint.trim() || allSymptoms.join(", ") || "General Consultation";

    const { newQueueItem } = onSubmitVisit({
      complaint: finalComplaint,
      symptoms: allSymptoms,
      symptomDuration: symptomDuration.trim() || undefined,
      vitals,
    });

    setConfirmationData(newQueueItem);
    showToast(
      `Patient ${patient.fullName} added to Queue: ${newQueueItem.queueNumber}`,
      "success",
    );
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-6 page-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Patient Visit & Triage Form
            </h1>
            <p className="text-xs text-slate-500">
              Record patient complaints, symptoms, and basic vitals
            </p>
          </div>
        </div>
      </div>

      {/* Patient Summary Strip */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1e536e] text-white flex items-center justify-center font-bold text-sm">
            {patient.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {patient.fullName}
              </h3>
              <span className="text-xs bg-slate-100 font-mono px-2 py-0.5 rounded text-slate-700 font-semibold">
                {patient.id}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {patient.gender} {patient.age} yrs Mobile:{" "}
              <span className="font-mono">{patient.mobile}</span>
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-4">
          <div>
            <span className="block text-[11px] uppercase font-semibold text-slate-400">
              Visit Date & Time
            </span>
            <span className="font-bold text-slate-700">
              {date} {time}
            </span>
          </div>
        </div>
      </div>

      {/* Important Medical Guard Alert */}
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900 shadow-xs">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Receptionist Guidelines:</strong> Record basic chief
          complaints, duration, and measurable vitals only. Diagnosis, clinical
          assessments, and prescriptions are strictly handled by the consulting
          Doctor.
        </p>
      </div>

      {/* Main Visit Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-slate-200/90 divide-y divide-slate-100 overflow-hidden"
      >
        {/* SECTION 1: Symptoms & Complaints */}
        <div className="p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#1e536e] uppercase tracking-wide flex items-center gap-2">
            <span>1. Chief Complaints & Symptoms</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Common Illnesses / Frequent Complaints (Select all that apply)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {COMMON_ILLNESSES.map((illness) => {
                const isChecked = selectedSymptoms.includes(illness);
                return (
                  <button
                    key={illness}
                    type="button"
                    onClick={() => toggleSymptom(illness)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition flex items-center justify-between ${
                      isChecked
                        ? "bg-sky-50 border-sky-400 text-sky-900 font-semibold shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span>{illness}</span>
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        isChecked
                          ? "bg-sky-600 text-white font-bold"
                          : "border border-slate-300"
                      }`}
                    >
                      {isChecked ? "?" : ""}
                    </span>
                  </button>
                );
              })}

              {/* Other option toggle */}
              <button
                type="button"
                onClick={() => setHasOther(!hasOther)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition flex items-center justify-between ${
                  hasOther
                    ? "bg-purple-50 border-purple-400 text-purple-900 font-semibold shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                <span>Other...</span>
                <span
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                    hasOther
                      ? "bg-purple-600 text-white font-bold"
                      : "border border-slate-300"
                  }`}
                >
                  {hasOther ? "?" : ""}
                </span>
              </button>
            </div>

            {hasOther && (
              <div className="mt-2.5">
                <input
                  type="text"
                  value={otherSymptom}
                  onChange={(e) => setOtherSymptom(e.target.value)}
                  placeholder="Type other specific symptom..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500 focus:bg-white"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Main Complaint Details / Patient Description
              </label>
              <textarea
                rows={3}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="e.g., High fever since yesterday night, persistent dry cough and body ache..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duration of Symptoms
              </label>
              <select
                value={symptomDuration}
                onChange={(e) => setSymptomDuration(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              >
                <option value="Since today morning">Since today morning</option>
                <option value="1-2 days">1-2 days</option>
                <option value="3-5 days">3-5 days</option>
                <option value="1 week">1 week</option>
                <option value="2 weeks">2 weeks</option>
                <option value="More than 1 month">More than 1 month</option>
                <option value="Chronic / Ongoing">Chronic / Ongoing</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Basic Vitals */}
        <div className="p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#1e536e] uppercase tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            <span>2. Baseline Vitals</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 inline-flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-rose-500" />
                <span>Temp (F)</span>
              </label>
              <input
                type="text"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="e.g. 98.6"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 inline-flex items-center gap-1">
                <HeartPulse className="w-3 h-3 text-red-500" />
                <span>BP (mmHg)</span>
              </label>
              <input
                type="text"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                placeholder="e.g. 120/80"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 inline-flex items-center gap-1">
                <Scale className="w-3 h-3 text-indigo-500" />
                <span>Weight (kg)</span>
              </label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 68"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                <span>SpO2 (%)</span>
              </label>
              <input
                type="text"
                value={spO2}
                onChange={(e) => setSpO2(e.target.value)}
                placeholder="e.g. 98"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                <span>Pulse (bpm)</span>
              </label>
              <input
                type="text"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="e.g. 74"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Other Vitals / Triage Observations (Optional)
            </label>
            <input
              type="text"
              value={otherVitals}
              onChange={(e) => setOtherVitals(e.target.value)}
              placeholder="e.g. Patient looks pale, mild dehydration..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 sm:p-6 bg-slate-50/70 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition text-center"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto justify-center bg-[#2ba4c7] hover:bg-[#228da8] text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Send to Doctor / Add to Queue</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {confirmationData && (
        <VisitConfirmationModal
          confirmationData={confirmationData}
          onClose={() => {
            const data = confirmationData;
            setConfirmationData(null);
            onQueueSuccess(data);
          }}
        />
      )}
    </div>
  );
};

interface VisitConfirmationModalProps {
  confirmationData: QueueItem;
  onClose: () => void;
}

const VisitConfirmationModal: React.FC<VisitConfirmationModalProps> = ({
  confirmationData,
  onClose,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen: true, onClose });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-confirmation-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 text-center space-y-4 max-h-[96dvh] overflow-y-auto touch-scroll animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h3
            id="visit-confirmation-title"
            className="text-lg font-bold text-slate-900"
          >
            Patient Added to Queue!
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            The patient is now registered in the doctor's live waiting queue.
          </p>
        </div>

        {/* Ticket Card */}
        <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2 text-left text-xs">
          <div className="flex items-center justify-between border-b border-sky-200/60 pb-2">
            <span className="text-sky-800 font-semibold uppercase tracking-wider text-[11px]">
              Queue Number
            </span>
            <span className="text-xl font-extrabold text-[#1e536e] font-mono">
              {confirmationData.queueNumber}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500">Patient:</span>
            <span className="font-bold text-slate-800">
              {confirmationData.patientName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
              {confirmationData.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Arrival Time:</span>
            <span className="font-mono text-slate-700">
              {confirmationData.arrivalTime}
            </span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#1e536e] hover:bg-[#18445a] text-white font-bold text-xs rounded-lg transition shadow-sm"
          >
            View Live Queue
          </button>
        </div>
      </div>
    </div>
  );
};
