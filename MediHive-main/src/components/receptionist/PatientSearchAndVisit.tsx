import React, { useState, useMemo } from "react";
import {
  Search,
  UserPlus,
  FileText,
  Calendar,
  Phone,
  ArrowRight,
  Eye,
  UserCheck,
  AlertCircle,
  Sparkles,
  Edit2,
  Trash2,
} from "lucide-react";
import { Patient, PatientVisit } from "../../types";
import { PatientHistoryModal } from "./PatientHistoryModal";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface PatientSearchAndVisitProps {
  patients: Patient[];
  visits: PatientVisit[];
  onStartNewVisit: (patient: Patient) => void;
  onNavigateToNewPatient: () => void;
  onEditPatient?: (patient: Patient) => void;
  onDeletePatient?: (patientId: string) => void;
  onDeleteVisit?: (visitId: string) => void;
}

export const PatientSearchAndVisit: React.FC<PatientSearchAndVisitProps> = ({
  patients,
  visits,
  onStartNewVisit,
  onNavigateToNewPatient,
  onEditPatient,
  onDeletePatient,
  onDeleteVisit,
}) => {
  const [query, setQuery] = useState("");
  const [selectedPatientForHistory, setSelectedPatientForHistory] =
    useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.mobile.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
        (p.dob && p.dob.includes(q)),
    );
  }, [patients, query]);

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-6 page-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Patient Directory & Search
          </h1>
          <p className="text-xs text-slate-500">
            Search existing clinic patients or register a first-time visitor
          </p>
        </div>

        <button
          onClick={onNavigateToNewPatient}
          className="w-full sm:w-auto bg-[#2ba4c7] hover:bg-[#228da8] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Register New Patient</span>
        </button>
      </div>

      {/* Main Search Bar Box */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/90 space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Search Patient by ID, Mobile, Name or Date of Birth
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            id="receptionist-search-input"
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type Patient ID (e.g. P0001), Mobile (e.g. 9876...), Full Name, or DOB..."
            className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medihive-500 focus:bg-white transition"
          />
        </div>
        <p className="text-[11px] text-slate-400">
          Tip: Before registering a new patient, always search by phone number
          or name to prevent duplicate records.
        </p>
      </div>

      {/* Search Results Area */}
      {query.trim() && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Search Results ({searchResults.length})</span>
            {searchResults.length === 0 && (
              <span className="text-amber-600 font-medium">
                No record matching "{query}"
              </span>
            )}
          </div>

          {searchResults.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">
                No Existing Patient Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No patient records match your search criteria. This might be a
                first-time visitor.
              </p>
              <button
                onClick={onNavigateToNewPatient}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#2ba4c7] hover:bg-[#228da8] text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register as New Patient</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4 hover:shadow-md transition relative overflow-hidden group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-sky-100 text-[#1e536e] flex items-center justify-center font-bold text-sm">
                        {patient.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 capitalize">
                            {patient.fullName}
                          </h3>
                          <span className="text-xs font-mono font-bold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100">
                            {patient.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {patient.gender} {patient.age} yrs Mobile:{" "}
                          <strong className="font-mono text-slate-700">
                            {patient.mobile}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      <span>Existing</span>
                    </span>
                  </div>

                  {/* Patient Info Card matching prompt example */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Previous Visits:</span>
                      <strong className="text-slate-900 font-bold font-mono">
                        {patient.records?.length || patient.totalVisits || 0}{" "}
                        visits
                      </strong>
                    </div>
                    {patient.dob && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>DOB:</span>
                        <span className="font-mono text-slate-700">
                          {patient.dob}
                        </span>
                      </div>
                    )}
                    {patient.lastVisitDate && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Last Visited:</span>
                        <span className="font-mono text-slate-700">
                          {patient.lastVisitDate}
                        </span>
                      </div>
                    )}
                    {patient.allergies && (
                      <div className="text-[11px] text-amber-700 font-medium">
                        ⚠️ Allergy: {patient.allergies}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPatientForHistory(patient)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>History</span>
                      </button>

                      {onEditPatient && (
                        <button
                          type="button"
                          onClick={() => onEditPatient(patient)}
                          title="Edit Patient Details"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit</span>
                        </button>
                      )}

                      {onDeletePatient && (
                        <button
                          type="button"
                          onClick={() => setPatientToDelete(patient)}
                          title="Delete Patient Record"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onStartNewVisit(patient)}
                      className="px-3.5 py-1.5 bg-[#2ba4c7] hover:bg-[#228da8] text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
                    >
                      <span>New Visit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Directory Table when not actively searching */}
      {!query.trim() && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                All Registered Patients ({patients.length})
              </h2>
              <p className="text-xs text-slate-500">
                List of all patients registered in MediHive
              </p>
            </div>
          </div>

          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left text-sm min-w-162.5">
              <thead className="bg-[#1e536e] text-white text-xs uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Patient ID</th>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-4 py-3">Age / Gender</th>
                  <th className="px-5 py-3">Mobile</th>
                  <th className="px-4 py-3">Visits</th>
                  <th className="px-5 py-3">Last Visit</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {patients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      No patients registered yet. Click{" "}
                      <strong>+ Register New Patient</strong> above to begin.
                    </td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">
                        {p.id}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 capitalize">
                        {p.fullName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {p.age} yrs {p.gender}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">
                        {p.mobile}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {p.records?.length || p.totalVisits || 0}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">
                        {p.lastVisitDate || "Today"}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPatientForHistory(p)}
                            title="View Medical History"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {onEditPatient && (
                            <button
                              type="button"
                              onClick={() => onEditPatient(p)}
                              title="Edit Patient Details"
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {onDeletePatient && (
                            <button
                              type="button"
                              onClick={() => setPatientToDelete(p)}
                              title="Delete Patient Record"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onStartNewVisit(p)}
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 font-semibold rounded text-[11px] border border-sky-200 transition"
                          >
                            + New Visit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Medical History Modal */}
      <PatientHistoryModal
        patient={selectedPatientForHistory}
        visits={visits}
        isOpen={Boolean(selectedPatientForHistory)}
        onClose={() => setSelectedPatientForHistory(null)}
        onStartNewVisit={onStartNewVisit}
        onEditPatient={onEditPatient}
        onDeletePatient={onDeletePatient}
        onDeleteVisit={onDeleteVisit}
      />

      {/* Delete Patient Confirmation Modal */}
      {patientToDelete && (
        <DeleteReceptionistPatientConfirmModal
          patient={patientToDelete}
          onClose={() => setPatientToDelete(null)}
          onConfirm={() => {
            if (onDeletePatient) {
              onDeletePatient(patientToDelete.id);
            }
            setPatientToDelete(null);
          }}
        />
      )}
    </div>
  );
};

interface DeleteReceptionistPatientConfirmModalProps {
  patient: Patient;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteReceptionistPatientConfirmModal: React.FC<
  DeleteReceptionistPatientConfirmModalProps
> = ({ patient, onClose, onConfirm }) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen: true, onClose });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-rec-patient-title"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-3 text-rose-600">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3
              id="delete-rec-patient-title"
              className="text-base font-bold text-slate-900"
            >
              Delete Patient Record?
            </h3>
            <p className="text-xs text-slate-500">
              This action cannot be undone
            </p>
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3.5 text-xs text-rose-900 space-y-1">
          <p className="font-semibold capitalize text-sm text-slate-900">
            {patient.fullName}
          </p>
          <p className="text-[11px] text-slate-600">
            ID: <span className="font-mono font-bold">{patient.id}</span> |
            Mobile: <span className="font-mono">{patient.mobile}</span>
          </p>
          <p className="text-[11px] text-rose-700 pt-1">
            ⚠️ This will permanently delete this patient from the database and
            automatically cascade to remove all associated visits,
            consultations, and queue tokens.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-sm flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Yes, Delete Patient</span>
          </button>
        </div>
      </div>
    </div>
  );
};
