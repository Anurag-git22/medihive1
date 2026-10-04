import React, { useState, useMemo } from "react";
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
  Sparkles,
  Check,
  X,
  RotateCcw,
  Search,
  Zap,
  Plus,
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

export interface SymptomCategory {
  id: string;
  label: string;
  icon: string;
  items: string[];
}

export const SYMPTOM_CATEGORIES: SymptomCategory[] = [
  {
    id: "frequent",
    label: "Frequent / Common",
    icon: "⭐",
    items: [
      "Fever",
      "Cold / Runny Nose",
      "Cough",
      "Headache",
      "Body Pain",
      "Stomach Pain",
      "Weakness / Fatigue",
      "Acidity / Heartburn",
      "Nausea / Vomiting",
      "Loose Motions / Diarrhea",
      "Sore Throat",
      "Routine Checkup",
    ],
  },
  {
    id: "general",
    label: "General & Fever",
    icon: "🌡️",
    items: [
      "Fever",
      "High Fever with Chills",
      "Headache",
      "Body Pain",
      "Weakness / Fatigue",
      "Dizziness / Giddiness",
      "Loss of Appetite",
      "Weight Loss",
      "Sleep Disturbance / Insomnia",
      "High Blood Pressure",
    ],
  },
  {
    id: "respiratory",
    label: "Respiratory & ENT",
    icon: "🫁",
    items: [
      "Cold / Runny Nose",
      "Dry Cough",
      "Productive / Wet Cough",
      "Sore Throat",
      "Breathlessness",
      "Chest Congestion",
      "Frequent Sneezing",
      "Ear Ache / Discharge",
      "Eye Redness / Itching",
    ],
  },
  {
    id: "digestive",
    label: "Digestive & Gastro",
    icon: "🥣",
    items: [
      "Acidity / Heartburn",
      "Stomach Pain",
      "Nausea / Vomiting",
      "Loose Motions / Diarrhea",
      "Constipation",
      "Indigestion / Gas",
      "Abdominal Bloating",
      "Burning Sensation",
      "Piles / Anal Discomfort",
    ],
  },
  {
    id: "skin",
    label: "Skin & Allergy",
    icon: "🩹",
    items: [
      "Skin Itching / Pruritus",
      "Skin Rash / Redness",
      "Allergic Reaction",
      "Fungal Infection / Ringworm",
      "Boils / Abscess",
      "Swelling / Edema",
      "Wound / Laceration",
      "Hair Fall",
    ],
  },
  {
    id: "ortho",
    label: "Pain & Ortho",
    icon: "🦴",
    items: [
      "Joint Pain",
      "Low Back Pain",
      "Knee Pain",
      "Neck / Cervical Pain",
      "Shoulder Pain",
      "Muscle Cramp / Spasm",
      "Heel Pain",
      "Sprain / Twist",
    ],
  },
  {
    id: "services",
    label: "OPD Services & Checks",
    icon: "📋",
    items: [
      "Routine Checkup",
      "BP / Blood Pressure Check",
      "Blood Sugar Check",
      "Report Review / Consultation",
      "Follow-up Consultation",
      "Injection / IV Fluid",
      "Dressing / Bandage",
      "Medical Certificate",
    ],
  },
];

interface QuickPreset {
  id: string;
  name: string;
  emoji: string;
  symptoms: string[];
  duration: string;
  complaint: string;
  vitals?: {
    temperature?: string;
    bloodPressure?: string;
    spO2?: string;
    pulse?: string;
  };
}

const QUICK_VISIT_PRESETS: QuickPreset[] = [
  {
    id: "fever-cold",
    name: "Fever & Cold",
    emoji: "🤒",
    symptoms: ["Fever", "Cold / Runny Nose", "Headache"],
    duration: "1-2 days",
    complaint: "Acute fever with running nose and headache since 2 days",
    vitals: {
      temperature: "100.2",
      bloodPressure: "120/80",
      spO2: "98",
      pulse: "84",
    },
  },
  {
    id: "cough-throat",
    name: "Cough & Throat",
    emoji: "🤧",
    symptoms: ["Cough", "Sore Throat", "Body Pain"],
    duration: "3-5 days",
    complaint: "Persistent cough and sore throat with body ache",
    vitals: {
      temperature: "99.0",
      bloodPressure: "120/80",
      spO2: "98",
      pulse: "78",
    },
  },
  {
    id: "acidity-gas",
    name: "Acidity & Gas",
    emoji: "🤢",
    symptoms: ["Acidity / Heartburn", "Stomach Pain", "Indigestion / Gas"],
    duration: "1-2 days",
    complaint: "Severe acidity, heartburn and stomach bloating",
    vitals: { bloodPressure: "120/80", pulse: "76" },
  },
  {
    id: "loose-motions",
    name: "Loose Motions",
    emoji: "💧",
    symptoms: [
      "Loose Motions / Diarrhea",
      "Stomach Pain",
      "Weakness / Fatigue",
    ],
    duration: "1-2 days",
    complaint: "Watery stools with stomach cramps and weakness",
    vitals: { bloodPressure: "110/70", pulse: "88" },
  },
  {
    id: "bp-check",
    name: "Routine BP Check",
    emoji: "🩺",
    symptoms: ["Routine Checkup", "BP / Blood Pressure Check"],
    duration: "Since today",
    complaint:
      "Routine blood pressure measurement and general health checkup",
    vitals: { bloodPressure: "126/82", spO2: "98", pulse: "74" },
  },
  {
    id: "report-review",
    name: "Report Review",
    emoji: "📋",
    symptoms: ["Report Review / Consultation", "Follow-up Consultation"],
    duration: "1 week",
    complaint:
      "Follow-up visit to show investigation and lab test reports to Doctor",
  },
  {
    id: "bodyache-fatigue",
    name: "Bodyache & Fatigue",
    emoji: "🤕",
    symptoms: ["Body Pain", "Weakness / Fatigue"],
    duration: "3-5 days",
    complaint: "Generalized body ache and persistent weakness since few days",
    vitals: { bloodPressure: "116/76", pulse: "72" },
  },
];

const DURATION_PRESETS = [
  "Since today",
  "1-2 days",
  "3-5 days",
  "1 week",
  "2 weeks",
  "1 month+",
  "Chronic / Ongoing",
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

  // Active Category filter for symptom chips
  const [activeCategory, setActiveCategory] = useState<string>("frequent");
  const [symptomSearch, setSymptomSearch] = useState<string>("");

  // Complaint & Symptoms
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptomInput, setCustomSymptomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [symptomDuration, setSymptomDuration] = useState("1-2 days");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Vitals (Pre-populate weight from patient record if already known)
  const [temperature, setTemperature] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [weight, setWeight] = useState(patient.weight || "");
  const [spO2, setSpO2] = useState("");
  const [pulse, setPulse] = useState("");
  const [otherVitals, setOtherVitals] = useState("");

  // Confirmation Modal
  const [confirmationData, setConfirmationData] = useState<QueueItem | null>(
    null,
  );

  // Toggle symptom on/off
  const toggleSymptom = (sym: string) => {
    setActivePresetId(null);
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  // Add custom symptom tag
  const handleAddCustomSymptom = () => {
    const trimmed = customSymptomInput.trim();
    if (!trimmed) return;
    if (!selectedSymptoms.includes(trimmed)) {
      setSelectedSymptoms([...selectedSymptoms, trimmed]);
    }
    setCustomSymptomInput("");
    setShowCustomInput(false);
  };

  // 1-Click Preset applier
  const handleApplyPreset = (preset: QuickPreset) => {
    setActivePresetId(preset.id);
    setSelectedSymptoms(preset.symptoms);
    setSymptomDuration(preset.duration);
    setComplaint(preset.complaint);

    if (preset.vitals) {
      if (preset.vitals.temperature && !temperature) {
        setTemperature(preset.vitals.temperature);
      }
      if (preset.vitals.bloodPressure && !bloodPressure) {
        setBloodPressure(preset.vitals.bloodPressure);
      }
      if (preset.vitals.spO2 && !spO2) {
        setSpO2(preset.vitals.spO2);
      }
      if (preset.vitals.pulse && !pulse) {
        setPulse(preset.vitals.pulse);
      }
    }
    showToast(`Quick template applied: "${preset.name}"`, "info");
  };

  // Auto-compose complaint text from currently selected symptoms and duration
  const handleAutoComposeComplaint = () => {
    if (selectedSymptoms.length === 0) {
      showToast("Select at least one symptom to auto-compose complaint.", "info");
      return;
    }
    const symptomsText = selectedSymptoms.join(", ");
    const durationText = symptomDuration
      ? ` since ${symptomDuration.toLowerCase().replace("since ", "")}`
      : "";
    const composed = `Patient complains of ${symptomsText}${durationText}.`;
    setComplaint(composed);
    showToast("Chief complaint auto-composed!", "success");
  };

  // Clear all symptoms
  const handleClearAllSymptoms = () => {
    setSelectedSymptoms([]);
    setActivePresetId(null);
  };

  // 1-Click Normal Baseline Vitals Filler
  const handleFillNormalVitals = () => {
    setTemperature("98.4");
    setBloodPressure("120/80");
    setSpO2("98");
    setPulse("74");
    if (!weight && patient.weight) {
      setWeight(patient.weight);
    }
    showToast("Healthy baseline vitals filled (98.4°F, 120/80, 98%, 74 bpm)", "success");
  };

  const handleClearVitals = () => {
    setTemperature("");
    setBloodPressure("");
    setSpO2("");
    setPulse("");
    setOtherVitals("");
  };

  // Compute displayed symptom list based on category & search filter
  const displayedCategoryItems = useMemo(() => {
    const currentCategoryObj = SYMPTOM_CATEGORIES.find(
      (c) => c.id === activeCategory,
    );
    let items = currentCategoryObj
      ? currentCategoryObj.items
      : SYMPTOM_CATEGORIES[0].items;

    if (symptomSearch.trim()) {
      const q = symptomSearch.toLowerCase().trim();
      // Search across ALL categories when search query is typed!
      const allUniqueItems = Array.from(
        new Set(SYMPTOM_CATEGORIES.flatMap((c) => c.items)),
      );
      items = allUniqueItems.filter((item) =>
        item.toLowerCase().includes(q),
      );
    }
    return items;
  }, [activeCategory, symptomSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!complaint.trim() && selectedSymptoms.length === 0) {
      showToast(
        "Please select at least one symptom or specify the main complaint.",
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
      complaint.trim() ||
      selectedSymptoms.join(", ") ||
      "General Consultation";

    const { newQueueItem } = onSubmitVisit({
      complaint: finalComplaint,
      symptoms: selectedSymptoms,
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
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-5 page-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>Patient Visit & Triage</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600" />
                Quick-Tap Mode
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Zero-typing quick chips for patient complaints and basic vitals
            </p>
          </div>
        </div>
      </div>

      {/* Patient Summary Strip */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1e536e] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {patient.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {patient.fullName}
              </h3>
              <span className="text-xs bg-slate-100 font-mono px-2 py-0.5 rounded text-slate-700 font-semibold border border-slate-200">
                {patient.id}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {patient.gender} • {patient.age} yrs • Mobile:{" "}
              <span className="font-mono text-slate-700 font-medium">
                {patient.mobile}
              </span>
              {patient.bloodGroup && (
                <span className="ml-2 px-1.5 py-0.2 rounded bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                  {patient.bloodGroup}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-4">
          <div>
            <span className="block text-[11px] uppercase font-semibold text-slate-400">
              Visit Date & Time
            </span>
            <span className="font-bold text-slate-700 font-mono">
              {date} • {time}
            </span>
          </div>
        </div>
      </div>

      {/* SUPER-FAST VISIT TEMPLATES BAR */}
      <div className="bg-gradient-to-r from-sky-50 via-indigo-50/40 to-teal-50 border border-sky-200/80 rounded-xl p-3.5 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e536e]">
            <Sparkles className="w-4 h-4 text-sky-600 animate-pulse" />
            <span>1-Click Common OPD Templates (Least Typing)</span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Tap a preset to auto-fill symptoms, duration & complaint
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {QUICK_VISIT_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isActive
                    ? "bg-[#1e536e] text-white ring-2 ring-[#1e536e]/40 shadow-sm"
                    : "bg-white text-slate-700 border border-slate-200/90 hover:border-sky-300 hover:bg-sky-50/60"
                }`}
              >
                <span>{preset.emoji}</span>
                <span>{preset.name}</span>
                {isActive && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Visit Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xs border border-slate-200/90 divide-y divide-slate-100 overflow-hidden"
      >
        {/* SECTION 1: Symptoms & Complaints */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#1e536e] uppercase tracking-wide flex items-center gap-2">
              <span>1. Chief Complaints & Symptoms Library</span>
            </h2>

            {/* Selected Counter & Clear All */}
            {selectedSymptoms.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  {selectedSymptoms.length} selected
                </span>
                <button
                  type="button"
                  onClick={handleClearAllSymptoms}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Search & Category Filter Navigation */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Live search input */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={symptomSearch}
                  onChange={(e) => setSymptomSearch(e.target.value)}
                  placeholder="Quick filter symptom (e.g. fever, headache, back pain)..."
                  className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
                {symptomSearch && (
                  <button
                    type="button"
                    onClick={() => setSymptomSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Add Custom Symptom Button */}
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                  <span>Custom Symptom</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="text"
                    value={customSymptomInput}
                    onChange={(e) => setCustomSymptomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomSymptom();
                      }
                    }}
                    placeholder="Enter custom symptom..."
                    className="px-2.5 py-1.5 text-xs bg-white border border-sky-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSymptom}
                    className="px-2.5 py-1.5 bg-[#1e536e] text-white text-xs font-bold rounded-lg hover:bg-[#18445a]"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomSymptomInput("");
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Category tabs */}
            {!symptomSearch && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll scrollbar-none">
                {SYMPTOM_CATEGORIES.map((cat) => {
                  const isCatActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition whitespace-nowrap flex items-center gap-1 cursor-pointer shrink-0 ${
                        isCatActive
                          ? "bg-[#1e536e] text-white shadow-xs font-semibold"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      }`}
                    >
                      <span className="text-[11px]">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick-Click Symptom Chips Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
            {displayedCategoryItems.map((illness) => {
              const isChecked = selectedSymptoms.includes(illness);
              return (
                <button
                  key={illness}
                  type="button"
                  onClick={() => toggleSymptom(illness)}
                  className={`px-3 py-2 text-xs font-medium rounded-xl border text-left transition flex items-center justify-between gap-1.5 cursor-pointer ${
                    isChecked
                      ? "bg-sky-50 border-sky-400 text-sky-950 font-semibold shadow-xs ring-1 ring-sky-300"
                      : "bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 border-slate-200 text-slate-700"
                  }`}
                >
                  <span className="truncate">{illness}</span>
                  <span
                    className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition ${
                      isChecked
                        ? "bg-sky-600 text-white"
                        : "border border-slate-300 bg-white"
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Currently Selected Symptoms Pills Display */}
          {selectedSymptoms.length > 0 && (
            <div className="pt-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Active Selection ({selectedSymptoms.length})
              </span>
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                {selectedSymptoms.map((sym) => (
                  <span
                    key={sym}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 border border-sky-300 text-xs font-medium"
                  >
                    <span>{sym}</span>
                    <button
                      type="button"
                      onClick={() => toggleSymptom(sym)}
                      className="hover:text-rose-700 text-sky-700 cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* DURATION & COMPLAINT SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
            {/* 1-Click Duration Chips */}
            <div className="sm:col-span-3 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Duration of Symptoms (Tap to Select)</span>
                </span>
                <span className="text-[11px] text-indigo-700 font-mono font-bold">
                  {symptomDuration}
                </span>
              </label>

              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((dur) => {
                  const isSelected = symptomDuration === dur;
                  return (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setSymptomDuration(dur)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white font-bold shadow-xs ring-1 ring-indigo-400"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {dur}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Complaint Textarea with Auto-Compose Button */}
            <div className="sm:col-span-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Chief Complaint Summary for Doctor
                </label>
                <button
                  type="button"
                  onClick={handleAutoComposeComplaint}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-sky-600" />
                  <span>Auto-compose from Symptoms</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="e.g. Acute high fever with persistent dry cough and body ache since 2 days..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Basic Vitals with 1-Tap Presets */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#1e536e] uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>2. Baseline Vitals (Optional / Quick Tap)</span>
            </h2>

            {/* 1-Tap Normal Baseline Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFillNormalVitals}
                className="text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Fill Normal Baseline</span>
              </button>
              {(temperature || bloodPressure || spO2 || pulse) && (
                <button
                  type="button"
                  onClick={handleClearVitals}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* Temperature */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 inline-flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-rose-500" />
                <span>Temp (°F)</span>
              </label>
              <input
                type="text"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="e.g. 98.4"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {/* Quick temp chips */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[
                  { l: "98.4°", v: "98.4" },
                  { l: "99.5°", v: "99.5" },
                  { l: "101°", v: "101.0" },
                ].map((item) => (
                  <button
                    key={item.v}
                    type="button"
                    onClick={() => setTemperature(item.v)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200"
                  >
                    {item.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Blood Pressure */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 inline-flex items-center gap-1">
                <HeartPulse className="w-3 h-3 text-red-500" />
                <span>BP (mmHg)</span>
              </label>
              <input
                type="text"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                placeholder="e.g. 120/80"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {/* Quick BP chips */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {["120/80", "110/70", "130/85", "140/90"].map((bpVal) => (
                  <button
                    key={bpVal}
                    type="button"
                    onClick={() => setBloodPressure(bpVal)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200"
                  >
                    {bpVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 inline-flex items-center gap-1">
                <Scale className="w-3 h-3 text-indigo-500" />
                <span>Weight (kg)</span>
              </label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 68"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {patient.weight && patient.weight !== weight && (
                <button
                  type="button"
                  onClick={() => setWeight(patient.weight || "")}
                  className="text-[10px] text-indigo-600 underline block"
                >
                  Last: {patient.weight}kg
                </button>
              )}
            </div>

            {/* SpO2 */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-600">
                <span>SpO2 (%)</span>
              </label>
              <input
                type="text"
                value={spO2}
                onChange={(e) => setSpO2(e.target.value)}
                placeholder="e.g. 98"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex gap-1 pt-0.5">
                {["99%", "98%", "95%"].map((spVal) => (
                  <button
                    key={spVal}
                    type="button"
                    onClick={() => setSpO2(spVal.replace("%", ""))}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200"
                  >
                    {spVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Pulse */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-600">
                <span>Pulse (bpm)</span>
              </label>
              <input
                type="text"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="e.g. 74"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex gap-1 pt-0.5">
                {["72", "80", "90"].map((pVal) => (
                  <button
                    key={pVal}
                    type="button"
                    onClick={() => setPulse(pVal)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                  >
                    {pVal}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Other Triage Observations (Optional)
            </label>
            <input
              type="text"
              value={otherVitals}
              onChange={(e) => setOtherVitals(e.target.value)}
              placeholder="e.g. Mild dehydration, walking with difficulty, pale look..."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 sm:p-6 bg-slate-50/70 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition text-center cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto justify-center bg-[#1e536e] hover:bg-[#18445a] text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
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
              Queue Token
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
          {confirmationData.complaint && (
            <div className="pt-1 border-t border-sky-200/50">
              <span className="text-slate-500 block text-[11px]">Reason:</span>
              <span className="text-slate-700 font-medium line-clamp-2">
                {confirmationData.complaint}
              </span>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#1e536e] hover:bg-[#18445a] text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
          >
            View Live Queue
          </button>
        </div>
      </div>
    </div>
  );
};
