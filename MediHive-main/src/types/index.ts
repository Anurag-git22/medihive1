export type Gender = "Male" | "Female" | "Other";
export type OpdType =
  | "Consultation"
  | "Follow-up"
  | "Emergency"
  | "Routine Checkup"
  | "Therapy";
export type ChargeType =
  | "First Visit"
  | "Follow-up"
  | "Special Therapy"
  | "Emergency Consultation";
export type PaymentMode = "Cash" | "UPI" | "Card" | "Net Banking";
export type DiscountType = "amount" | "percentage";

export interface PrescribedMedicine {
  id: string;
  name: string;
  dosage: string; // e.g., '1 tab', '2 tsp', '10 ml'
  frequency: string; // e.g., '1-0-1', 'Once daily', 'Twice daily after food', 'Morning & Night'
  timing?: string; // 'Before Food' | 'After Food' | 'Empty Stomach' | 'With Warm Water'
  duration: string; // e.g., '5 Days', '15 Days', '1 Month'
  instruction?: string;
  instructions?: string;
}

export type PrescriptionItem = PrescribedMedicine;

export interface OPDRecord {
  id: string;
  patientId: string;
  visitDate: string; // YYYY-MM-DD
  opdType?: OpdType;
  chargeType?: ChargeType;
  diagnosis: string;
  symptoms: string[];
  complaint?: string;
  vitals?: PatientVitals;
  uploadedImages?: string[]; // base64 or object URLs for skin treatment / clinical photos
  medicines?: PrescribedMedicine[];
  prescriptions?: PrescribedMedicine[];
  panchakarmaNotes?: string;
  clinicalNotes?: string;
  dietaryAdvice?: string;
  nextVisitDate?: string; // YYYY-MM-DD
  tests?: string;

  // Billing details
  consultationFee?: number;
  medicineFee?: number;
  panchakarmaFee?: number;
  discountType?: DiscountType;
  discountValue?: number;
  totalFee: number;
  paymentMode?: PaymentMode;
  paymentStatus?: "Paid" | "Pending";

  createdAt: string;
}

export interface PatientVitals {
  temperature?: string; // in °F, e.g. '98.6'
  bloodPressure?: string; // in mmHg, e.g. '120/80'
  weight?: string; // in kg, e.g. '68'
  height?: string; // in cm, e.g. '172'
  spO2?: string; // in %, e.g. '98'
  pulse?: string; // in bpm, e.g. '74'
  respiratoryRate?: string;
  otherVitals?: string;
  // Aliases for convenience
  temp?: string;
  bp?: string;
  spo2?: string;
}

export type QueueStatus =
  | "Waiting"
  | "Next"
  | "With Doctor"
  | "Completed"
  | "Cancelled";

export interface PatientVisit {
  id: string; // e.g., 'VIS-2026-001'
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: Gender;
  patientMobile: string;
  visitDate: string; // YYYY-MM-DD
  visitTime: string; // HH:mm
  complaint: string;
  symptoms: string[];
  symptomDuration?: string;
  vitals: PatientVitals;
  receptionistId?: string;
  receptionistName?: string;
  queueId?: string;
  queueNumber?: string;
  status: QueueStatus;
  createdAt: string;
}

export interface QueueItem {
  id: string; // e.g., 'Q-001-ID'
  queueNumber: string; // e.g., 'Q-001'
  sequenceNumber: number; // 1, 2, 3...
  visitId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: Gender;
  patientMobile: string;
  complaint: string;
  symptoms: string[];
  symptomDuration?: string;
  vitals: PatientVitals;
  arrivalTime: string; // HH:mm or ISO
  visitDate: string; // YYYY-MM-DD
  status: QueueStatus;
  doctorId?: string;
  calledAt?: string;
  completedAt?: string;
}

export interface Patient {
  id: string; // e.g., 'P0001'
  fullName: string;
  dob?: string; // YYYY-MM-DD
  age: number;
  gender: Gender;
  mobile: string;
  address?: string;
  bloodGroup?: string;
  weight?: string; // in kg, e.g. '68'
  height?: string; // in cm or ft/in, e.g. '172 cm' or '5ft 8in'
  emergencyContact?: string;
  allergies?: string;
  medicalHistory?: string;
  registrationDate: string; // YYYY-MM-DD
  lastVisitDate: string; // YYYY-MM-DD
  totalVisits: number;
  records: OPDRecord[];
  notes?: string;
  createdAt?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientMobile: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  reason: string;
  type: "Appointment" | "Follow-up Reminder";
  status: "Scheduled" | "Completed" | "Cancelled";
  notes?: string;
}

export interface CalendarDailyNote {
  date: string; // YYYY-MM-DD
  note: string;
  updatedAt: string;
}

export interface DoctorProfile {
  name: string;
  qualifications: string;
  specialisation: string;
  medicalLicenseNo: string;
  email: string;
  contact: string;
  photoUrl?: string;
  consultationFee?: number;
}

export interface ClinicSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  operatingHours: string;
  logoUrl?: string;
  currency: string;
  taxNumber?: string;
}

export interface EmailConfig {
  smtpEmail: string;
  smtpAppPassword: string;
  smtpServer: string;
  smtpPort: number;
  enableNotifications: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: "doctor" | "receptionist" | "admin";
  passwordHash: string;
}

export interface AppState {
  currentUser: UserAccount | null;
  doctor: DoctorProfile;
  clinic: ClinicSettings;
  emailConfig: EmailConfig;
  patients: Patient[];
  visits: PatientVisit[];
  queue: QueueItem[];
  appointments: Appointment[];
  dailyNotes: Record<string, string>; // YYYY-MM-DD -> note
}
