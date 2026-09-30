import React, { useState } from "react";
import {
  ArrowLeft,
  Laptop,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Search,
} from "lucide-react";
import { ContactSupportModal } from "./ContactSupportModal";

interface HelpCenterProps {
  onBack: () => void;
}

interface FAQItem {
  id: string;
  category: "Patients" | "Prescriptions" | "Settings" | "Billing" | "Calendar";
  question: string;
  answer: string;
}

const faqList: FAQItem[] = [
  {
    id: "faq-1",
    category: "Patients",
    question: "How do I search for a previous patient record?",
    answer:
      "You can search for any patient in MediHive by typing their Name, Mobile Number, or Patient ID (e.g. P0003) into the search bar at the top of the Dashboard or in Patient Management. The table filters immediately as you type.",
  },
  {
    id: "faq-2",
    category: "Patients",
    question:
      "Can I view past visits and previous prescriptions for a returning patient?",
    answer:
      "Yes! Navigate to Patient Management, click the Eye 👁 icon next to any patient name. This opens their complete multi-visit medical timeline with previous symptoms, prescriptions, notes, and instant re-print options.",
  },
  {
    id: "faq-3",
    category: "Prescriptions",
    question: "How do smart symptom and medicine suggestions work?",
    answer:
      "When you begin typing in the Symptoms or Medicine fields during OPD Registration, MediHive auto-completes names and pre-populates recommended dosages, frequencies (e.g. Twice daily), and timings (After Food / With warm water).",
  },
  {
    id: "faq-4",
    category: "Prescriptions",
    question:
      "Can I download the prescription as a PDF or send it to a printer?",
    answer:
      'Yes. When you save an OPD record, the Prescription Preview modal opens automatically. You can click "Print" for direct clean browser printing on your letterhead, or click "Download PDF" to save a high-resolution PDF document.',
  },
  {
    id: "faq-5",
    category: "Billing",
    question: "How are discounts and total fees calculated?",
    answer:
      "The system automatically tallies Consultation Fees + Medicine Fees + Panchakarma / Therapy Fees. If you apply a discount (flat ₹ amount or %), the final total fee is calculated in real time before saving.",
  },
  {
    id: "faq-6",
    category: "Calendar",
    question: "How do follow-up reminders notify me?",
    answer:
      'When you enter a "Next Visit Date Reminder" during OPD registration, MediHive automatically places a reminder badge on the clinic calendar and triggers a top notification badge whenever that follow-up is due.',
  },
  {
    id: "faq-7",
    category: "Settings",
    question: "How do I backup my clinic data?",
    answer:
      "Go to Settings > Backup Data. You can choose to export your records for the last 1, 3, 6, 12 months, or export a Complete Backup as an Excel (.xlsx) spreadsheet or JSON archive with one click.",
  },
  {
    id: "faq-8",
    category: "Settings",
    question: "How do I set up automated email prescriptions for patients?",
    answer:
      "Go to Settings > Email Configuration. Enter your clinic Gmail address, SMTP server (smtp.gmail.com), port (587), and your 16-character Google App Password as described in the help guide.",
  },
];

export const HelpCenter: React.FC<HelpCenterProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("faq-1");
  const [showSupportModal, setShowSupportModal] = useState(false);

  const categories = [
    "All",
    "Patients",
    "Prescriptions",
    "Billing",
    "Calendar",
    "Settings",
  ];

  const filteredFaqs = faqList.filter((faq) => {
    const matchesCat =
      selectedCategory === "All" || faq.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const toggleFaq = (id: string) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 page-fade-in no-print">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Help & Support</h1>
            <p className="text-xs text-slate-500">
              Get guidance, contact support, and learn how to use MediHive
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSupportModal(true)}
          className="bg-[#2ba4c7] hover:bg-[#228da8] text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Contact Support</span>
        </button>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Application Info */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2.5 text-[#1e536e]">
            <div className="p-2 bg-sky-50 rounded-lg">
              <Laptop className="w-4 h-4 text-sky-700" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">
              Application Info
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-600">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                App Name:
              </span>
              <span className="font-semibold text-slate-800">
                MediHive Clinical
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Version:
              </span>
              <span className="font-bold font-mono text-emerald-700">
                v1.0.2
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Platform:
              </span>
              <span className="font-semibold text-slate-800">
                Desktop / Web
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Last Updated:
              </span>
              <span className="font-semibold text-slate-800">May 2026</span>
            </div>
          </div>
        </div>

        {/* Card 2: Data & Privacy */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2.5 text-[#1e536e]">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">Data & Privacy</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Privacy Policy:</strong> All patient data is encrypted and
            securely stored. MediHive does not share any medical data with
            unauthorized external parties. Your clinic records remain private,
            secure, and under your direct administrative control.
          </p>
        </div>
      </div>

      {/* Frequently Asked Questions Section matching Page 13 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#1e536e]" />
              <span>Frequently Asked Questions</span>
            </h2>
            <p className="text-xs text-slate-500">
              Instant answers to common queries about MediHive
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-[#1e536e] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-2.5 pt-2">
          {filteredFaqs.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No questions found matching your search.
            </p>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="border border-slate-200 rounded-lg overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-800 transition"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                      {faq.question}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 py-3 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tip Banner matching Page 13 */}
      <div className="bg-sky-50/90 border border-sky-200/80 rounded-xl p-4 flex items-center gap-3 text-sm text-sky-900 shadow-sm">
        <span className="text-lg">💡</span>
        <p>
          <strong>Always Available:</strong> If you are ever unsure about
          something, the Help Center is always just one click away from any
          screen in MediHive.
        </p>
      </div>

      {/* Support Modal */}
      <ContactSupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
    </div>
  );
};
