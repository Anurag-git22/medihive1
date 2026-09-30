import React, { useState, useEffect } from "react";
import { X, Save, User, Phone, MapPin, Calendar, Check } from "lucide-react";
import { Patient, Gender } from "../../types";
import { useToast } from "../common/Toast";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface EditPatientModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onSavePatient: (patient: Patient) => void;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({
  patient,
  isOpen,
  onClose,
  onSavePatient,
}) => {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<Gender>("Male");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [bloodGroup, setBloodGroup] = useState("A+");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  useEffect(() => {
    if (patient) {
      setFullName(patient.fullName);
      setDob(patient.dob || "");
      setAge(patient.age);
      setGender(patient.gender);
      setMobile(patient.mobile);
      setAddress(patient.address || "");
      setBloodGroup(patient.bloodGroup || "A+");
      setWeight(patient.weight || "");
      setHeight(patient.height || "");
    }
  }, [patient]);

  const modalRef = useFocusTrap<HTMLDivElement>({
    isOpen: Boolean(isOpen && patient),
    onClose,
  });

  if (!isOpen || !patient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast("Please enter full name", "error");
      return;
    }
    if (!mobile.trim()) {
      showToast("Please enter mobile number", "error");
      return;
    }

    const cleanedHeight = height.trim();
    const formattedHeight = cleanedHeight
      ? cleanedHeight.toLowerCase().endsWith("cm")
        ? cleanedHeight
        : `${cleanedHeight} cm`
      : undefined;

    const updated: Patient = {
      ...patient,
      fullName: fullName.trim(),
      dob: dob || undefined,
      age: Number(age) || patient.age,
      gender,
      mobile: mobile.trim(),
      address: address.trim() || undefined,
      bloodGroup,
      weight: weight.trim() || undefined,
      height: formattedHeight,
    };

    onSavePatient(updated);
    showToast(`Patient ${updated.fullName} updated successfully!`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 no-print">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-patient-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[96dvh] flex flex-col overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2
              id="edit-patient-title"
              className="text-base font-bold text-slate-800"
            >
              Edit Patient Details
            </h2>
            <p className="text-xs text-slate-500 font-mono">ID: {patient.id}</p>
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
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) =>
                  setAge(e.target.value ? parseInt(e.target.value) : "")
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              >
                {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(
                  (bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 68"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Height (cm)
              </label>
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 172 cm"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medihive-500"
            />
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
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
