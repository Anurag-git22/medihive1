import React, { useState, useMemo, useRef } from "react";
import {
  Stethoscope,
  Activity,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  ArrowRight,
  History,
  AlertCircle,
  Pill,
  Printer,
  Calendar,
  Upload,
  Image as ImageIcon,
  IndianRupee,
  X,
} from "lucide-react";
import {
  Patient,
  QueueItem,
  OPDRecord,
  PrescribedMedicine,
  DoctorProfile,
  ClinicSettings,
  OpdType,
  ChargeType,
  PaymentMode,
  DiscountType,
  PatientVitals,
} from "../../types";
import { generateNextOpdId } from "../../services/storage";
import { format, addDays, parseISO, differenceInDays } from "date-fns";
import { useToast } from "../common/Toast";
import { commonSymptomsList, medicineCatalog } from "../../services/mockData";

export interface ConsultationFormProps {
  mode: "modal" | "page";
  patient: Patient;
  queueItem?: QueueItem;
  doctor: DoctorProfile;
  clinic: ClinicSettings;
  existingPatients: Patient[];
  onSave: (
    record: OPDRecord,
    updatedPatient: Patient,
    autoCallNext?: boolean,
    generatePrescription?: boolean,
  ) => void;
  onCancel?: () => void;
  onPreviewPrescription?: (patient: Patient, record: OPDRecord) => void;
  onViewHistory?: (patient: Patient) => void;
  initialValues?: Partial<OPDRecord>;
}

const COMMON_DIAGNOSES = [
  "Acute Viral Upper Respiratory Infection",
  "Acute Bronchitis",
  "Gastroenteritis / Dysentery",
  "Hypertension (Essential)",
  "Type 2 Diabetes Mellitus",
  "Tension Headache / Migraine",
  "Allergic Rhinitis",
  "Urinary Tract Infection (UTI)",
  "Acid Peptic Disease / GERD",
  "Musculoskeletal Back Pain",
];

const COMMON_FREQUENCIES = [
  "1-0-1 (Twice daily)",
  "1-1-1 (Thrice daily)",
  "1-0-0 (Once daily morning)",
  "0-0-1 (Once daily bedtime)",
  "Once daily",
  "Twice daily",
  "Thrice daily",
  "SOS (As needed)",
];

const COMMON_DURATIONS = [
  "3 Days",
  "5 Days",
  "7 Days",
  "10 Days",
  "14 Days",
  "1 Month",
];

const COMMON_TIMINGS = [
  "After Food",
  "Before Food",
  "Empty Stomach",
  "With Warm Water",
  "At Bedtime",
];

const QUICK_FOLLOWUP_DAYS = [3, 5, 7, 10, 14, 30];

export const ConsultationForm: React.FC<ConsultationFormProps> = ({
  mode,
  patient,
  queueItem,
  doctor,
  clinic,
  existingPatients,
  onSave,
  onCancel,
  onPreviewPrescription,
  onViewHistory,
  initialValues,
}) => {
  const { showToast } = useToast();

  // Consultation Metadata
  const [opdType, setOpdType] = useState<OpdType>(
    initialValues?.opdType ||
      (patient.records && patient.records.length > 0
        ? "Follow-up"
        : "Consultation"),
  );
  const [chargeType, setChargeType] = useState<ChargeType>(
    initialValues?.chargeType ||
      (patient.records && patient.records.length > 0
        ? "Follow-up"
        : "First Visit"),
  );

  // Chief Complaint
  const [complaint, setComplaint] = useState(
    initialValues?.complaint || queueItem?.complaint || "Consultation",
  );

  // Vitals
  const initialVitals: PatientVitals = {
    bp:
      initialValues?.vitals?.bp ||
      queueItem?.vitals?.bp ||
      queueItem?.vitals?.bloodPressure ||
      "",
    temp:
      initialValues?.vitals?.temp ||
      queueItem?.vitals?.temp ||
      queueItem?.vitals?.temperature ||
      "",
    pulse: initialValues?.vitals?.pulse || queueItem?.vitals?.pulse || "",
    spo2:
      initialValues?.vitals?.spo2 ||
      queueItem?.vitals?.spo2 ||
      queueItem?.vitals?.spO2 ||
      "",
    weight:
      initialValues?.vitals?.weight ||
      queueItem?.vitals?.weight ||
      patient.weight ||
      "",
  };
  const [vitals, setVitals] = useState<PatientVitals>(initialVitals);
  const [showEditVitals, setShowEditVitals] = useState(false);

  // Clinical Diagnosis
  const [diagnosis, setDiagnosis] = useState(initialValues?.diagnosis || "");

  // Symptoms
  const [symptoms, setSymptoms] = useState<string[]>(() => {
    if (initialValues?.symptoms && initialValues.symptoms.length > 0)
      return initialValues.symptoms;
    if (queueItem?.symptoms && queueItem.symptoms.length > 0)
      return queueItem.symptoms;
    return [];
  });
  const [symptomInput, setSymptomInput] = useState("");
  const [showSymptomSuggestions, setShowSymptomSuggestions] = useState(false);
  const symptomInputRef = useRef<HTMLInputElement>(null);
  const symptomSuggestionsRef = useRef<HTMLDivElement>(null);

  // Uploaded clinical images
  const [uploadedImages, setUploadedImages] = useState<string[]>(
    initialValues?.uploadedImages || [],
  );

  // Clinical Findings & Notes
  const [clinicalNotes, setClinicalNotes] = useState(
    initialValues?.clinicalNotes || "",
  );
  const [panchakarmaNotes, setPanchakarmaNotes] = useState(
    initialValues?.panchakarmaNotes || "",
  );
  const [dietaryAdvice, setDietaryAdvice] = useState(
    initialValues?.dietaryAdvice || "",
  );
  const [tests, setTests] = useState(initialValues?.tests || "");

  // Prescriptions
  const [medicines, setMedicines] = useState<PrescribedMedicine[]>(() => {
    if (initialValues?.medicines && initialValues.medicines.length > 0) {
      return initialValues.medicines;
    }
    if (
      initialValues?.prescriptions &&
      initialValues.prescriptions.length > 0
    ) {
      return initialValues.prescriptions;
    }
    return [
      {
        id: `med-${Date.now()}`,
        name: "",
        dosage: "500mg",
        frequency: "1-0-1 (Twice daily)",
        timing: "After Food",
        duration: "5 Days",
        instructions: "With warm water",
      },
    ];
  });

  // Follow-up Days & Next Visit Date
  const defaultFollowUpDays = 5;
  const initialNextVisit =
    initialValues?.nextVisitDate ||
    format(addDays(new Date(), defaultFollowUpDays), "yyyy-MM-dd");
  const [nextVisitDate, setNextVisitDate] = useState<string>(initialNextVisit);
  const [followUpDays, setFollowUpDays] = useState<string>(
    String(defaultFollowUpDays),
  );

  // Billing Fields
  const defaultFee = doctor.consultationFee
    ? String(doctor.consultationFee)
    : "500";
  const [consultationFee, setConsultationFee] = useState<string>(
    initialValues?.consultationFee != null
      ? String(initialValues.consultationFee)
      : defaultFee,
  );
  const [medicineFee, setMedicineFee] = useState<string>(
    initialValues?.medicineFee != null ? String(initialValues.medicineFee) : "",
  );
  const [panchakarmaFee, setPanchakarmaFee] = useState<string>(
    initialValues?.panchakarmaFee != null
      ? String(initialValues.panchakarmaFee)
      : "",
  );
  const [discountType, setDiscountType] = useState<DiscountType>(
    initialValues?.discountType || "amount",
  );
  const [discountValue, setDiscountValue] = useState<string>(
    initialValues?.discountValue != null
      ? String(initialValues.discountValue)
      : "",
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    initialValues?.paymentMode || "Cash",
  );
  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Pending">(
    initialValues?.paymentStatus || "Paid",
  );

  // Sync followUpDays and nextVisitDate
  const handleFollowUpDaysChange = (days: number | string) => {
    const d = typeof days === "number" ? days : parseInt(days, 10);
    setFollowUpDays(String(days));
    if (!isNaN(d) && d > 0) {
      const calculated = format(addDays(new Date(), d), "yyyy-MM-dd");
      setNextVisitDate(calculated);
    } else if (days === "" || d === 0) {
      setNextVisitDate("");
    }
  };

  const handleNextVisitDateChange = (dateVal: string) => {
    setNextVisitDate(dateVal);
    if (dateVal) {
      try {
        const diff = differenceInDays(parseISO(dateVal), new Date());
        setFollowUpDays(diff >= 0 ? String(diff) : "0");
      } catch {
        // ignore invalid date
      }
    } else {
      setFollowUpDays("");
    }
  };

  // Autocomplete symptoms filter
  const filteredSymptoms = useMemo(() => {
    if (!symptomInput.trim()) return commonSymptomsList.slice(0, 8);
    const q = symptomInput.toLowerCase().trim();
    return commonSymptomsList.filter(
      (s) => s.toLowerCase().includes(q) && !symptoms.includes(s),
    );
  }, [symptomInput, symptoms]);

  const addSymptom = (sym: string) => {
    if (!symptoms.includes(sym)) {
      setSymptoms([...symptoms, sym]);
    }
    setSymptomInput("");
    setShowSymptomSuggestions(false);
  };

  const removeSymptom = (sym: string) => {
    setSymptoms(symptoms.filter((s) => s !== sym));
  };

  // Medicine operations
  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        id: `med-${Date.now()}-${prev.length}`,
        name: "",
        dosage: "500mg",
        frequency: "1-0-1 (Twice daily)",
        timing: "After Food",
        duration: "5 Days",
        instructions: "With warm water",
      },
    ]);
  };

  const handleRemoveMedicine = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMedicine = (
    index: number,
    field: keyof PrescribedMedicine,
    value: string,
  ) => {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // If user typed or picked a known medicine name, auto-fill standard properties
      if (field === "name" && value.trim()) {
        const match = medicineCatalog.find(
          (m) => m.name.toLowerCase() === value.trim().toLowerCase(),
        );
        if (match) {
          updated[index].dosage = match.defaultDosage;
          updated[index].frequency = match.defaultFrequency;
          updated[index].timing = match.defaultTiming;
          updated[index].instructions = match.instructions;
        }
      }
      return updated;
    });
  };

  // Total calculation
  const calculatedTotal = useMemo(() => {
    const subtotal =
      (Number(consultationFee) || 0) +
      (Number(medicineFee) || 0) +
      (Number(panchakarmaFee) || 0);
    let disc = Number(discountValue) || 0;
    if (discountType === "percentage") {
      disc = (subtotal * disc) / 100;
    }
    return Math.max(0, Math.round(subtotal - disc));
  }, [
    consultationFee,
    medicineFee,
    panchakarmaFee,
    discountType,
    discountValue,
  ]);

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImages((prev) => [
            ...prev,
            event.target!.result as string,
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
    showToast("Image attached to consultation", "info");
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Build OPD Record
  const buildOpdRecord = (): OPDRecord => {
    const opdId = initialValues?.id || generateNextOpdId(existingPatients);
    const today = format(new Date(), "yyyy-MM-dd");
    const validMedicines = medicines
      .filter((m) => m.name.trim().length > 0)
      .map((m) => ({
        ...m,
        instruction: m.instructions || m.instruction || "",
      }));

    return {
      id: opdId,
      patientId: patient.id,
      visitDate: today,
      opdType,
      chargeType,
      complaint: complaint.trim() || "Consultation",
      symptoms: symptoms.length > 0 ? symptoms : ["General Consultation"],
      vitals: {
        ...vitals,
        temperature: vitals.temp,
        bloodPressure: vitals.bp,
        spO2: vitals.spo2,
      },
      uploadedImages,
      diagnosis: diagnosis.trim() || "General Consultation",
      clinicalNotes: clinicalNotes.trim(),
      panchakarmaNotes: panchakarmaNotes.trim(),
      dietaryAdvice: dietaryAdvice.trim(),
      tests: tests.trim(),
      medicines: validMedicines,
      prescriptions: validMedicines,
      nextVisitDate: nextVisitDate || undefined,
      consultationFee: Number(consultationFee) || 0,
      medicineFee: Number(medicineFee) || 0,
      panchakarmaFee: Number(panchakarmaFee) || 0,
      discountType,
      discountValue: Number(discountValue) || 0,
      totalFee: calculatedTotal,
      paymentMode,
      paymentStatus,
      createdAt: initialValues?.createdAt || new Date().toISOString(),
    };
  };

  const buildUpdatedPatient = (record: OPDRecord): Patient => {
    const today = format(new Date(), "yyyy-MM-dd");
    const existingRecords = patient.records || [];
    const isNewRecord = !existingRecords.some((r) => r.id === record.id);
    const updatedRecords = isNewRecord
      ? [record, ...existingRecords]
      : existingRecords.map((r) => (r.id === record.id ? record : r));

    return {
      ...patient,
      lastVisitDate: today,
      totalVisits: updatedRecords.length,
      records: updatedRecords,
      weight: vitals.weight || patient.weight,
    };
  };

  const handleComplete = (
    autoCallNext: boolean = false,
    generatePrescription: boolean = false,
  ) => {
    if (!diagnosis.trim()) {
      showToast("Please enter a clinical diagnosis before saving", "error");
      return;
    }

    const record = buildOpdRecord();
    const updatedPatient = buildUpdatedPatient(record);
    onSave(record, updatedPatient, autoCallNext, generatePrescription);
    showToast(
      autoCallNext
        ? "Consultation saved! Calling next patient into cabin."
        : "Consultation saved successfully.",
      "success",
    );
  };

  const handlePreview = () => {
    if (!diagnosis.trim()) {
      showToast(
        "Please enter a clinical diagnosis to preview prescription",
        "error",
      );
      return;
    }
    const record = buildOpdRecord();
    if (onPreviewPrescription) {
      onPreviewPrescription(patient, record);
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient & Triage Header */}
      <div className="bg-gradient-to-r from-sky-50 to-slate-50 border border-sky-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-200/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#194358] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {queueItem ? queueItem.queueNumber : patient.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                  {patient.fullName}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold">
                  {patient.id}
                </span>
                {queueItem && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                    Token #{queueItem.queueNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {patient.age} yrs • {patient.gender} • Mobile: {patient.mobile}
                {patient.bloodGroup && ` • Blood Group: ${patient.bloodGroup}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onViewHistory && (
              <button
                type="button"
                onClick={() => onViewHistory(patient)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5 shadow-2xs"
              >
                <History className="w-3.5 h-3.5 text-[#194358]" />
                <span>
                  Visit History ({patient.records ? patient.records.length : 0})
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowEditVitals(!showEditVitals)}
              className="px-3 py-1.5 rounded-lg bg-sky-100/80 hover:bg-sky-200 text-sky-900 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>
                {showEditVitals ? "Close Vitals Editor" : "Edit Vitals"}
              </span>
            </button>
          </div>
        </div>

        {/* Triage Info Banner / Vitals */}
        <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          {/* Chief Complaint */}
          <div className="space-y-1">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              Chief Complaint
            </span>
            <input
              type="text"
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. Fever with chills, persistent dry cough"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-1 focus:ring-[#194358] focus:outline-none"
            />
          </div>

          {/* Vitals Display / Quick Readout */}
          <div className="lg:col-span-2 space-y-1">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
              Patient Vitals
            </span>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-sky-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">
                  BP
                </span>
                <span className="text-xs font-extrabold text-slate-800">
                  {vitals.bp || "—"}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-sky-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">
                  TEMP
                </span>
                <span className="text-xs font-extrabold text-slate-800">
                  {vitals.temp ? `${vitals.temp}°F` : "—"}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-sky-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">
                  PULSE
                </span>
                <span className="text-xs font-extrabold text-slate-800">
                  {vitals.pulse ? `${vitals.pulse} bpm` : "—"}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-sky-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">
                  SPO2
                </span>
                <span className="text-xs font-extrabold text-slate-800">
                  {vitals.spo2 ? `${vitals.spo2}%` : "—"}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-sky-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">
                  WEIGHT
                </span>
                <span className="text-xs font-extrabold text-slate-800">
                  {vitals.weight ? `${vitals.weight} kg` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Vitals Editor */}
        {showEditVitals && (
          <div className="mt-4 p-3.5 bg-white border border-sky-200 rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-3 animate-in fade-in duration-150">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Blood Pressure
              </label>
              <input
                type="text"
                placeholder="120/80"
                value={vitals.bp || ""}
                onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-[#194358]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Temperature (°F)
              </label>
              <input
                type="text"
                placeholder="98.6"
                value={vitals.temp || ""}
                onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-[#194358]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Pulse (bpm)
              </label>
              <input
                type="text"
                placeholder="72"
                value={vitals.pulse || ""}
                onChange={(e) =>
                  setVitals({ ...vitals, pulse: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-[#194358]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                SpO2 (%)
              </label>
              <input
                type="text"
                placeholder="98"
                value={vitals.spo2 || ""}
                onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-[#194358]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Weight (kg)
              </label>
              <input
                type="text"
                placeholder="68"
                value={vitals.weight || ""}
                onChange={(e) =>
                  setVitals({ ...vitals, weight: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-[#194358]"
              />
            </div>
          </div>
        )}

        {/* Alerts for Allergies / Medical History */}
        {(patient.allergies || patient.medicalHistory) && (
          <div className="mt-3 pt-2.5 border-t border-sky-200/60 flex flex-wrap gap-3 text-xs">
            {patient.allergies && (
              <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Allergies: {patient.allergies}</span>
              </span>
            )}
            {patient.medicalHistory && (
              <span className="text-slate-700 font-medium bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                <strong>Medical History:</strong> {patient.medicalHistory}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Visit Classification (OPD & Charge Type) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
            Visit / OPD Type
          </label>
          <select
            value={opdType}
            onChange={(e) => setOpdType(e.target.value as OpdType)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#194358] focus:bg-white font-medium"
          >
            <option value="Consultation">Consultation</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Therapy">Therapy / Panchakarma</option>
            <option value="Routine Checkup">Routine Checkup</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
            Charge Type
          </label>
          <select
            value={chargeType}
            onChange={(e) => setChargeType(e.target.value as ChargeType)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#194358] focus:bg-white font-medium"
          >
            <option value="First Visit">First Visit</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Special Therapy">Special Therapy</option>
            <option value="Emergency Consultation">
              Emergency Consultation
            </option>
          </select>
        </div>
      </div>

      {/* Clinical Diagnosis Section */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-[#194358]" />
            <span>Clinical Diagnosis</span>
            <span className="text-rose-500">*</span>
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            Required for valid prescription
          </span>
        </label>
        <input
          type="text"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Enter primary clinical diagnosis (e.g. Acute Viral URI, Type 2 Diabetes)..."
          className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#194358] focus:bg-white transition"
        />

        {/* Quick Common Diagnosis Chips */}
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
            Quick Suggestions:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_DIAGNOSES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDiagnosis(item)}
                className={`px-2.5 py-1 text-xs rounded-lg transition border ${
                  diagnosis === item
                    ? "bg-[#194358] text-white border-[#194358] font-semibold"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                + {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Symptoms Tagging Section */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-[#194358]" />
          <span>Patient Symptoms</span>
        </label>

        {/* Active Symptoms Chips */}
        <div className="flex flex-wrap gap-2 min-h-[36px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          {symptoms.length === 0 ? (
            <span className="text-xs text-slate-400 italic">
              No symptoms added yet. Type below or select from suggestions.
            </span>
          ) : (
            symptoms.map((sym) => (
              <span
                key={sym}
                className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 text-sky-900 border border-sky-200 rounded-lg text-xs font-semibold"
              >
                {sym}
                <button
                  type="button"
                  onClick={() => removeSymptom(sym)}
                  className="hover:text-rose-600 p-0.5 rounded transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Symptom Autocomplete Input */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <input
              ref={symptomInputRef}
              type="text"
              value={symptomInput}
              onChange={(e) => {
                setSymptomInput(e.target.value);
                setShowSymptomSuggestions(true);
              }}
              onFocus={() => setShowSymptomSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && symptomInput.trim()) {
                  e.preventDefault();
                  addSymptom(symptomInput.trim());
                }
              }}
              placeholder="Search or add symptoms (press Enter)..."
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#194358] focus:outline-none"
            />
            {symptomInput.trim() && (
              <button
                type="button"
                onClick={() => addSymptom(symptomInput.trim())}
                className="px-3 py-2 bg-[#194358] text-white text-xs font-semibold rounded-lg hover:bg-[#143647] transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )}
          </div>

          {showSymptomSuggestions && filteredSymptoms.length > 0 && (
            <div
              ref={symptomSuggestionsRef}
              className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-48 overflow-y-auto"
            >
              <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                Suggested Symptoms:
              </p>
              <div className="flex flex-wrap gap-1.5 p-1">
                {filteredSymptoms.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSymptom(s)}
                    className="px-2.5 py-1 text-xs rounded-md bg-slate-50 hover:bg-sky-50 hover:text-sky-800 text-slate-700 border border-slate-200 transition text-left"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prescriptions (Rx) Section */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Pill className="w-4 h-4 text-[#194358]" />
            <span>Prescription (Rx)</span>
          </label>
          <button
            type="button"
            onClick={handleAddMedicine}
            className="px-3.5 py-1.5 text-xs font-bold text-[#194358] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        </div>

        <div className="space-y-3">
          {medicines.map((med, idx) => (
            <div
              key={med.id || idx}
              className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2.5 transition hover:border-slate-300"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                {/* Medicine Name */}
                <div className="md:col-span-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    list={`med-catalog-list-${idx}`}
                    placeholder="e.g. Paracetamol, Amoxicillin..."
                    value={med.name}
                    onChange={(e) =>
                      handleUpdateMedicine(idx, "name", e.target.value)
                    }
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#194358]"
                  />
                  <datalist id={`med-catalog-list-${idx}`}>
                    {medicineCatalog.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.defaultDosage} • {item.defaultFrequency}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Dosage */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Dosage
                  </label>
                  <input
                    type="text"
                    placeholder="500mg / 1 tab"
                    value={med.dosage}
                    onChange={(e) =>
                      handleUpdateMedicine(idx, "dosage", e.target.value)
                    }
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#194358]"
                  />
                </div>

                {/* Frequency */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Frequency
                  </label>
                  <select
                    value={med.frequency}
                    onChange={(e) =>
                      handleUpdateMedicine(idx, "frequency", e.target.value)
                    }
                    className="w-full px-2 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#194358]"
                  >
                    {COMMON_FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Timing */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Timing
                  </label>
                  <select
                    value={med.timing || "After Food"}
                    onChange={(e) =>
                      handleUpdateMedicine(idx, "timing", e.target.value)
                    }
                    className="w-full px-2 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#194358]"
                  >
                    {COMMON_TIMINGS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div className="md:col-span-2 flex items-center gap-1.5">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Duration
                    </label>
                    <select
                      value={med.duration}
                      onChange={(e) =>
                        handleUpdateMedicine(idx, "duration", e.target.value)
                      }
                      className="w-full px-2 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#194358]"
                    >
                      {COMMON_DURATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {medicines.length > 1 && (
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <input
                  type="text"
                  placeholder="Special instructions (e.g. Take with warm water, avoid cold drinks)..."
                  value={med.instructions || med.instruction || ""}
                  onChange={(e) => {
                    handleUpdateMedicine(idx, "instructions", e.target.value);
                    handleUpdateMedicine(idx, "instruction", e.target.value);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#194358]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Notes, Panchakarma, Dietary, Lab Tests & Images */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#194358]" />
          <span>Clinical Findings, Advice & Investigations</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Clinical Findings & Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Clinical Findings & General Advice
            </label>
            <textarea
              rows={3}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Enter patient observations, clinical findings, precautions, and general advice..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#194358] focus:bg-white transition"
            />
          </div>

          {/* Lab Investigations / Diagnostic Tests */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Lab Investigations & Tests Recommended
            </label>
            <textarea
              rows={3}
              value={tests}
              onChange={(e) => setTests(e.target.value)}
              placeholder="e.g. CBC with ESR, Lipid Profile, Thyroid Panel, Chest X-Ray (PA View), USG Abdomen..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#194358] focus:bg-white transition"
            />
          </div>

          {/* Panchakarma / Special Therapy Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Panchakarma / Special Therapy Instructions
            </label>
            <textarea
              rows={2}
              value={panchakarmaNotes}
              onChange={(e) => setPanchakarmaNotes(e.target.value)}
              placeholder="e.g. Shirodhara 7 days, Abhyanga with Mahanarayan Taila, Nasya..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#194358] focus:bg-white transition"
            />
          </div>

          {/* Dietary Advice */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Dietary & Lifestyle Advice (Pathya / Apathya)
            </label>
            <textarea
              rows={2}
              value={dietaryAdvice}
              onChange={(e) => setDietaryAdvice(e.target.value)}
              placeholder="e.g. Light warm diet, avoid oily/spicy foods, drink boiled water, regular sleep..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#194358] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Clinical Image Attachments */}
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Clinical Photos / Skin Lesion Images</span>
            </label>
            <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-[#194358] hover:bg-sky-50 border border-sky-200 rounded-lg transition flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" />
              <span>Attach Image</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {uploadedImages.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-xs"
                >
                  <img
                    src={img}
                    alt={`Clinical upload ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 transition"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Follow-up / Next Visit Section */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-[#194358]" />
          <span>Follow-up & Next Visit Date</span>
        </label>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Quick select day pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 font-semibold mr-1">
              Quick Select:
            </span>
            {QUICK_FOLLOWUP_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => handleFollowUpDaysChange(days)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  followUpDays === String(days)
                    ? "bg-[#194358] text-white border-[#194358] shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                +{days} Days
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs text-slate-500 font-semibold">
              Or Date:
            </span>
            <input
              type="date"
              value={nextVisitDate}
              onChange={(e) => handleNextVisitDateChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#194358] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Billing & Payment Section */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-[#194358]" />
          <span>Billing Breakdown & Payment Details</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Consultation Fee */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Consultation Fee (₹)
            </label>
            <input
              type="number"
              min="0"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#194358] focus:bg-white"
            />
          </div>

          {/* Medicine Fee */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Medicine Fee (₹)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={medicineFee}
              onChange={(e) => setMedicineFee(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#194358] focus:bg-white"
            />
          </div>

          {/* Panchakarma Fee */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Therapy Fee (₹)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={panchakarmaFee}
              onChange={(e) => setPanchakarmaFee(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#194358] focus:bg-white"
            />
          </div>

          {/* Discount Type */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Discount Type
            </label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#194358] font-medium"
            >
              <option value="amount">Fixed Amount (₹)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>

          {/* Discount Value */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Discount Value
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#194358] focus:bg-white"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Payment Mode
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#194358] font-medium"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / QR</option>
              <option value="Card">Card</option>
              <option value="Net Banking">Net Banking</option>
            </select>
          </div>
        </div>

        {/* Live Total Banner */}
        <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600 space-y-0.5">
            <span className="font-semibold text-slate-700">
              Billing Summary:{" "}
            </span>
            <span>
              Consultation: ₹{Number(consultationFee) || 0}
              {Number(medicineFee) > 0 && ` + Meds: ₹${medicineFee}`}
              {Number(panchakarmaFee) > 0 && ` + Therapy: ₹${panchakarmaFee}`}
              {Number(discountValue) > 0 &&
                ` - Discount (${discountType === "percentage" ? `${discountValue}%` : `₹${discountValue}`})`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Total Payable
              </span>
              <span className="text-lg font-black text-slate-900">
                ₹{calculatedTotal}
              </span>
            </div>

            <select
              value={paymentStatus}
              onChange={(e) =>
                setPaymentStatus(e.target.value as "Paid" | "Pending")
              }
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                paymentStatus === "Paid"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-amber-50 text-amber-800 border-amber-300"
              }`}
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Form Action Controls */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onPreviewPrescription && (
            <button
              type="button"
              onClick={handlePreview}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Preview Prescription</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition text-center"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={() => handleComplete(false, false)}
            className="px-4 py-2.5 text-xs font-bold text-[#194358] bg-sky-100 hover:bg-sky-200 rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {mode === "modal" ? "Save Complete" : "Save Consultation"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleComplete(false, true)}
            className="px-4 py-2.5 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition flex items-center justify-center gap-1.5"
            title="Save consultation and open printable prescription letterhead"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            <span>Save & Print Rx</span>
          </button>

          {mode === "page" && (
            <button
              type="button"
              onClick={() => handleComplete(false, true)}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Save & Generate Prescription</span>
            </button>
          )}

          {mode === "modal" && (
            <button
              type="button"
              onClick={() => handleComplete(true, false)}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              <span>Complete & Call Next Patient</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
