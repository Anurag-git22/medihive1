import React, { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Search, X, UserCheck, UserPlus } from "lucide-react";
import {
  Patient,
  OPDRecord,
  Gender,
  DoctorProfile,
  ClinicSettings,
} from "../../types";
import { generateNextPatientId } from "../../services/storage";
import { format, differenceInYears, parseISO } from "date-fns";
import { useToast } from "../common/Toast";
import { ConsultationForm } from "../consultation/ConsultationForm";

interface OpdRegistrationProps {
  patients: Patient[];
  preselectedPatientId?: string;
  doctor?: DoctorProfile;
  clinic?: ClinicSettings;
  onBack: () => void;
  onSaveOpdRecord: (patient: Patient, record: OPDRecord) => void;
  onGeneratePrescription: (patient: Patient, record: OPDRecord) => void;
}

export const OpdRegistration: React.FC<OpdRegistrationProps> = ({
  patients,
  preselectedPatientId,
  doctor,
  clinic,
  onBack,
  onSaveOpdRecord,
  onGeneratePrescription,
}) => {
  const { showToast } = useToast();

  // Patient Lookup state
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    preselectedPatientId || "",
  );
  const [patientSearchInput, setPatientSearchInput] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientInputRef = useRef<HTMLInputElement>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Demographics Form Fields
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<Gender>("Male");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [bloodGroup, setBloodGroup] = useState("A+");

  // Load existing patient if selected or preselected
  useEffect(() => {
    if (selectedPatientId) {
      const p = patients.find((pat) => pat.id === selectedPatientId);
      if (p) {
        setFullName(p.fullName);
        setDob(p.dob || "");
        setAge(p.age);
        setGender(p.gender);
        setMobile(p.mobile);
        setAddress(p.address || "");
        setBloodGroup(p.bloodGroup || "A+");
        setPatientSearchInput(`${p.fullName} (${p.id})`);
      }
    }
  }, [selectedPatientId, patients]);

  // Handle DOB change -> auto calculate age
  const handleDobChange = (val: string) => {
    setDob(val);
    if (val) {
      try {
        const calculatedAge = differenceInYears(new Date(), parseISO(val));
        if (calculatedAge >= 0) setAge(calculatedAge);
      } catch (e) {
        // ignore invalid date
      }
    }
  };

  // Build the patient object passed into ConsultationForm
  const activePatient: Patient = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const existing = selectedPatientId
      ? patients.find((p) => p.id === selectedPatientId)
      : undefined;

    const patientId =
      selectedPatientId || existing?.id || generateNextPatientId(patients);

    return {
      id: patientId,
      fullName: fullName.trim() || "New Patient",
      dob: dob || undefined,
      age: typeof age === "number" ? age : existing?.age || 25,
      gender: gender || existing?.gender || "Male",
      mobile: mobile.trim() || existing?.mobile || "",
      address: address.trim() || existing?.address || undefined,
      bloodGroup: bloodGroup || existing?.bloodGroup || "A+",
      weight: existing?.weight,
      height: existing?.height,
      emergencyContact: existing?.emergencyContact,
      allergies: existing?.allergies,
      medicalHistory: existing?.medicalHistory,
      registrationDate: existing ? existing.registrationDate : today,
      lastVisitDate: today,
      totalVisits: existing ? existing.records.length : 0,
      records: existing ? existing.records : [],
    };
  }, [
    selectedPatientId,
    patients,
    fullName,
    dob,
    age,
    gender,
    mobile,
    address,
    bloodGroup,
  ]);

  // Form Submission Handler
  const handleSaveFromForm = (
    record: OPDRecord,
    updatedPatientFromForm: Patient,
    _autoCallNext?: boolean,
    generatePrescription?: boolean,
  ) => {
    if (!fullName.trim()) {
      showToast("Please enter patient full name.", "error");
      return;
    }
    if (!mobile.trim()) {
      showToast("Please enter patient mobile number.", "error");
      return;
    }

    const finalPatient: Patient = {
      ...updatedPatientFromForm,
      id: activePatient.id,
      fullName: fullName.trim(),
      dob: dob || undefined,
      age: typeof age === "number" ? age : updatedPatientFromForm.age,
      gender,
      mobile: mobile.trim(),
      address: address.trim() || undefined,
      bloodGroup,
    };

    onSaveOpdRecord(finalPatient, record);
    showToast(
      `Consultation recorded for ${finalPatient.fullName} (${finalPatient.id})`,
      "success",
    );

    if (generatePrescription) {
      onGeneratePrescription(finalPatient, record);
    }
  };

  const defaultDoctor: DoctorProfile = doctor || {
    name: "Dr. Clinic Doctor",
    qualifications: "BAMS, MD",
    specialisation: "Ayurveda & General Medicine",
    medicalLicenseNo: "MED-001",
    email: "doctor@medihive.com",
    contact: "+91 9876543210",
    consultationFee: 500,
  };

  const defaultClinic: ClinicSettings = clinic || {
    name: "MediHive Clinic",
    address: "Clinic Address, City",
    phone: "+91 9876543210",
    email: "info@medihive.com",
    operatingHours: "09:00 AM - 08:00 PM",
    currency: "₹",
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 page-fade-in no-print">
      {/* Top Header Bar with Back Button */}
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
            <h1 className="text-xl font-bold text-slate-800">
              OPD Registration & Consultation
            </h1>
            <p className="text-xs text-slate-500">
              Unified consultation, clinical findings, prescriptions, and
              billing
            </p>
          </div>
        </div>
      </div>

      {/* Patient Information & Demographics Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden divide-y divide-slate-100">
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#1e536e] flex items-center gap-2">
              {selectedPatientId ? (
                <>
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <span>Existing Patient Selected</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 text-[#1e536e]" />
                  <span>Patient Demographics & Registration</span>
                </>
              )}
            </h2>
            <span className="text-xs text-slate-400">* Required fields</span>
          </div>

          {/* Search by Patient ID Autocomplete */}
          <div className="relative max-w-md">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Search Existing Patient (Name / Mobile / ID)
            </label>
            <div className="relative">
              <input
                ref={patientInputRef}
                type="text"
                value={patientSearchInput}
                onChange={(e) => {
                  setPatientSearchInput(e.target.value);
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowPatientDropdown(false);
                  }
                }}
                placeholder="Type patient name, phone, or ID..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e536e] focus:bg-white transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {selectedPatientId && (
                <button
                  type="button"
                  aria-label="Clear selected patient"
                  onClick={() => {
                    setSelectedPatientId("");
                    setPatientSearchInput("");
                    setFullName("");
                    setAge("");
                    setMobile("");
                    setDob("");
                    setAddress("");
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {showPatientDropdown && (
              <div
                ref={patientDropdownRef}
                role="listbox"
                className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientId("");
                    setPatientSearchInput("");
                    setShowPatientDropdown(false);
                    patientInputRef.current?.focus();
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border-b border-slate-100 transition"
                >
                  + Register as New Patient
                </button>
                {patients
                  .filter(
                    (p) =>
                      p.fullName
                        .toLowerCase()
                        .includes(patientSearchInput.toLowerCase()) ||
                      p.id
                        .toLowerCase()
                        .includes(patientSearchInput.toLowerCase()) ||
                      p.mobile.includes(patientSearchInput),
                  )
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setPatientSearchInput(`${p.fullName} (${p.id})`);
                        setShowPatientDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition"
                    >
                      <span className="font-medium text-slate-800">
                        {p.fullName} ({p.gender}, {p.age}y)
                      </span>
                      <span className="text-slate-400 font-mono">
                        {p.id} • {p.mobile}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Demographics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter patient full name"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e536e] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                DOB
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => handleDobChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e536e] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Age <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="125"
                required
                value={age}
                onChange={(e) =>
                  setAge(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Years"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e536e] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e536e] focus:bg-white transition"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e536e] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e536e] focus:bg-white transition"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address / City
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Residential address or locality"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e536e] focus:bg-white transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Unified Consultation Form Section */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6">
        <h2 className="text-base font-bold text-[#1e536e] mb-4 pb-2 border-b border-slate-100">
          Clinical Examination, Prescription & Billing
        </h2>

        <ConsultationForm
          mode="page"
          patient={activePatient}
          doctor={defaultDoctor}
          clinic={defaultClinic}
          existingPatients={patients}
          onSave={handleSaveFromForm}
          onCancel={onBack}
          onPreviewPrescription={(pat, rec) => onGeneratePrescription(pat, rec)}
        />
      </div>
    </div>
  );
};
