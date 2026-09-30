import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  AppState,
  Patient,
  OPDRecord,
  PatientVisit,
  QueueItem,
  Appointment,
  DoctorProfile,
  ClinicSettings,
  EmailConfig,
  UserAccount,
  QueueStatus,
} from "../types";
import { initialDoctor, initialClinic, initialEmailConfig } from "./mockData";
import { defaultAccounts } from "./storage";
import { syncOpdRecordToGoogle } from "./googleSyncService";

// ==============================================================================
// SANITIZATION HELPERS
// ==============================================================================

export const sanitizeDate = (d?: string | null): string | null => {
  if (!d || typeof d !== "string") return null;
  const trimmed = d.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return null;
};

export const sanitizeNumber = (val: any, fallback = 0): number => {
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

// ==============================================================================
// TYPE CONVERTERS / MAPPERS (Database snake_case <-> Frontend camelCase)
// ==============================================================================

export const mapPatientFromDb = (
  row: any,
  records: OPDRecord[] = [],
): Patient => ({
  id: row.id,
  fullName: row.full_name,
  dob: row.dob || undefined,
  age: Number(row.age) || 0,
  gender: row.gender || "Male",
  mobile: row.mobile || "",
  address: row.address || undefined,
  bloodGroup: row.blood_group || undefined,
  weight: row.weight || undefined,
  height: row.height || undefined,
  emergencyContact: row.emergency_contact || undefined,
  allergies: row.allergies || undefined,
  medicalHistory: row.medical_history || undefined,
  registrationDate:
    row.registration_date || new Date().toISOString().slice(0, 10),
  lastVisitDate: row.last_visit_date || new Date().toISOString().slice(0, 10),
  totalVisits: Number(row.total_visits) || records.length,
  records: records,
  notes: row.notes || undefined,
  createdAt: row.created_at || undefined,
});

export const mapPatientToDb = (p: Patient) => {
  const payload: Record<string, any> = {
    id: p.id,
    full_name: p.fullName,
    dob: sanitizeDate(p.dob),
    age: sanitizeNumber(p.age, 0),
    gender: p.gender || "Male",
    mobile: p.mobile || "",
    address: p.address || null,
    blood_group: p.bloodGroup || null,
    emergency_contact: p.emergencyContact || null,
    allergies: p.allergies || null,
    medical_history: p.medicalHistory || null,
    registration_date:
      sanitizeDate(p.registrationDate) || new Date().toISOString().slice(0, 10),
    last_visit_date:
      sanitizeDate(p.lastVisitDate) || new Date().toISOString().slice(0, 10),
    total_visits: sanitizeNumber(p.totalVisits, p.records ? p.records.length : 0),
    notes: p.notes || null,
    updated_at: new Date().toISOString(),
  };

  if (p.weight) payload.weight = p.weight;
  if (p.height) payload.height = p.height;

  return payload;
};

export const mapOpdRecordFromDb = (row: any): OPDRecord => ({
  id: row.id,
  patientId: row.patient_id,
  visitDate: row.visit_date,
  opdType: row.opd_type || undefined,
  chargeType: row.charge_type || undefined,
  diagnosis: row.diagnosis,
  symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
  complaint: row.complaint || undefined,
  vitals: row.vitals || {},
  uploadedImages: Array.isArray(row.uploaded_images) ? row.uploaded_images : [],
  medicines: Array.isArray(row.medicines) ? row.medicines : [],
  prescriptions: Array.isArray(row.medicines) ? row.medicines : [],
  panchakarmaNotes: row.panchakarma_notes || undefined,
  clinicalNotes: row.clinical_notes || undefined,
  dietaryAdvice: row.dietary_advice || undefined,
  nextVisitDate: row.next_visit_date || undefined,
  tests: row.tests || undefined,
  consultationFee:
    row.consultation_fee != null ? Number(row.consultation_fee) : 0,
  medicineFee: row.medicine_fee != null ? Number(row.medicine_fee) : 0,
  panchakarmaFee: row.panchakarma_fee != null ? Number(row.panchakarma_fee) : 0,
  discountType: row.discount_type || undefined,
  discountValue: row.discount_value != null ? Number(row.discount_value) : 0,
  totalFee: Number(row.total_fee) || 0,
  paymentMode: row.payment_mode || "Cash",
  paymentStatus: row.payment_status || "Paid",
  createdAt: row.created_at || new Date().toISOString(),
});

export const mapOpdRecordToDb = (r: OPDRecord) => ({
  id: r.id,
  patient_id: r.patientId,
  visit_date:
    sanitizeDate(r.visitDate) || new Date().toISOString().slice(0, 10),
  opd_type: r.opdType || null,
  charge_type: r.chargeType || null,
  diagnosis: r.diagnosis || "General Consultation",
  symptoms: Array.isArray(r.symptoms) ? r.symptoms : [],
  complaint: r.complaint || null,
  vitals: r.vitals || {},
  uploaded_images: Array.isArray(r.uploadedImages) ? r.uploadedImages : [],
  medicines: r.medicines || r.prescriptions || [],
  panchakarma_notes: r.panchakarmaNotes || null,
  clinical_notes: r.clinicalNotes || null,
  dietary_advice: r.dietaryAdvice || null,
  next_visit_date: sanitizeDate(r.nextVisitDate),
  tests: r.tests || null,
  consultation_fee: sanitizeNumber(r.consultationFee, 0),
  medicine_fee: sanitizeNumber(r.medicineFee, 0),
  panchakarma_fee: sanitizeNumber(r.panchakarmaFee, 0),
  discount_type: r.discountType || null,
  discount_value: sanitizeNumber(r.discountValue, 0),
  total_fee: sanitizeNumber(r.totalFee, 0),
  payment_mode: r.paymentMode || "Cash",
  payment_status: r.paymentStatus || "Paid",
  created_at: r.createdAt || new Date().toISOString(),
});

export const mapVisitFromDb = (row: any): PatientVisit => ({
  id: row.id,
  patientId: row.patient_id,
  patientName: row.patient_name,
  patientAge: Number(row.patient_age) || 0,
  patientGender: row.patient_gender,
  patientMobile: row.patient_mobile,
  visitDate: row.visit_date,
  visitTime: row.visit_time,
  complaint: row.complaint,
  symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
  symptomDuration: row.symptom_duration || undefined,
  vitals: row.vitals || {},
  receptionistId: row.receptionist_id || undefined,
  receptionistName: row.receptionist_name || undefined,
  queueId: row.queue_id || undefined,
  queueNumber: row.queue_number || undefined,
  status: row.status as QueueStatus,
  createdAt: row.created_at || new Date().toISOString(),
});

export const mapVisitToDb = (v: PatientVisit) => ({
  id: v.id,
  patient_id: v.patientId,
  patient_name: v.patientName,
  patient_age: sanitizeNumber(v.patientAge, 0),
  patient_gender: v.patientGender || "Male",
  patient_mobile: v.patientMobile || "",
  visit_date:
    sanitizeDate(v.visitDate) || new Date().toISOString().slice(0, 10),
  visit_time: v.visitTime || "10:00",
  complaint: v.complaint || "Consultation",
  symptoms: Array.isArray(v.symptoms) ? v.symptoms : [],
  symptom_duration: v.symptomDuration || null,
  vitals: v.vitals || {},
  receptionist_id: v.receptionistId || null,
  receptionist_name: v.receptionistName || null,
  queue_id: v.queueId || null,
  queue_number: v.queueNumber || null,
  status: v.status || "Waiting",
  created_at: v.createdAt || new Date().toISOString(),
});

export const mapQueueItemFromDb = (row: any): QueueItem => ({
  id: row.id,
  queueNumber: row.queue_number,
  sequenceNumber: Number(row.sequence_number) || 0,
  visitId: row.visit_id,
  patientId: row.patient_id,
  patientName: row.patient_name,
  patientAge: Number(row.patient_age) || 0,
  patientGender: row.patient_gender,
  patientMobile: row.patient_mobile,
  complaint: row.complaint,
  symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
  symptomDuration: row.symptom_duration || undefined,
  vitals: row.vitals || {},
  arrivalTime: row.arrival_time,
  visitDate: row.visit_date,
  status: row.status as QueueStatus,
  doctorId: row.doctor_id || undefined,
  calledAt: row.called_at || undefined,
  completedAt: row.completed_at || undefined,
});

export const mapQueueItemToDb = (q: QueueItem) => {
  const parsedQueueNum =
    parseInt((q.queueNumber || "").replace(/\D/g, ""), 10) || 1;
  const safeSeq =
    typeof q.sequenceNumber === "number" &&
    q.sequenceNumber > 0 &&
    q.sequenceNumber < 2147483647
      ? q.sequenceNumber
      : parsedQueueNum;

  return {
    id: q.id,
    queue_number: q.queueNumber,
    sequence_number: safeSeq,
    visit_id: q.visitId || null,
    patient_id: q.patientId,
    patient_name: q.patientName,
    patient_age: sanitizeNumber(q.patientAge, 0),
    patient_gender: q.patientGender || "Male",
    patient_mobile: q.patientMobile || "",
    complaint: q.complaint || "Consultation",
    symptoms: Array.isArray(q.symptoms) ? q.symptoms : [],
    symptom_duration: q.symptomDuration || null,
    vitals: q.vitals || {},
    arrival_time: q.arrivalTime || "10:00",
    visit_date:
      sanitizeDate(q.visitDate) || new Date().toISOString().slice(0, 10),
    status: q.status || "Waiting",
    doctor_id: q.doctorId || null,
    called_at: q.calledAt || null,
    completed_at: q.completedAt || null,
    created_at: new Date().toISOString(),
  };
};

export const mapAppointmentFromDb = (row: any): Appointment => ({
  id: row.id,
  patientId: row.patient_id || "",
  patientName: row.patient_name,
  patientMobile: row.patient_mobile,
  date: row.date,
  time: row.time,
  reason: row.reason,
  type: row.type || "Appointment",
  status: row.status || "Scheduled",
  notes: row.notes || undefined,
});

export const mapAppointmentToDb = (a: Appointment) => ({
  id: a.id,
  patient_id: a.patientId || null,
  patient_name: a.patientName,
  patient_mobile: a.patientMobile,
  date: sanitizeDate(a.date) || new Date().toISOString().slice(0, 10),
  time: a.time || "10:00",
  reason: a.reason || "General Follow-up",
  type: a.type || "Appointment",
  status: a.status || "Scheduled",
  notes: a.notes || null,
  created_at: new Date().toISOString(),
});

// ==============================================================================
// FULL APPLICATION STATE: READ / FETCH (Supabase -> Frontend)
// ==============================================================================

export const fetchFullAppStateFromSupabase =
  async (): Promise<Partial<AppState> | null> => {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const [
        patientsRes,
        opdRes,
        visitsRes,
        queueRes,
        aptsRes,
        notesRes,
        docRes,
        clinicRes,
        emailRes,
      ] = await Promise.all([
        supabase
          .from("patients")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("opd_records")
          .select("*")
          .order("visit_date", { ascending: false }),
        supabase
          .from("patient_visits")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("queue_items")
          .select("*")
          .order("sequence_number", { ascending: true }),
        supabase
          .from("appointments")
          .select("*")
          .order("date", { ascending: true }),
        supabase.from("daily_notes").select("*"),
        supabase.from("doctor_profile").select("*").limit(1).maybeSingle(),
        supabase.from("clinic_settings").select("*").limit(1).maybeSingle(),
        supabase.from("email_config").select("*").limit(1).maybeSingle(),
      ]);

      if (patientsRes.error) {
        console.warn(
          "Supabase fetch patients notice:",
          patientsRes.error.message,
        );
      }

      // Group OPD records by patient_id
      const opdRecordsByPatient: Record<string, OPDRecord[]> = {};
      if (opdRes.data) {
        opdRes.data.forEach((row: any) => {
          const record = mapOpdRecordFromDb(row);
          if (!opdRecordsByPatient[record.patientId]) {
            opdRecordsByPatient[record.patientId] = [];
          }
          opdRecordsByPatient[record.patientId].push(record);
        });
      }

      // Map patients with nested records
      const patients: Patient[] = (patientsRes.data || []).map((row: any) =>
        mapPatientFromDb(row, opdRecordsByPatient[row.id] || []),
      );

      const visits: PatientVisit[] = (visitsRes.data || []).map(mapVisitFromDb);
      const queue: QueueItem[] = (queueRes.data || []).map(mapQueueItemFromDb);
      const appointments: Appointment[] = (aptsRes.data || []).map(
        mapAppointmentFromDb,
      );

      // Map daily notes
      const dailyNotes: Record<string, string> = {};
      if (notesRes.data) {
        notesRes.data.forEach((row: any) => {
          dailyNotes[row.date] = row.note;
        });
      }

      // Map Doctor Profile
      let doctor = initialDoctor;
      if (docRes.data) {
        doctor = {
          name: docRes.data.name || initialDoctor.name,
          qualifications:
            docRes.data.qualifications || initialDoctor.qualifications,
          specialisation:
            docRes.data.specialisation || initialDoctor.specialisation,
          medicalLicenseNo:
            docRes.data.medical_license_no || initialDoctor.medicalLicenseNo,
          email: docRes.data.email || initialDoctor.email,
          contact: docRes.data.contact || initialDoctor.contact,
          photoUrl: docRes.data.photo_url || "",
          consultationFee:
            docRes.data.consultation_fee != null
              ? Number(docRes.data.consultation_fee)
              : 500,
        };
      }

      // Map Clinic Settings
      let clinic = initialClinic;
      if (clinicRes.data) {
        clinic = {
          name: clinicRes.data.name || initialClinic.name,
          address: clinicRes.data.address || initialClinic.address,
          phone: clinicRes.data.phone || initialClinic.phone,
          email: clinicRes.data.email || initialClinic.email,
          website: clinicRes.data.website || initialClinic.website,
          operatingHours:
            clinicRes.data.operating_hours || initialClinic.operatingHours,
          logoUrl: clinicRes.data.logo_url || "",
          currency: clinicRes.data.currency || "₹",
          taxNumber: clinicRes.data.tax_number || undefined,
        };
      }

      // Map Email Config
      let emailConfig = initialEmailConfig;
      if (emailRes.data) {
        emailConfig = {
          smtpEmail: emailRes.data.smtp_email || initialEmailConfig.smtpEmail,
          smtpAppPassword:
            emailRes.data.smtp_app_password ||
            initialEmailConfig.smtpAppPassword,
          smtpServer:
            emailRes.data.smtp_server || initialEmailConfig.smtpServer,
          smtpPort:
            emailRes.data.smtp_port != null
              ? Number(emailRes.data.smtp_port)
              : 587,
          enableNotifications: emailRes.data.enable_notifications ?? true,
        };
      }

      return {
        doctor,
        clinic,
        emailConfig,
        patients,
        visits,
        queue,
        appointments,
        dailyNotes,
      };
    } catch (err) {
      console.warn("Failed to load application state from Supabase:", err);
      return null;
    }
  };

// ==============================================================================
// PATIENTS CRUD OPERATIONS
// ==============================================================================

/**
 * Safely upserts a patient record into Supabase.
 * If the remote database schema is missing newly added columns (such as 'height' or 'weight'),
 * it catches PGRST204, removes the unrecognized column(s), and automatically retries
 * so user registrations and updates never fail.
 */
export const safeUpsertPatient = async (payload: Record<string, any>) => {
  let currentPayload = { ...payload };
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.from("patients").upsert(currentPayload);
    if (!error) {
      return { data, error: null };
    }
    if (error.code === "PGRST204") {
      const match = error.message?.match(/Could not find the '([^']+)' column/);
      const missingCol = match ? match[1] : null;
      if (missingCol && missingCol in currentPayload) {
        console.warn(
          `[Supabase] Column '${missingCol}' does not exist on 'patients' table in Supabase. Retrying without this field. Run the SQL migration to add it!`,
        );
        delete currentPayload[missingCol];
        continue;
      }
    }
    return { data: null, error };
  }
  return await supabase.from("patients").upsert(currentPayload);
};

export const createPatientInSupabase = async (
  patient: Patient,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const payload = mapPatientToDb(patient);
    const { error } = await safeUpsertPatient(payload);
    if (error) throw error;
    console.log(
      `[Supabase] Patient ${patient.id} (${patient.fullName}) synced to cloud.`,
    );
    return true;
  } catch (err) {
    console.error("Supabase createPatient error:", err);
    return false;
  }
};

export const updatePatientInSupabase = async (
  patient: Patient,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const payload = mapPatientToDb(patient);
    const { error } = await safeUpsertPatient(payload);
    if (error) throw error;
    console.log(`[Supabase] Patient ${patient.id} updated in cloud.`);
    return true;
  } catch (err) {
    console.error("Supabase updatePatient error:", err);
    return false;
  }
};

export const deletePatientInSupabase = async (
  patientId: string,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", patientId);
    if (error) throw error;
    console.log(`[Supabase] Patient ${patientId} deleted from cloud.`);
    return true;
  } catch (err) {
    console.error("Supabase deletePatient error:", err);
    return false;
  }
};

// ==============================================================================
// OPD RECORDS & CONSULTATIONS (CREATE / INSERT)
// ==============================================================================

export const saveOpdRecordInSupabase = async (
  patient: Patient,
  opdRecord: OPDRecord,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    // 1. Ensure patient exists in Supabase (upsert) to satisfy FK constraint on opd_records.patient_id
    const patientPayload = mapPatientToDb(patient);
    const { error: patErr } = await safeUpsertPatient(patientPayload);
    if (patErr) throw patErr;

    // 2. Insert or update OPD Record
    const recordPayload = mapOpdRecordToDb(opdRecord);
    const { error: opdErr } = await supabase
      .from("opd_records")
      .upsert(recordPayload);
    if (opdErr) throw opdErr;

    console.log(
      `[Supabase] OPD Record ${opdRecord.id} saved for patient ${patient.fullName}.`,
    );

    // 3. Register and trigger background Google Drive & Sheets synchronization
    try {
      (async () => {
        try {
          await supabase.from("google_sync_records").upsert({
            opd_id: opdRecord.id,
            patient_id: patient.id,
            status: "pending",
            drive_synced: false,
            sheet_synced: false,
            updated_at: new Date().toISOString(),
          });
          syncOpdRecordToGoogle(opdRecord.id).catch((syncErr) => {
            console.warn(
              `[Google Sync Notice] Background sync for ${opdRecord.id}:`,
              syncErr?.message || syncErr,
            );
          });
        } catch {
          // Non-blocking: table might not be migrated yet
        }
      })();
    } catch {
      // Non-blocking
    }

    return true;
  } catch (err) {
    console.error("Supabase saveOpdRecord error:", err);
    return false;
  }
};

// ==============================================================================
// VISITS & LIVE QUEUE CRUD OPERATIONS
// ==============================================================================

export const insertVisitAndQueueInSupabase = async (
  visit: PatientVisit,
  queueItem: QueueItem,
  patient?: Patient,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    // 1. Ensure the patient exists in patients table first (satisfies FK in patient_visits & queue_items)
    if (patient) {
      const patientPayload = mapPatientToDb(patient);
      await safeUpsertPatient(patientPayload);
    } else {
      // Create minimal patient record if not already present
      const minimalPatient = {
        id: visit.patientId,
        full_name: visit.patientName,
        age: sanitizeNumber(visit.patientAge, 0),
        gender: visit.patientGender || "Male",
        mobile: visit.patientMobile || "",
        registration_date:
          sanitizeDate(visit.visitDate) ||
          new Date().toISOString().slice(0, 10),
        last_visit_date:
          sanitizeDate(visit.visitDate) ||
          new Date().toISOString().slice(0, 10),
        total_visits: 1,
      };
      await safeUpsertPatient(minimalPatient);
    }

    const visitPayload = mapVisitToDb(visit);
    const queuePayload = mapQueueItemToDb(queueItem);

    // 2. Insert patient visit first (queue_items references patient_visits.id)
    const { error: visitErr } = await supabase
      .from("patient_visits")
      .upsert(visitPayload);
    if (visitErr) throw visitErr;

    // 3. Insert queue item
    const { error: queueErr } = await supabase
      .from("queue_items")
      .upsert(queuePayload);
    if (queueErr) throw queueErr;

    console.log(
      `[Supabase] Visit ${visit.id} & Queue ${queueItem.queueNumber} pushed to cloud.`,
    );
    return true;
  } catch (err) {
    console.error("Supabase insertVisitAndQueue error:", err);
    return false;
  }
};

export const updateQueueItemStatusInSupabase = async (
  queueId: string,
  status: QueueStatus,
  extras?: {
    doctorId?: string;
    calledAt?: string;
    completedAt?: string;
  },
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const updatePayload: any = {
      status,
    };
    if (extras?.doctorId) updatePayload.doctor_id = extras.doctorId;
    if (extras?.calledAt) updatePayload.called_at = extras.calledAt;
    if (extras?.completedAt) updatePayload.completed_at = extras.completedAt;

    const [qRes, vRes] = await Promise.all([
      supabase.from("queue_items").update(updatePayload).eq("id", queueId),
      supabase
        .from("patient_visits")
        .update({ status })
        .eq("queue_id", queueId),
    ]);

    if (qRes.error) throw qRes.error;
    if (vRes.error) throw vRes.error;

    console.log(`[Supabase] Queue item ${queueId} updated to ${status}.`);
    return true;
  } catch (err) {
    console.error("Supabase updateQueueItemStatus error:", err);
    return false;
  }
};

export const cancelQueueTicketInSupabase = async (
  queueId: string,
): Promise<boolean> => {
  return updateQueueItemStatusInSupabase(queueId, "Cancelled");
};

// ==============================================================================
// APPOINTMENTS CRUD OPERATIONS
// ==============================================================================

export const saveAppointmentInSupabase = async (
  appointment: Appointment,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const payload = mapAppointmentToDb(appointment);
    const { error } = await supabase.from("appointments").upsert(payload);
    if (error) throw error;
    console.log(`[Supabase] Appointment ${appointment.id} saved to cloud.`);
    return true;
  } catch (err) {
    console.error("Supabase saveAppointment error:", err);
    return false;
  }
};

export const deleteAppointmentInSupabase = async (
  id: string,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) throw error;
    console.log(`[Supabase] Appointment ${id} deleted from cloud.`);
    return true;
  } catch (err) {
    console.error("Supabase deleteAppointment error:", err);
    return false;
  }
};

// ==============================================================================
// CALENDAR DAILY NOTES CRUD
// ==============================================================================

export const deleteOpdRecordInSupabase = async (
  recordId: string,
  patientId: string,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from("opd_records")
      .delete()
      .eq("id", recordId);
    if (error) throw error;
    console.log(`[Supabase] OPD Record ${recordId} deleted.`);
    return true;
  } catch (err) {
    console.error("Supabase deleteOpdRecord error:", err);
    return false;
  }
};

export const deleteQueueItemInSupabase = async (
  queueId: string,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from("queue_items")
      .delete()
      .eq("id", queueId);
    if (error) throw error;
    console.log(`[Supabase] Queue item ${queueId} deleted.`);
    return true;
  } catch (err) {
    console.error("Supabase deleteQueueItem error:", err);
    return false;
  }
};

export const deleteVisitInSupabase = async (
  visitId: string,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from("patient_visits")
      .delete()
      .eq("id", visitId);
    if (error) throw error;
    console.log(`[Supabase] Visit ${visitId} deleted.`);
    return true;
  } catch (err) {
    console.error("Supabase deleteVisit error:", err);
    return false;
  }
};

export const clearCompletedQueueInSupabase = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from("queue_items")
      .delete()
      .in("status", ["Completed", "Cancelled"]);
    if (error) throw error;
    console.log(`[Supabase] Cleared completed/cancelled queue tickets.`);
    return true;
  } catch (err) {
    console.error("Supabase clearCompletedQueue error:", err);
    return false;
  }
};

export const saveDailyNoteInSupabase = async (
  date: string,
  note: string,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const cleanDate =
      sanitizeDate(date) || new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("daily_notes").upsert({
      date: cleanDate,
      note,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    console.log(`[Supabase] Daily note for ${cleanDate} saved.`);
    return true;
  } catch (err) {
    console.error("Supabase saveDailyNote error:", err);
    return false;
  }
};

export const deleteDailyNoteInSupabase = async (
  date: string,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const cleanDate = sanitizeDate(date) || date;
    const { error } = await supabase
      .from("daily_notes")
      .delete()
      .eq("date", cleanDate);
    if (error) throw error;
    console.log(`[Supabase] Daily note for ${cleanDate} deleted.`);
    return true;
  } catch (err) {
    console.error("Supabase deleteDailyNote error:", err);
    return false;
  }
};

export const clearAllClinicDataFromSupabase = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    // Delete transactional items in order
    await supabase.from("queue_items").delete().neq("id", "");
    await supabase.from("patient_visits").delete().neq("id", "");
    await supabase.from("opd_records").delete().neq("id", "");
    await supabase.from("appointments").delete().neq("id", "");
    await supabase.from("daily_notes").delete().neq("date", "1970-01-01");
    const { error } = await supabase.from("patients").delete().neq("id", "");
    if (error) throw error;
    console.log(`[Supabase] All clinic data cleared from cloud.`);
    return true;
  } catch (err) {
    console.error("Supabase clearAllClinicData error:", err);
    return false;
  }
};

// ==============================================================================
// CLINIC & DOCTOR SETTINGS CRUD
// ==============================================================================

export const updateDoctorProfileInSupabase = async (
  doctor: DoctorProfile,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data: existing } = await supabase
      .from("doctor_profile")
      .select("id")
      .limit(1)
      .maybeSingle();
    const rowId = existing?.id || 1;

    const { error } = await supabase.from("doctor_profile").upsert({
      id: rowId,
      name: doctor.name,
      qualifications: doctor.qualifications,
      specialisation: doctor.specialisation,
      medical_license_no: doctor.medicalLicenseNo,
      email: doctor.email,
      contact: doctor.contact,
      photo_url: doctor.photoUrl || null,
      consultation_fee: sanitizeNumber(doctor.consultationFee, 500),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    console.log(`[Supabase] Doctor profile updated.`);
    return true;
  } catch (err) {
    console.error("Supabase updateDoctorProfile error:", err);
    return false;
  }
};

export const updateClinicSettingsInSupabase = async (
  clinic: ClinicSettings,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data: existing } = await supabase
      .from("clinic_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    const rowId = existing?.id || 1;

    const { error } = await supabase.from("clinic_settings").upsert({
      id: rowId,
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
      email: clinic.email,
      website: clinic.website || null,
      operating_hours: clinic.operatingHours,
      logo_url: clinic.logoUrl || null,
      currency: clinic.currency || "₹",
      tax_number: clinic.taxNumber || null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    console.log(`[Supabase] Clinic settings updated.`);
    return true;
  } catch (err) {
    console.error("Supabase updateClinicSettings error:", err);
    return false;
  }
};

export const updateEmailConfigInSupabase = async (
  config: EmailConfig,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data: existing } = await supabase
      .from("email_config")
      .select("id")
      .limit(1)
      .maybeSingle();
    const rowId = existing?.id || 1;

    const { error } = await supabase.from("email_config").upsert({
      id: rowId,
      smtp_email: config.smtpEmail,
      smtp_app_password: config.smtpAppPassword,
      smtp_server: config.smtpServer || "smtp.gmail.com",
      smtp_port: sanitizeNumber(config.smtpPort, 587),
      enable_notifications: config.enableNotifications,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    console.log(`[Supabase] Email config updated.`);
    return true;
  } catch (err) {
    console.error("Supabase updateEmailConfig error:", err);
    return false;
  }
};

// ==============================================================================
// SUPPORT TICKETS
// ==============================================================================

export interface SupportTicketRecord {
  id: string;
  topic: string;
  subject: string;
  message: string;
  status?: string;
  senderName?: string;
  senderEmail?: string;
  createdAt: string;
}

export const submitSupportTicketInSupabase = async (
  ticket: SupportTicketRecord,
): Promise<boolean> => {
  // Always safely cache locally first so user query is never lost
  try {
    const key = "medihive_support_tickets_v1";
    const existingRaw = localStorage.getItem(key);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    localStorage.setItem(key, JSON.stringify([ticket, ...existing]));
  } catch (e) {
    console.warn("Local support ticket cache warning:", e);
  }

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase.from("support_tickets").insert({
      id: ticket.id,
      topic: ticket.topic,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status || "Open",
      sender_name: ticket.senderName || null,
      sender_email: ticket.senderEmail || null,
      created_at: ticket.createdAt,
    });
    if (error) {
      console.warn("Supabase support_tickets notice:", error.message);
    }
    return true;
  } catch (err) {
    console.warn("Supabase support_tickets notice:", err);
    return true;
  }
};

// ==============================================================================
// USER ACCOUNTS & AUTHENTICATION CRUD
// ==============================================================================

export const fetchUserAccountsFromSupabase = async (): Promise<
  UserAccount[]
> => {
  if (!isSupabaseConfigured()) return defaultAccounts;
  try {
    const { data, error } = await supabase.from("user_accounts").select("*");
    if (error || !data || data.length === 0) {
      return defaultAccounts;
    }
    return data.map((u: any) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      passwordHash: u.password_hash,
    }));
  } catch (err) {
    console.warn("Supabase fetchUserAccounts fallback to default:", err);
    return defaultAccounts;
  }
};

export const updateUserPasswordInSupabase = async (
  username: string,
  newPassword: string,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from("user_accounts")
      .update({ password_hash: newPassword.trim() })
      .eq("username", username.trim().toLowerCase());
    if (error) throw error;
    console.log(`[Supabase] User password updated for ${username}.`);
    return true;
  } catch (err) {
    console.error("Supabase updateUserPassword error:", err);
    return false;
  }
};

// ==============================================================================
// SUPABASE REALTIME SUBSCRIPTIONS (Doctor & Receptionist multi-screen sync)
// ==============================================================================

export type RealtimeSyncStatus =
  | "CONNECTED"
  | "CONNECTING"
  | "DISCONNECTED"
  | "ERROR";

export const subscribeToClinicRealtime = (
  onSync: (table: string, eventType: string, payload: any) => void,
  onStatusChange?: (status: RealtimeSyncStatus) => void,
): (() => void) => {
  if (!isSupabaseConfigured()) {
    onStatusChange?.("DISCONNECTED");
    return () => {};
  }

  try {
    onStatusChange?.("CONNECTING");
    console.log("[Realtime] Subscribing...");

    // Use a unique channel instance ID to prevent async StrictMode / re-render teardown collisions
    const channelId = `medihive_clinic_feed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_items" },
        (payload) => {
          console.log("[Realtime] Event:", {
            table: "queue_items",
            ...payload,
          });
          onSync("queue_items", payload.eventType, payload);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_visits" },
        (payload) => {
          console.log("[Realtime] Event:", {
            table: "patient_visits",
            ...payload,
          });
          onSync("patient_visits", payload.eventType, payload);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patients" },
        (payload) => {
          console.log("[Realtime] Event:", { table: "patients", ...payload });
          onSync("patients", payload.eventType, payload);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          console.log("[Realtime] Event:", {
            table: "appointments",
            ...payload,
          });
          onSync("appointments", payload.eventType, payload);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opd_records" },
        (payload) => {
          console.log("[Realtime] Event:", {
            table: "opd_records",
            ...payload,
          });
          onSync("opd_records", payload.eventType, payload);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_notes" },
        (payload) => {
          console.log("[Realtime] Event:", {
            table: "daily_notes",
            ...payload,
          });
          onSync("daily_notes", payload.eventType, payload);
        },
      );

    channel.subscribe((status, err) => {
      console.log("[Realtime] Status:", status, err || "");
      if (status === "SUBSCRIBED") {
        console.log(
          `[Supabase Realtime] Connected to live clinic WebSocket feed (${channelId}).`,
        );
        onStatusChange?.("CONNECTED");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("[Supabase Realtime] Channel subscription error:", err);
        onStatusChange?.("ERROR");
      } else if (status === "CLOSED") {
        onStatusChange?.("DISCONNECTED");
      }
    });

    return () => {
      console.log(
        `[Supabase Realtime] Unsubscribing from clinic feed (${channelId})...`,
      );
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn("Supabase Realtime subscription error:", err);
    onStatusChange?.("ERROR");
    return () => {};
  }
};
