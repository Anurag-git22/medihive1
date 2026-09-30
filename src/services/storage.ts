import * as XLSX from "xlsx";
import { format } from "date-fns";
import {
  AppState,
  Patient,
  OPDRecord,
  DoctorProfile,
  ClinicSettings,
  EmailConfig,
  Appointment,
  UserAccount,
  PatientVisit,
  PatientVitals,
  QueueItem,
  QueueStatus,
} from "../types";
import { initialDoctor, initialClinic, initialEmailConfig } from "./mockData";
import {
  insertVisitAndQueueInSupabase,
  updateQueueItemStatusInSupabase,
  cancelQueueTicketInSupabase,
  updateUserPasswordInSupabase,
  saveOpdRecordInSupabase,
  fetchUserAccountsFromSupabase,
} from "./supabaseService";

export const getLocalDateString = (d: Date = new Date()): string =>
  format(d, "yyyy-MM-dd");

const STORAGE_KEY = "medihive_app_state_v2";
const AUTH_KEY = "medihive_auth_user";
const ACCOUNTS_KEY = "medihive_accounts_v2";
const QUEUE_CHANNEL_NAME = "medihive_queue_sync_channel";

// Default multi-role accounts
export const defaultAccounts: UserAccount[] = [
  {
    id: "usr-doc",
    username: "doctor",
    name: "Dr. Shweta N. Sawant",
    role: "doctor",
    passwordHash: "doctor123",
  },
  {
    id: "usr-admin",
    username: "admin",
    name: "Dr. Shweta (Admin)",
    role: "doctor",
    passwordHash: "admin123",
  },
  {
    id: "usr-rec",
    username: "receptionist",
    name: "Clinic Reception",
    role: "receptionist",
    passwordHash: "reception123",
  },
  {
    id: "usr-rec2",
    username: "reception",
    name: "Reception Desk",
    role: "receptionist",
    passwordHash: "reception123",
  },
];

export const getStoredAccounts = (): UserAccount[] => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error loading accounts", e);
  }
  return defaultAccounts;
};

export const syncAccountsFromSupabase = async (): Promise<void> => {
  try {
    const accounts = await fetchUserAccountsFromSupabase();
    if (accounts && accounts.length > 0) {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    }
  } catch (e) {
    console.warn("Sync accounts from Supabase notice:", e);
  }
};

export interface AuthResult {
  success: boolean;
  user: UserAccount | null;
  error?: "INVALID_CREDENTIALS" | "ROLE_MISMATCH";
  errorMessage?: string;
}

export const authenticateUser = (
  username: string,
  password: string,
  expectedRole?: "doctor" | "receptionist",
): AuthResult => {
  const accounts = getStoredAccounts();
  const trimmedUser = username.trim().toLowerCase();
  const trimmedPass = password.trim();

  const matchingAccount = accounts.find(
    (acc) =>
      acc.username.toLowerCase() === trimmedUser &&
      acc.passwordHash === trimmedPass,
  );

  if (!matchingAccount) {
    return {
      success: false,
      user: null,
      error: "INVALID_CREDENTIALS",
      errorMessage:
        "Invalid username or password. Please verify your credentials.",
    };
  }

  // Check if role matches expectedRole if explicitly requested
  if (expectedRole) {
    const isDoctorRole =
      matchingAccount.role === "doctor" || matchingAccount.role === "admin";
    const isRoleValid =
      (expectedRole === "doctor" && isDoctorRole) ||
      (expectedRole === "receptionist" &&
        matchingAccount.role === "receptionist");

    if (!isRoleValid) {
      const roleName = isDoctorRole ? "Doctor" : "Receptionist";
      return {
        success: false,
        user: null,
        error: "ROLE_MISMATCH",
        errorMessage: `Invalid credentials for this login type. This account has ${roleName} access.`,
      };
    }
  }

  return {
    success: true,
    user: matchingAccount,
  };
};

export const validateCredentials = (
  username: string,
  password: string,
  expectedRole?: "doctor" | "receptionist",
): UserAccount | null => {
  const accounts = getStoredAccounts();
  const trimmedUser = username.trim().toLowerCase();
  const trimmedPass = password.trim();
  const found = accounts.find((acc) => {
    const matchUser = acc.username.toLowerCase() === trimmedUser;
    const matchPass = acc.passwordHash === trimmedPass;
    if (!matchUser || !matchPass) return false;

    if (expectedRole) {
      if (expectedRole === "doctor") {
        return acc.role === "doctor" || acc.role === "admin";
      }
      return acc.role === expectedRole;
    }
    return true;
  });
  return found || null;
};

export const updateUserPassword = (
  username: string,
  newPassword: string,
): boolean => {
  try {
    const accounts = getStoredAccounts();
    const updated = accounts.map((acc) => {
      if (acc.username.toLowerCase() === username.trim().toLowerCase()) {
        return { ...acc, passwordHash: newPassword.trim() };
      }
      return acc;
    });
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
    // Persist to Supabase
    updateUserPasswordInSupabase(username, newPassword).catch((err) => {
      console.warn("Supabase updateUserPassword sync:", err);
    });
    return true;
  } catch (e) {
    console.error("Error updating password", e);
    return false;
  }
};

export const getStoredAuthUser = (): UserAccount | null => {
  try {
    if (typeof window !== "undefined") {
      const sessionData = sessionStorage.getItem(AUTH_KEY);
      if (sessionData) return JSON.parse(sessionData);
      const localData = localStorage.getItem(AUTH_KEY);
      if (localData) return JSON.parse(localData);
    }
  } catch (e) {
    console.error("Error loading auth user", e);
  }
  return null;
};

export const setStoredAuthUser = (user: UserAccount | null) => {
  if (typeof window === "undefined") return;
  if (user) {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_KEY);
  }
};

// Real-time synchronization via BroadcastChannel & Storage events
let broadcastChannelInstance: BroadcastChannel | null = null;
const getBroadcastChannel = (): BroadcastChannel | null => {
  if (typeof window === "undefined" || !("BroadcastChannel" in window))
    return null;
  if (!broadcastChannelInstance) {
    try {
      broadcastChannelInstance = new BroadcastChannel(QUEUE_CHANNEL_NAME);
    } catch (err) {
      console.warn("BroadcastChannel creation error:", err);
    }
  }
  return broadcastChannelInstance;
};

export const broadcastQueueEvent = (event: { type: string; payload?: any }) => {
  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ ...event, timestamp: Date.now() });
    }
  } catch (err) {
    console.warn("BroadcastChannel postMessage error:", err);
  }
};

export const subscribeQueueEvents = (
  callback: (event: any) => void,
): (() => void) => {
  if (typeof window === "undefined") return () => {};

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      callback({ type: "STORAGE_SYNC", timestamp: Date.now() });
    }
  };

  const channel = getBroadcastChannel();
  const messageHandler = (msg: MessageEvent) => {
    if (msg?.data) {
      callback(msg.data);
    }
  };

  if (channel) {
    channel.addEventListener("message", messageHandler);
  }

  window.addEventListener("storage", storageHandler);

  return () => {
    if (channel) {
      channel.removeEventListener("message", messageHandler);
    }
    window.removeEventListener("storage", storageHandler);
  };
};

// Generate next Visit ID (e.g. VIS-2026-001)
export const generateNextVisitId = (visits: PatientVisit[]): string => {
  const currentYear = new Date().getFullYear();
  let maxNum = 0;
  (visits || []).forEach((v) => {
    const match = v.id.match(/VIS-\d+-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = maxNum + 1;
  return `VIS-${currentYear}-${nextNum.toString().padStart(3, "0")}`;
};

// Generate next Queue Number (e.g. Q-001)
export const generateNextQueueNumber = (queue: QueueItem[]): string => {
  const today = getLocalDateString();
  const todaysItems = (queue || []).filter((q) => q.visitDate === today);
  let maxNum = 0;
  todaysItems.forEach((item) => {
    const match = item.queueNumber.match(/Q-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = maxNum + 1;
  return `Q-${nextNum.toString().padStart(3, "0")}`;
};

export const loadAppState = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        currentUser: getStoredAuthUser(),
        doctor: parsed.doctor || initialDoctor,
        clinic: parsed.clinic || initialClinic,
        emailConfig: parsed.emailConfig || initialEmailConfig,
        patients: parsed.patients || [],
        visits: parsed.visits || [],
        queue: parsed.queue || [],
        appointments: parsed.appointments || [],
        dailyNotes: parsed.dailyNotes || {},
      };
    }
  } catch (err) {
    console.error("Failed to load state from localStorage:", err);
  }

  const freshState: AppState = {
    currentUser: getStoredAuthUser(),
    doctor: initialDoctor,
    clinic: initialClinic,
    emailConfig: initialEmailConfig,
    patients: [],
    visits: [],
    queue: [],
    appointments: [],
    dailyNotes: {},
  };
  saveAppState(freshState);
  return freshState;
};

export const saveAppState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    broadcastQueueEvent({ type: "CLINIC_STATE_UPDATED", payload: state });
  } catch (err) {
    console.error("Failed to save state to localStorage:", err);
  }
};

// Helper: Generate next Patient ID (e.g. P0004)
export const generateNextPatientId = (patients: Patient[]): string => {
  if (!patients || patients.length === 0) return "P0001";
  const numericIds = patients
    .map((p) => {
      const match = p.id.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  const nextNum = maxId + 1;
  return `P${nextNum.toString().padStart(4, "0")}`;
};

// Helper: Generate next OPD record ID (e.g. OPD-2026-004)
export const generateNextOpdId = (patients: Patient[]): string => {
  const currentYear = new Date().getFullYear();
  let maxNum = 0;
  patients.forEach((p) => {
    p.records.forEach((r) => {
      const match = r.id.match(/OPD-\d+-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
  });
  const nextNum = maxNum + 1;
  return `OPD-${currentYear}-${nextNum.toString().padStart(3, "0")}`;
};

// Add new visit and create queue item in FIFO queue
export const createVisitAndAddToQueue = (
  appState: AppState,
  patient: Patient,
  visitInput: {
    complaint: string;
    symptoms: string[];
    symptomDuration?: string;
    vitals: PatientVitals;
    receptionistId?: string;
    receptionistName?: string;
  },
): {
  updatedState: AppState;
  newQueueItem: QueueItem;
  newVisit: PatientVisit;
} => {
  const visitId = generateNextVisitId(appState.visits);
  const queueNumber = generateNextQueueNumber(appState.queue);
  const today = getLocalDateString();
  const timeNow = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const queueId = `Q-${Date.now()}`;

  // Check if any patient is currently "With Doctor" or "Next"
  const hasActivePatient = (appState.queue || []).some(
    (q) => q.status === "With Doctor" && q.visitDate === today,
  );
  const hasNextPatient = (appState.queue || []).some(
    (q) => q.status === "Next" && q.visitDate === today,
  );

  // Strict FIFO: if no patient is currently with doctor and none is next, mark as Next, else Waiting
  const initialStatus: QueueStatus =
    !hasActivePatient && !hasNextPatient ? "Next" : "Waiting";

  const newVisit: PatientVisit = {
    id: visitId,
    patientId: patient.id,
    patientName: patient.fullName,
    patientAge: patient.age,
    patientGender: patient.gender,
    patientMobile: patient.mobile,
    visitDate: today,
    visitTime: timeNow,
    complaint: visitInput.complaint,
    symptoms: visitInput.symptoms,
    symptomDuration: visitInput.symptomDuration,
    vitals: visitInput.vitals,
    receptionistId: visitInput.receptionistId,
    receptionistName: visitInput.receptionistName,
    queueId: queueId,
    queueNumber: queueNumber,
    status: initialStatus,
    createdAt: new Date().toISOString(),
  };

  const newQueueItem: QueueItem = {
    id: queueId,
    queueNumber: queueNumber,
    sequenceNumber: Date.now(),
    visitId: visitId,
    patientId: patient.id,
    patientName: patient.fullName,
    patientAge: patient.age,
    patientGender: patient.gender,
    patientMobile: patient.mobile,
    complaint: visitInput.complaint,
    symptoms: visitInput.symptoms,
    symptomDuration: visitInput.symptomDuration,
    vitals: visitInput.vitals,
    arrivalTime: timeNow,
    visitDate: today,
    status: initialStatus,
  };

  const updatedState: AppState = {
    ...appState,
    visits: [newVisit, ...(appState.visits || [])],
    queue: [...(appState.queue || []), newQueueItem],
  };

  saveAppState(updatedState);
  broadcastQueueEvent({ type: "QUEUE_UPDATED", payload: { newQueueItem } });

  // Persist to Supabase in background
  insertVisitAndQueueInSupabase(newVisit, newQueueItem).catch((err) => {
    console.warn("Supabase insertVisitAndQueue sync notice:", err);
  });

  return { updatedState, newQueueItem, newVisit };
};

// Doctor calls patient into cabin
export const callPatientIntoCabin = (
  appState: AppState,
  queueId?: string,
): { updatedState: AppState; activePatient: QueueItem | null } => {
  const today = getLocalDateString();
  const queue = [...(appState.queue || [])];

  // Target item to call: either specified queueId, or the first 'Next', or the first 'Waiting'
  let targetIndex = -1;
  if (queueId) {
    targetIndex = queue.findIndex((q) => q.id === queueId);
  } else {
    targetIndex = queue.findIndex(
      (q) => q.status === "Next" && q.visitDate === today,
    );
    if (targetIndex === -1) {
      targetIndex = queue.findIndex(
        (q) => q.status === "Waiting" && q.visitDate === today,
      );
    }
  }

  if (targetIndex === -1) {
    return { updatedState: appState, activePatient: null };
  }

  const nowIso = new Date().toISOString();
  const updatedItem: QueueItem = {
    ...queue[targetIndex],
    status: "With Doctor",
    calledAt: nowIso,
  };
  queue[targetIndex] = updatedItem;

  // Make sure the next waiting patient in line is marked 'Next'
  let foundNext = false;
  for (let i = 0; i < queue.length; i++) {
    if (
      i !== targetIndex &&
      queue[i].visitDate === today &&
      queue[i].status === "Waiting"
    ) {
      if (!foundNext) {
        queue[i] = { ...queue[i], status: "Next" };
        foundNext = true;
        // Sync next status to Supabase
        updateQueueItemStatusInSupabase(queue[i].id, "Next").catch(() => {});
      }
    }
  }

  // Update corresponding visit status
  const updatedVisits = (appState.visits || []).map((v) =>
    v.queueId === updatedItem.id
      ? { ...v, status: "With Doctor" as QueueStatus }
      : v,
  );

  const updatedState: AppState = {
    ...appState,
    queue,
    visits: updatedVisits,
  };

  saveAppState(updatedState);
  broadcastQueueEvent({
    type: "PATIENT_CALLED",
    payload: { activePatient: updatedItem },
  });

  // Persist to Supabase in background
  updateQueueItemStatusInSupabase(updatedItem.id, "With Doctor", {
    calledAt: nowIso,
  }).catch((err) => {
    console.warn("Supabase callPatientIntoCabin sync notice:", err);
  });

  return { updatedState, activePatient: updatedItem };
};

// Doctor completes consultation and automatically calls next FIFO patient
export const completeConsultationAndAdvanceQueue = (
  appState: AppState,
  queueId: string,
  opdRecord: OPDRecord,
): { updatedState: AppState; nextPatient: QueueItem | null } => {
  const today = getLocalDateString();
  const queue = [...(appState.queue || [])];
  const qIdx = queue.findIndex((q) => q.id === queueId);

  const completedTime = new Date().toISOString();
  if (qIdx !== -1) {
    queue[qIdx] = {
      ...queue[qIdx],
      status: "Completed",
      completedAt: completedTime,
    };
  }

  // Save the OPD record to the patient's record history
  let savedPatientRecord: Patient | null = null;
  const updatedPatients = (appState.patients || []).map((p) => {
    if (p.id === opdRecord.patientId) {
      const records = [opdRecord, ...(p.records || [])];
      savedPatientRecord = {
        ...p,
        totalVisits: (p.totalVisits || 0) + 1,
        lastVisitDate: opdRecord.visitDate || today,
        records,
      };
      return savedPatientRecord;
    }
    return p;
  });

  // Update visit record
  const updatedVisits = (appState.visits || []).map((v) =>
    v.queueId === queueId ? { ...v, status: "Completed" as QueueStatus } : v,
  );

  // Automatically find the next FIFO patient
  let nextPatientIdx = queue.findIndex(
    (q) => q.visitDate === today && q.status === "Next",
  );
  if (nextPatientIdx === -1) {
    nextPatientIdx = queue.findIndex(
      (q) => q.visitDate === today && q.status === "Waiting",
    );
  }

  let nextPatient: QueueItem | null = null;
  if (nextPatientIdx !== -1) {
    nextPatient = {
      ...queue[nextPatientIdx],
      status: "Next",
    };
    queue[nextPatientIdx] = nextPatient;
  }

  const updatedState: AppState = {
    ...appState,
    patients: updatedPatients,
    visits: updatedVisits,
    queue,
  };

  saveAppState(updatedState);
  broadcastQueueEvent({
    type: "CONSULTATION_COMPLETED",
    payload: { completedQueueId: queueId, nextPatient },
  });

  // Persist completed consultation & OPD record to Supabase
  if (savedPatientRecord) {
    saveOpdRecordInSupabase(savedPatientRecord, opdRecord).catch((err) => {
      console.warn("Supabase saveOpdRecord sync notice:", err);
    });
  }
  updateQueueItemStatusInSupabase(queueId, "Completed", {
    completedAt: completedTime,
  }).catch((err) => {
    console.warn("Supabase completeConsultation sync notice:", err);
  });
  if (nextPatient) {
    updateQueueItemStatusInSupabase(nextPatient.id, "Next").catch(() => {});
  }

  return { updatedState, nextPatient };
};

// Cancel a queue item (patient leaves before consultation)
export const cancelPatientQueueItem = (
  appState: AppState,
  queueId: string,
): AppState => {
  const today = getLocalDateString();
  const queue = (appState.queue || []).map((q) =>
    q.id === queueId ? { ...q, status: "Cancelled" as QueueStatus } : q,
  );

  // Ensure next waiting patient becomes 'Next' if cancelled one was 'Next'
  let hasNext = queue.some((q) => q.status === "Next" && q.visitDate === today);
  if (!hasNext) {
    const firstWaitingIdx = queue.findIndex(
      (q) => q.status === "Waiting" && q.visitDate === today,
    );
    if (firstWaitingIdx !== -1) {
      queue[firstWaitingIdx] = { ...queue[firstWaitingIdx], status: "Next" };
      updateQueueItemStatusInSupabase(queue[firstWaitingIdx].id, "Next").catch(
        () => {},
      );
    }
  }

  const updatedVisits = (appState.visits || []).map((v) =>
    v.queueId === queueId ? { ...v, status: "Cancelled" as QueueStatus } : v,
  );

  const updatedState: AppState = {
    ...appState,
    queue,
    visits: updatedVisits,
  };

  saveAppState(updatedState);
  broadcastQueueEvent({ type: "QUEUE_UPDATED" });

  // Persist cancellation to Supabase
  cancelQueueTicketInSupabase(queueId).catch((err) => {
    console.warn("Supabase cancelQueueTicket sync notice:", err);
  });

  return updatedState;
};

// Helper: Export Backup as Excel or JSON
export const exportDataBackup = (
  state: AppState,
  periodMonths: number | "all",
  format: "json" | "excel",
) => {
  const cutoffDate = new Date();
  if (typeof periodMonths === "number") {
    cutoffDate.setMonth(cutoffDate.getMonth() - periodMonths);
  }

  const filteredPatients = state.patients
    .map((p) => {
      if (periodMonths === "all") return p;
      const records = p.records.filter(
        (r) => new Date(r.visitDate) >= cutoffDate,
      );
      return { ...p, records };
    })
    .filter(
      (p) =>
        periodMonths === "all" ||
        p.records.length > 0 ||
        new Date(p.registrationDate) >= cutoffDate,
    );

  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const backupObj = {
      exportDate: new Date().toISOString(),
      period:
        periodMonths === "all" ? "All time" : `Last ${periodMonths} Months`,
      doctor: state.doctor,
      clinic: state.clinic,
      patients: filteredPatients,
      appointments: state.appointments,
      dailyNotes: state.dailyNotes,
    };

    const blob = new Blob([JSON.stringify(backupObj, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `MediHive_Backup_${periodMonths}_months_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // Export as Excel
  const wb = XLSX.utils.book_new();

  // 1. Patients sheet
  const patientsData = filteredPatients.map((p) => ({
    "Patient ID": p.id,
    "Full Name": p.fullName,
    "Date of Birth": p.dob || "N/A",
    Age: p.age,
    Gender: p.gender,
    Mobile: p.mobile,
    "Blood Group": p.bloodGroup || "N/A",
    "Weight (kg)": p.weight || "N/A",
    Height: p.height || "N/A",
    "Emergency Contact": p.emergencyContact || "N/A",
    "Known Allergies": p.allergies || "None",
    "Medical History": p.medicalHistory || "None",
    Address: p.address || "N/A",
    "Clinical Notes": p.notes || "",
    "Registration Date": p.registrationDate,
    "Last Visit Date": p.lastVisitDate,
    "Total Visits": p.totalVisits || (p.records ? p.records.length : 0),
  }));
  const wsPatients = XLSX.utils.json_to_sheet(patientsData);
  XLSX.utils.book_append_sheet(wb, wsPatients, "Patients");

  // 2. OPD Visits & Consultations sheet
  const visitsData: any[] = [];
  const prescriptionsData: any[] = [];

  filteredPatients.forEach((p) => {
    (p.records || []).forEach((r) => {
      const medsList = r.medicines || r.prescriptions || [];

      // Collect itemized prescription rows
      medsList.forEach((m) => {
        if (m && m.name && m.name.trim()) {
          prescriptionsData.push({
            "OPD ID": r.id,
            "Patient ID": p.id,
            "Patient Name": p.fullName,
            "Visit Date": r.visitDate,
            "Medicine Name": m.name,
            Dosage: m.dosage || "",
            Frequency: m.frequency || "",
            Timing: m.timing || "",
            Duration: m.duration || "",
            Instructions: m.instructions || m.instruction || "",
          });
        }
      });

      visitsData.push({
        "OPD ID": r.id,
        "Patient ID": p.id,
        "Patient Name": p.fullName,
        "Visit Date": r.visitDate,
        "OPD Type": r.opdType || "General",
        "Charge Type": r.chargeType || "Standard",
        "Chief Complaint": r.complaint || "N/A",
        Diagnosis: r.diagnosis || "",
        Symptoms: Array.isArray(r.symptoms) ? r.symptoms.join(", ") : "",
        "BP (mmHg)": r.vitals?.bp || "N/A",
        "Pulse (bpm)": r.vitals?.pulse || "N/A",
        "Temperature (°F)": r.vitals?.temp || "N/A",
        "SpO2 (%)": r.vitals?.spo2 || "N/A",
        "Weight (kg)": r.vitals?.weight || p.weight || "N/A",
        Height: r.vitals?.height || p.height || "N/A",
        "Lab Tests / Investigations": r.tests || "None",
        "Medicines Summary": medsList
          .map(
            (m) =>
              `${m.name} (${m.dosage}, ${m.frequency}${m.timing ? `, ${m.timing}` : ""}${m.duration ? `, ${m.duration}` : ""})`,
          )
          .join(" | "),
        "Clinical Notes": r.clinicalNotes || "",
        "Panchakarma Notes": r.panchakarmaNotes || "",
        "Dietary Advice": r.dietaryAdvice || "",
        "Next Visit Reminder": r.nextVisitDate || "",
        "Consultation Fee (₹)": r.consultationFee ?? 0,
        "Medicine Fee (₹)": r.medicineFee ?? 0,
        "Panchakarma Fee (₹)": r.panchakarmaFee ?? 0,
        "Discount Type": r.discountType || "None",
        "Discount Value": r.discountValue ?? 0,
        "Total Fee (₹)": r.totalFee ?? 0,
        "Payment Mode": r.paymentMode || "Cash",
        "Payment Status": r.paymentStatus || "Paid",
      });
    });
  });

  const wsVisits = XLSX.utils.json_to_sheet(visitsData);
  XLSX.utils.book_append_sheet(wb, wsVisits, "OPD_Visits");

  // 3. Itemized Prescriptions Breakdown sheet
  if (prescriptionsData.length > 0) {
    const wsPrescriptions = XLSX.utils.json_to_sheet(prescriptionsData);
    XLSX.utils.book_append_sheet(wb, wsPrescriptions, "Prescriptions_Detailed");
  }

  // 4. Appointments sheet
  const appointmentsData = (state.appointments || []).map((a) => ({
    "Appointment ID": a.id,
    "Patient ID": a.patientId,
    "Patient Name": a.patientName,
    Mobile: a.patientMobile,
    Date: a.date,
    Time: a.time,
    Reason: a.reason,
    Type: a.type,
    Status: a.status,
    Notes: a.notes || "",
  }));
  const wsAppointments = XLSX.utils.json_to_sheet(appointmentsData);
  XLSX.utils.book_append_sheet(wb, wsAppointments, "Appointments");

  // 5. Clinic & Doctor Profile sheet
  const clinicData = [
    {
      "Clinic Name": state.clinic.name,
      "Clinic Address": state.clinic.address,
      "Clinic Phone": state.clinic.phone,
      "Clinic Email": state.clinic.email,
      "Doctor Name": state.doctor.name,
      Qualifications: state.doctor.qualifications,
      Specialisation: state.doctor.specialisation,
      "License No": state.doctor.medicalLicenseNo,
      "Operating Hours": state.clinic.operatingHours,
      "Export Date": new Date().toISOString(),
    },
  ];
  const wsClinic = XLSX.utils.json_to_sheet(clinicData);
  XLSX.utils.book_append_sheet(wb, wsClinic, "Clinic_Profile");

  // Download
  XLSX.writeFile(wb, `MediHive_Clinic_Records_${timestamp}.xlsx`);
};
