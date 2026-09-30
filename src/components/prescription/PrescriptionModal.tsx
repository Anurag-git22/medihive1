import React, { useRef } from "react";
import {
  X,
  Printer,
  Download,
  Edit3,
  Check,
  Share2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  FileText,
} from "lucide-react";
import { Patient, OPDRecord, DoctorProfile, ClinicSettings } from "../../types";
import { format } from "date-fns";
import { useToast } from "../common/Toast";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PrescriptionModalProps {
  patient: Patient;
  record: OPDRecord;
  doctor: DoctorProfile;
  clinic: ClinicSettings;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onConfirmSave?: () => void;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  patient,
  record,
  doctor,
  clinic,
  isOpen,
  onClose,
  onEdit,
  onConfirmSave,
}) => {
  const prescriptionRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Direct Vector PDF Generator as reliable fail-safe
  const generateDirectPrescriptionPdf = (
    pat: Patient,
    rec: OPDRecord,
    doc: DoctorProfile,
    cln: ClinicSettings,
  ) => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Header clinic emblem / title
    pdf.setDrawColor(30, 83, 110);
    pdf.setLineWidth(0.8);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.setTextColor(30, 83, 110);
    pdf.text(cln?.name || "MediHive Clinic", margin, y + 5);

    pdf.setFontSize(11);
    pdf.setTextColor(30, 41, 59);
    pdf.text(doc?.name || "Doctor", margin, y + 12);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(4, 120, 87);
    if (doc?.qualifications) {
      pdf.text(doc.qualifications, margin, y + 17);
    }
    if (doc?.medicalLicenseNo) {
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Reg No: ${doc.medicalLicenseNo}`, margin, y + 21);
    }

    // Right-aligned clinic details
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    let rightY = y + 5;
    if (cln?.phone) {
      pdf.text(`Phone: ${cln.phone}`, pageWidth - margin, rightY, {
        align: "right",
      });
      rightY += 4.5;
    }
    if (cln?.operatingHours) {
      pdf.text(`Hours: ${cln.operatingHours}`, pageWidth - margin, rightY, {
        align: "right",
      });
      rightY += 4.5;
    }
    if (cln?.address) {
      const addressLines = pdf.splitTextToSize(cln.address, 65);
      pdf.text(addressLines, pageWidth - margin, rightY, { align: "right" });
    }

    y += 25;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;

    // Patient Meta Box
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, y, contentWidth, 21, 2, 2, "FD");

    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Patient Name:", margin + 4, y + 5.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text(pat?.fullName || "—", margin + 26, y + 5.5);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139);
    pdf.text("Age / Gender:", margin + 85, y + 5.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      `${pat?.age || 0} Yrs / ${pat?.gender || "—"}`,
      margin + 107,
      y + 5.5,
    );

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139);
    pdf.text("Patient ID:", margin + 4, y + 12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text(pat?.id || "—", margin + 26, y + 12);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139);
    pdf.text("Visit Date:", margin + 85, y + 12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      rec?.visitDate || new Date().toISOString().slice(0, 10),
      margin + 107,
      y + 12,
    );

    // Vitals & Allergies line
    const vitalsText = [
      pat?.weight ? `Wt: ${pat.weight}kg` : null,
      pat?.height ? `Ht: ${pat.height}` : null,
      rec?.vitals?.bp ? `BP: ${rec.vitals.bp}` : null,
      rec?.vitals?.pulse ? `Pulse: ${rec.vitals.pulse} bpm` : null,
    ]
      .filter(Boolean)
      .join("   •   ");

    if (vitalsText || pat?.allergies) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      if (vitalsText) {
        pdf.setTextColor(71, 85, 105);
        pdf.text(`Vitals: ${vitalsText}`, margin + 4, y + 18);
      }
      if (pat?.allergies) {
        pdf.setTextColor(225, 29, 72);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Allergies: ${pat.allergies}`, margin + 107, y + 18);
      }
    }

    y += 26;

    // Complaints, Symptoms & Diagnosis
    if (
      rec?.complaint ||
      (rec?.symptoms && rec.symptoms.length > 0) ||
      rec?.diagnosis
    ) {
      if (rec.complaint) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(30, 41, 59);
        pdf.text("Chief Complaint: ", margin, y);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(51, 65, 85);
        const lines = pdf.splitTextToSize(rec.complaint, contentWidth - 30);
        pdf.text(lines, margin + 30, y);
        y += lines.length * 4.5 + 2;
      }

      const symptomsList = Array.isArray(rec.symptoms)
        ? rec.symptoms.join(", ")
        : typeof rec?.symptoms === "string"
          ? rec.symptoms
          : "";
      if (symptomsList) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(30, 41, 59);
        pdf.text("Symptoms: ", margin, y);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(51, 65, 85);
        const lines = pdf.splitTextToSize(symptomsList, contentWidth - 25);
        pdf.text(lines, margin + 25, y);
        y += lines.length * 4.5 + 2;
      }

      if (rec.diagnosis) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(30, 41, 59);
        pdf.text("Diagnosis: ", margin, y);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(51, 65, 85);
        const lines = pdf.splitTextToSize(rec.diagnosis, contentWidth - 25);
        pdf.text(lines, margin + 25, y);
        y += lines.length * 4.5 + 3;
      }
      y += 2;
    }

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin - 22) {
        pdf.addPage();
        y = margin + 5;
      }
    };

    // Medicines Prescribed Banner
    checkPageBreak(15);
    pdf.setFillColor(30, 83, 110);
    pdf.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text("MEDICINES PRESCRIBED (Rx)", margin + 4, y + 4.8);
    y += 9.5;

    const rawMeds = rec?.medicines ?? rec?.prescriptions;
    const medsList = Array.isArray(rawMeds) ? rawMeds.filter(Boolean) : [];

    if (medsList.length === 0) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text("No medicines prescribed.", margin + 4, y + 5);
      y += 10;
    } else {
      medsList.forEach((med, idx) => {
        checkPageBreak(15);
        pdf.setFillColor(
          idx % 2 === 0 ? 255 : 248,
          idx % 2 === 0 ? 255 : 250,
          idx % 2 === 0 ? 255 : 252,
        );
        pdf.setDrawColor(241, 245, 249);
        pdf.rect(margin, y, contentWidth, 12, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`${idx + 1}. ${med.name || "Medicine"}`, margin + 3, y + 4.8);

        if (med.dosage) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(2, 132, 199);
          pdf.text(`[${med.dosage}]`, margin + 65, y + 4.8);
        }

        if (med.duration) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(71, 85, 105);
          pdf.text(
            `Duration: ${med.duration}`,
            pageWidth - margin - 3,
            y + 4.8,
            {
              align: "right",
            },
          );
        }

        const scheduleParts = [
          med.frequency ? `Schedule: ${med.frequency}` : null,
          med.timing ? `Timing: ${med.timing}` : null,
          med.instructions ? `(${med.instructions})` : null,
        ]
          .filter(Boolean)
          .join("  •  ");

        if (scheduleParts) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(100, 116, 139);
          pdf.text(scheduleParts, margin + 6, y + 9.2);
        }

        y += 12.5;
      });
    }

    // Lab Tests
    if (rec?.tests) {
      checkPageBreak(12);
      pdf.setFillColor(240, 249, 255);
      pdf.setDrawColor(186, 230, 253);
      pdf.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(30, 83, 110);
      pdf.text("Lab Investigations & Tests: ", margin + 3, y + 5.2);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(30, 41, 59);
      pdf.text(rec.tests, margin + 48, y + 5.2);
      y += 11;
    }

    // Clinical Notes & Panchakarma & Dietary Advice
    const addNoteSection = (label: string, text?: string) => {
      if (!text) return;
      checkPageBreak(12);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      pdf.text(`${label}: `, margin, y + 4);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      const lines = pdf.splitTextToSize(text, contentWidth - 35);
      pdf.text(lines, margin + 35, y + 4);
      y += lines.length * 4 + 4;
    };

    addNoteSection("Clinical Notes", rec?.clinicalNotes);
    addNoteSection("Panchakarma Notes", rec?.panchakarmaNotes);
    addNoteSection("Dietary Advice", rec?.dietaryAdvice);

    // Next Visit
    if (rec?.nextVisitDate) {
      checkPageBreak(11);
      pdf.setFillColor(240, 249, 255);
      pdf.setDrawColor(186, 230, 253);
      pdf.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(30, 83, 110);
      pdf.text("Next Visit Reminder:", margin + 3, y + 5);
      pdf.setTextColor(12, 74, 110);
      pdf.text(rec.nextVisitDate, margin + 38, y + 5);
      y += 10.5;
    }

    // Doctor Signature Block
    checkPageBreak(25);
    const sigY = Math.max(y + 8, pageHeight - margin - 22);
    pdf.setDrawColor(148, 163, 184);
    pdf.setLineWidth(0.4);
    pdf.line(pageWidth - margin - 45, sigY, pageWidth - margin, sigY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(doc?.name || "Doctor", pageWidth - margin - 22, sigY + 4, {
      align: "center",
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(doc?.qualifications || "", pageWidth - margin - 22, sigY + 7.5, {
      align: "center",
    });

    // Footer
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      "Prescription generated via MediHive Clinical Suite • Keep medicines out of reach of children",
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" },
    );

    const safeName = (pat?.fullName || "Patient")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    pdf.save(`Prescription_${safeName}_${rec?.visitDate || "visit"}.pdf`);
  };

  // Helper to sanitize OKLCH and modern CSS colors in cloned DOM for html2canvas
  const sanitizeColorsInClone = (
    clonedDoc: Document,
    clonedEl: HTMLElement,
  ) => {
    const allElements = [
      clonedEl,
      ...Array.from(clonedEl.querySelectorAll("*")),
    ] as HTMLElement[];
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const ctx = tempCanvas.getContext("2d");

    const convertColor = (val: string): string => {
      if (!val || typeof val !== "string") return val;
      if (
        !val.includes("oklch") &&
        !val.includes("color(") &&
        !val.includes("lab(") &&
        !val.includes("lch(")
      ) {
        return val;
      }
      if (ctx) {
        try {
          ctx.fillStyle = "#ffffff";
          ctx.fillStyle = val;
          const computed = ctx.fillStyle;
          if (computed && !computed.includes("oklch")) {
            return computed;
          }
        } catch {
          // ignore
        }
      }
      return "#1e293b";
    };

    const defaultView = clonedDoc.defaultView || window;

    allElements.forEach((el) => {
      el.style.boxShadow = "none";
      el.style.textShadow = "none";

      try {
        const computed = defaultView.getComputedStyle(el);
        if (
          computed.color &&
          (computed.color.includes("oklch") ||
            computed.color.includes("color("))
        ) {
          el.style.color = convertColor(computed.color);
        }
        if (
          computed.backgroundColor &&
          (computed.backgroundColor.includes("oklch") ||
            computed.backgroundColor.includes("color("))
        ) {
          el.style.backgroundColor = convertColor(computed.backgroundColor);
        }
        if (
          computed.borderColor &&
          (computed.borderColor.includes("oklch") ||
            computed.borderColor.includes("color("))
        ) {
          el.style.borderColor = convertColor(computed.borderColor);
        }
        if (
          computed.outlineColor &&
          (computed.outlineColor.includes("oklch") ||
            computed.outlineColor.includes("color("))
        ) {
          el.style.outlineColor = convertColor(computed.outlineColor);
        }
      } catch {
        // Fallback safely if computed style is unavailable
      }

      const fill = el.getAttribute("fill");
      if (fill && (fill.includes("oklch") || fill.includes("color("))) {
        el.setAttribute("fill", convertColor(fill));
      }
      const stroke = el.getAttribute("stroke");
      if (stroke && (stroke.includes("oklch") || stroke.includes("color("))) {
        el.setAttribute("stroke", convertColor(stroke));
      }
    });
  };

  // Download PDF Handler using dual-path html2canvas & direct jsPDF
  const handleDownloadPdf = async () => {
    try {
      showToast("Generating PDF prescription...", "info");

      if (prescriptionRef.current) {
        try {
          const canvas = await html2canvas(prescriptionRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            onclone: (clonedDoc, clonedEl) => {
              // Neutralize any oklch(...) inside cloned <style> tags to avoid parser crashes
              clonedDoc.querySelectorAll("style").forEach((s) => {
                try {
                  if (s.textContent && s.textContent.includes("oklch")) {
                    s.textContent = s.textContent.replace(
                      /oklch\([^)]+\)/g,
                      "#334155",
                    );
                  }
                } catch {
                  // ignore
                }
              });
              sanitizeColorsInClone(clonedDoc, clonedEl);
            },
          });

          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
          });

          const pageWidth = 210;
          const pageHeight = 297;
          const imgWidth = pageWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;

          // First page
          pdf.addImage(
            imgData,
            "PNG",
            0,
            position,
            imgWidth,
            imgHeight,
            undefined,
            "FAST",
          );
          heightLeft -= pageHeight;

          // Subsequent pages for long prescriptions
          while (heightLeft > 0) {
            position -= pageHeight;
            pdf.addPage();
            pdf.addImage(
              imgData,
              "PNG",
              0,
              position,
              imgWidth,
              imgHeight,
              undefined,
              "FAST",
            );
            heightLeft -= pageHeight;
          }

          const safeName = (patient?.fullName || "Patient")
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, "_");
          pdf.save(
            `Prescription_${safeName}_${record?.visitDate || "visit"}.pdf`,
          );
          showToast("Prescription PDF downloaded successfully!", "success");
          return;
        } catch (canvasErr) {
          console.warn(
            "Canvas capture error, using direct PDF generator:",
            canvasErr,
          );
        }
      }

      // Direct Vector PDF Fallback
      generateDirectPrescriptionPdf(patient, record, doctor, clinic);
      showToast("Prescription PDF downloaded successfully!", "success");
    } catch (err: any) {
      console.error("Prescription PDF generation error:", err);
      // Final attempt with direct PDF
      try {
        generateDirectPrescriptionPdf(patient, record, doctor, clinic);
        showToast("Prescription PDF downloaded successfully!", "success");
      } catch (finalErr) {
        showToast(
          "Failed to generate PDF. You can also use the Print button to save as PDF.",
          "error",
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescription-modal-title"
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full flex flex-col max-h-[96dvh] sm:max-h-[92vh] overflow-hidden"
      >
        {/* Modal Top Bar */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#1e536e] shrink-0" />
            <h3
              id="prescription-modal-title"
              className="font-bold text-slate-800 text-xs sm:text-base truncate"
            >
              Prescription Preview — {patient.fullName} ({patient.id})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Prescription Document Area (Exact reproduction of Page 6) */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-8 bg-slate-100/50 flex justify-center touch-scroll">
          <div
            ref={prescriptionRef}
            id="printable-prescription"
            className="bg-white rounded-xl shadow-md border border-slate-200/90 w-full max-w-180 min-w-75 p-4 sm:p-10 text-slate-800 space-y-4 sm:space-y-5 print:shadow-none print:border-none print:p-0"
          >
            {/* Header: Clinic Emblem + Clinic Details + Doctor Info */}
            <div className="border-b-2 border-[#1e536e] pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Clinic Logo Emblem */}
                <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center p-2 text-emerald-700">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full fill-emerald-600"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M50 10 C30 30 15 55 15 75 C15 88 26 95 38 95 C48 95 50 88 50 88 C50 88 52 95 62 95 C74 95 85 88 85 75 C85 55 70 30 50 10 Z" />
                    <circle cx="50" cy="50" r="10" fill="#ffffff" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#1e536e] tracking-tight">
                    {clinic.name}
                  </h1>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">
                    {doctor.name}
                  </p>
                  <p className="text-[11px] font-medium text-emerald-700">
                    {doctor.qualifications}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Reg No: {doctor.medicalLicenseNo}
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-600 space-y-0.5 border-t sm:border-t-0 sm:border-l sm:border-slate-200 pt-2 sm:pt-0 sm:pl-4">
                <p className="flex items-center justify-end gap-1 font-medium">
                  <Phone className="w-3 h-3 text-slate-400" /> {clinic.phone}
                </p>
                <p className="flex items-center justify-end gap-1 text-slate-500">
                  <Clock className="w-3 h-3 text-slate-400" />{" "}
                  {clinic.operatingHours}
                </p>
                <p className="text-[10px] text-slate-500 max-w-50 leading-tight mt-1">
                  {clinic.address}
                </p>
              </div>
            </div>

            {/* Patient Meta Strip */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-400 font-medium">
                  Patient Name:
                </span>
                <p className="font-bold text-slate-900 capitalize">
                  {patient.fullName}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">
                  Age / Gender:
                </span>
                <p className="font-bold text-slate-900">
                  {patient.age} Yrs / {patient.gender}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Patient ID:</span>
                <p className="font-bold font-mono text-slate-900">
                  {patient.id}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Date:</span>
                <p className="font-bold text-slate-900">{record.visitDate}</p>
              </div>
              {patient.mobile && (
                <div>
                  <span className="text-slate-400 font-medium">Mobile:</span>
                  <p className="font-bold text-slate-900">{patient.mobile}</p>
                </div>
              )}
              {patient.bloodGroup && (
                <div>
                  <span className="text-slate-400 font-medium">
                    Blood Group:
                  </span>
                  <p className="font-bold text-slate-900">
                    {patient.bloodGroup}
                  </p>
                </div>
              )}
              {(patient.weight || patient.height || record.vitals?.bp) && (
                <div>
                  <span className="text-slate-400 font-medium">Vitals:</span>
                  <p className="font-bold text-slate-900">
                    {[
                      patient.weight ? `Wt: ${patient.weight}kg` : null,
                      patient.height ? `Ht: ${patient.height}` : null,
                      record.vitals?.bp ? `BP: ${record.vitals.bp}` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>
              )}
              {patient.allergies && (
                <div className="col-span-2">
                  <span className="text-rose-600 font-bold">Allergies: </span>
                  <span className="font-semibold text-rose-700">
                    {patient.allergies}
                  </span>
                </div>
              )}
            </div>

            {/* Complaint, Symptoms & Diagnosis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {record.complaint && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 col-span-1 sm:col-span-2">
                  <span className="font-bold text-slate-700 block mb-1">
                    Chief Complaint:
                  </span>
                  <p className="text-slate-800">{record.complaint}</p>
                </div>
              )}
              {(() => {
                const symptomsList = Array.isArray(record?.symptoms)
                  ? record.symptoms.join(", ")
                  : typeof record?.symptoms === "string"
                    ? record.symptoms
                    : "";
                if (!symptomsList) return null;
                return (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">
                      Symptoms:
                    </span>
                    <p className="text-slate-800">{symptomsList}</p>
                  </div>
                );
              })()}
              {record?.diagnosis && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-1">
                    Diagnosis:
                  </span>
                  <p className="text-slate-800">{record.diagnosis}</p>
                </div>
              )}
            </div>

            {/* MEDICINES PRESCRIBED BANNER & LIST */}
            <div className="space-y-2">
              <div className="bg-[#1e536e] text-white px-4 py-2 rounded-md flex items-center justify-between font-bold text-xs uppercase tracking-wider">
                <span>MEDICINES PRESCRIBED</span>
                <span className="text-[10px] text-sky-200 font-normal">Rx</span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {(() => {
                  const rawMeds = record?.medicines ?? record?.prescriptions;
                  const medicinesList = Array.isArray(rawMeds)
                    ? rawMeds.filter(Boolean)
                    : [];
                  if (medicinesList.length === 0) {
                    return (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No medicines prescribed.
                      </div>
                    );
                  }
                  return medicinesList.map((med, idx) => (
                    <div
                      key={med.id || idx}
                      className="p-3 text-xs flex items-start justify-between bg-white hover:bg-slate-50/60"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {idx + 1}. {med.name || "Medicine"}
                          </span>
                          {med.dosage && (
                            <span className="bg-sky-50 text-sky-800 font-semibold px-2 py-0.5 rounded text-[11px] border border-sky-100">
                              {med.dosage}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          <strong>Schedule:</strong> {med.frequency || "—"} •{" "}
                          <em>{med.timing || "—"}</em>
                          {med.instructions && ` (${med.instructions})`}
                        </p>
                      </div>
                      <div className="text-right shrink-0 font-medium text-slate-700 text-xs">
                        {med.duration || ""}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Lab Investigations / Tests */}
            {record.tests && (
              <div className="p-2.5 bg-sky-50/70 rounded-lg border border-sky-200">
                <span className="font-bold text-[#1e536e]">
                  Lab Investigations & Tests:{" "}
                </span>
                <span className="text-slate-800 font-medium">
                  {record.tests}
                </span>
              </div>
            )}

            {/* Notes & Panchakarma Notes */}
            <div className="space-y-2 text-xs">
              {record.clinicalNotes && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700">Notes: </span>
                  <span className="text-slate-800">{record.clinicalNotes}</span>
                </div>
              )}
              {record.panchakarmaNotes && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-emerald-800">
                    Panchakarma Notes:{" "}
                  </span>
                  <span className="text-slate-800">
                    {record.panchakarmaNotes}
                  </span>
                </div>
              )}
              {record.dietaryAdvice && (
                <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200 text-amber-900">
                  <span className="font-bold">Dietary Advice: </span>
                  <span>{record.dietaryAdvice}</span>
                </div>
              )}
            </div>

            {/* Next Visit Banner */}
            {record.nextVisitDate && (
              <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="font-bold text-[#1e536e] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Next Visit Reminder:
                </span>
                <span className="font-black text-sky-900 font-mono text-sm bg-white px-2.5 py-0.5 rounded border border-sky-200">
                  {record.nextVisitDate}
                </span>
              </div>
            )}

            {/* Doctor Signature Block */}
            <div className="pt-8 flex justify-end items-center text-right">
              <div className="space-y-1 pr-4">
                <div className="w-36 border-b border-slate-400 mb-2"></div>
                <p className="text-xs font-bold text-slate-900">
                  {doctor.name}
                </p>
                <p className="text-[10px] text-slate-500">
                  {doctor.qualifications}
                </p>
              </div>
            </div>

            {/* Subtle Prescription Footer */}
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              Prescription generated via MediHive Clinical Suite • Keep
              medicines out of reach of children
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions matching Page 6 */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-[#1e536e]" />
              <span>Print</span>
            </button>

            {onConfirmSave && (
              <button
                type="button"
                onClick={onConfirmSave}
                className="px-5 py-2 rounded-lg bg-[#2da478] hover:bg-[#258d67] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Save</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
