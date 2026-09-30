import React, { useState, useMemo } from "react";
import {
  Search,
  UserPlus,
  Eye,
  Edit3,
  Printer,
  ArrowLeft,
  Trash2,
  Calendar,
  Phone,
  Download,
  FileSpreadsheet,
  Pill,
  FileText,
} from "lucide-react";
import { Patient, OPDRecord } from "../../types";
import { useToast } from "../common/Toast";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface PatientManagementProps {
  patients: Patient[];
  onAddPatient: () => void;
  onViewPatient: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onPrintLatestPrescription: (patient: Patient, record: OPDRecord) => void;
  onDeletePatient?: (patientId: string) => void;
  onBack: () => void;
}

export const PatientManagement: React.FC<PatientManagementProps> = ({
  patients,
  onAddPatient,
  onViewPatient,
  onEditPatient,
  onPrintLatestPrescription,
  onDeletePatient,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<
    "All" | "Male" | "Female" | "Other"
  >("All");
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const { showToast } = useToast();

  const filteredPatients = useMemo(() => {
    let list = patients;

    if (genderFilter !== "All") {
      list = list.filter((p) => p.gender === genderFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.mobile.includes(q) ||
          (p.address && p.address.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [patients, searchQuery, genderFilter]);

  const handlePrintClick = (patient: Patient) => {
    if (!patient.records || patient.records.length === 0) {
      showToast(
        `No prescription recorded yet for ${patient.fullName}.`,
        "info",
      );
      return;
    }
    const latestRecord = patient.records[0];
    onPrintLatestPrescription(patient, latestRecord);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 page-fade-in no-print">
      {/* Top Header Bar */}
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
            <h1 className="text-xl font-bold text-slate-800">
              Patient Management
            </h1>
            <p className="text-xs text-slate-500">
              All clinic patient records, history and prescription archive
            </p>
          </div>
        </div>

        <button
          onClick={onAddPatient}
          className="bg-[#2da478] hover:bg-[#258d67] text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Patient</span>
        </button>
      </div>

      {/* Filter and Search Bar matching Page 7 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="patient-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient by Name, Mobile Number, or Patient ID..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            {(["All", "Male", "Female"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`px-3 py-1 rounded-md transition ${
                  genderFilter === g
                    ? "bg-white text-slate-900 font-bold shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="text-xs font-bold text-slate-700 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg">
            Total:{" "}
            <span className="text-[#1e536e] font-black">
              {filteredPatients.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Patients Table matching Page 7 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left text-sm min-w-175">
            <thead className="bg-[#1e536e] text-white text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">Patient ID</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-4 py-3.5">Age / Gender</th>
                <th className="px-5 py-3.5">DOB / DOR</th>
                <th className="px-5 py-3.5">Mobile</th>
                <th className="px-5 py-3.5">Prescriptions / Rx</th>
                <th className="px-5 py-3.5">Last Visit</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-slate-400 text-sm"
                  >
                    No patients match your search query.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const records = patient.records || [];
                  const latestRecord = records[0];
                  const latestMeds = latestRecord
                    ? (
                        latestRecord.medicines ||
                        latestRecord.prescriptions ||
                        []
                      ).filter((m) => m.name && m.name.trim())
                    : [];

                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => onViewPatient(patient)}
                    >
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-xs">
                          {patient.id}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 capitalize">
                        {patient.fullName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span>{patient.age}y</span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              patient.gender === "Male"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-pink-50 text-pink-700"
                            }`}
                          >
                            {patient.gender}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">
                        {patient.dob || patient.registrationDate}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                        {patient.mobile}
                      </td>
                      <td
                        className="px-5 py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {records.length > 0 ? (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() =>
                                latestRecord &&
                                onPrintLatestPrescription(patient, latestRecord)
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition shadow-2xs"
                              title="Click to preview/print latest prescription"
                            >
                              <Pill className="w-3.5 h-3.5 text-teal-600" />
                              <span>
                                {records.length}{" "}
                                {records.length === 1
                                  ? "Prescription"
                                  : "Prescriptions"}
                              </span>
                            </button>
                            {latestMeds.length > 0 ? (
                              <p
                                className="text-xs text-slate-600 truncate max-w-[220px]"
                                title={latestMeds.map((m) => m.name).join(", ")}
                              >
                                <span className="font-semibold text-slate-700">
                                  Rx:{" "}
                                </span>
                                {latestMeds.map((m) => m.name).join(", ")}
                              </p>
                            ) : latestRecord?.diagnosis ? (
                              <p className="text-xs text-slate-500 italic truncate max-w-[220px]">
                                {latestRecord.diagnosis}
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-400 block">
                                Consultation visit
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-400">
                            <Pill className="w-3 h-3 opacity-40" />
                            <span>No Rx yet</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium font-mono text-xs">
                        {patient.lastVisitDate}
                      </td>
                      <td
                        className="px-5 py-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {/* Eye Icon - View (Page 7) */}
                          <button
                            onClick={() => onViewPatient(patient)}
                            title="View Records & Prescriptions"
                            className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-md transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Pencil Icon - Edit (Page 7) */}
                          <button
                            onClick={() => onEditPatient(patient)}
                            title="Edit Patient Details"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* File Icon - Print & Download Prescription (Page 7) */}
                          <button
                            onClick={() => handlePrintClick(patient)}
                            title={
                              records.length > 0
                                ? `Print & Download Latest Prescription (${latestRecord?.id || latestRecord?.visitDate})`
                                : `No prescription recorded yet for ${patient.fullName}`
                            }
                            className={`p-1.5 rounded-md transition ${
                              records.length > 0
                                ? "text-teal-700 hover:text-teal-900 hover:bg-teal-50"
                                : "text-slate-300 hover:text-slate-400"
                            }`}
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Trash Icon - Delete Patient */}
                          {onDeletePatient && (
                            <button
                              onClick={() => setPatientToDelete(patient)}
                              title="Delete Patient Record"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Patient Confirmation Modal */}
      {patientToDelete && (
        <DeletePatientConfirmModal
          patient={patientToDelete}
          onClose={() => setPatientToDelete(null)}
          onConfirm={() => {
            if (onDeletePatient && patientToDelete) {
              onDeletePatient(patientToDelete.id);
              setPatientToDelete(null);
            }
          }}
        />
      )}
    </div>
  );
};

interface DeletePatientConfirmModalProps {
  patient: Patient;
  onClose: () => void;
  onConfirm: () => void;
}

const DeletePatientConfirmModal: React.FC<DeletePatientConfirmModalProps> = ({
  patient,
  onClose,
  onConfirm,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen: true, onClose });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-patient-dialog-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3
              id="delete-patient-dialog-title"
              className="text-lg font-bold text-slate-900"
            >
              Delete Patient Record
            </h3>
            <p className="text-xs text-slate-500">Permanent data removal</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-1.5 text-xs text-slate-700">
          <p>
            <strong className="text-slate-900">Patient:</strong>{" "}
            {patient.fullName}
          </p>
          <p>
            <strong className="text-slate-900">Patient ID:</strong>{" "}
            <span className="font-mono">{patient.id}</span>
          </p>
          <p>
            <strong className="text-slate-900">Mobile:</strong> {patient.mobile}
          </p>
          <p>
            <strong className="text-slate-900">Total Visits:</strong>{" "}
            {patient.records ? patient.records.length : 0}
          </p>
        </div>

        <p className="text-xs text-rose-600 leading-relaxed bg-rose-50 p-3 rounded-lg border border-rose-200">
          Warning: Deleting this patient will permanently remove their records,
          OPD visits, prescriptions, and queue entries from both the database
          and local storage. This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Yes, Delete Patient</span>
          </button>
        </div>
      </div>
    </div>
  );
};
