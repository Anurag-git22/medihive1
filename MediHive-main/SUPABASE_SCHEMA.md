# MediHive Supabase Database Setup Guide

This document contains the complete database schema, security policies, and setup instructions for connecting **MediHive** to a **Supabase (PostgreSQL)** database.

---

## Quick Setup in 3 Easy Steps

1. **Log in to Supabase**:
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard) and open your project.
2. **Open SQL Editor**:
   - Click the **SQL Editor** tab in the left navigation menu (icon: `>_`).
   - Click **"+ New query"** at the top.
3. **Paste & Execute**:
   - Copy the SQL query below, paste it into the editor, and click the green **"Run"** button (or press `Ctrl` + `Enter`).
   - All 10 clinical tables, real-time sync listeners, indexes, security policies, and default staff credentials will be created immediately.

---

## Complete SQL Query for Supabase SQL Editor

```sql
-- ==============================================================================
-- MEDIHIVE CLINICAL PRACTICE & RECEPTION SUITE
-- Supabase PostgreSQL Schema & Realtime Setup
-- ==============================================================================
-- How to run:
-- 1. Log in to your Supabase project (https://supabase.com/dashboard)
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New query", paste this entire script, and click "Run"
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABLE: user_accounts (Doctor, Receptionist & Admin Staff)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_accounts (
    id TEXT PRIMARY KEY DEFAULT ('usr-' || substr(md5(random()::text), 1, 8)),
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'receptionist', 'admin')),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- TABLE: patients (Demographics, Medical History, Contact Info)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY, -- e.g. 'P0001', 'P0002'
    full_name TEXT NOT NULL,
    dob DATE,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    mobile TEXT NOT NULL,
    address TEXT,
    blood_group TEXT,
    emergency_contact TEXT,
    allergies TEXT,
    medical_history TEXT,
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_visits INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast patient lookup by receptionist & doctor
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(LOWER(full_name));

-- ==============================================================================
-- TABLE: patient_visits (Intake & Triage Records from Receptionist Desk)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS patient_visits (
    id TEXT PRIMARY KEY, -- e.g. 'VIS-2026-001'
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    patient_age INTEGER NOT NULL,
    patient_gender TEXT NOT NULL,
    patient_mobile TEXT NOT NULL,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    visit_time TEXT NOT NULL, -- HH:mm
    complaint TEXT NOT NULL,
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    symptom_duration TEXT,
    vitals JSONB NOT NULL DEFAULT '{}'::jsonb,
    receptionist_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL,
    receptionist_name TEXT,
    queue_id TEXT,
    queue_number TEXT,
    status TEXT NOT NULL DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'Next', 'With Doctor', 'Completed', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_patient ON patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON patient_visits(visit_date);

-- ==============================================================================
-- TABLE: queue_items (Live Synchronized FIFO Queue for Doctor Cabin)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS queue_items (
    id TEXT PRIMARY KEY, -- e.g. 'Q-001-ID' or UUID
    queue_number TEXT NOT NULL, -- e.g. 'Q-001'
    sequence_number INTEGER NOT NULL, -- 1, 2, 3 for strict FIFO
    visit_id TEXT REFERENCES patient_visits(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    patient_age INTEGER NOT NULL,
    patient_gender TEXT NOT NULL,
    patient_mobile TEXT NOT NULL,
    complaint TEXT NOT NULL,
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    symptom_duration TEXT,
    vitals JSONB NOT NULL DEFAULT '{}'::jsonb,
    arrival_time TEXT NOT NULL,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'Next', 'With Doctor', 'Completed', 'Cancelled')),
    doctor_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL,
    called_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queue_date_status ON queue_items(visit_date, status);
CREATE INDEX IF NOT EXISTS idx_queue_patient ON queue_items(patient_id);

-- ==============================================================================
-- TABLE: opd_records (Doctor Consultation Records, Prescriptions & Invoicing)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS opd_records (
    id TEXT PRIMARY KEY, -- e.g. 'OPD-0001'
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    opd_type TEXT CHECK (opd_type IN ('Consultation', 'Follow-up', 'Emergency', 'Routine Checkup', 'Therapy')),
    charge_type TEXT CHECK (charge_type IN ('First Visit', 'Follow-up', 'Special Therapy', 'Emergency Consultation')),
    diagnosis TEXT NOT NULL,
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    complaint TEXT,
    vitals JSONB NOT NULL DEFAULT '{}'::jsonb,
    uploaded_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    medicines JSONB NOT NULL DEFAULT '[]'::jsonb, -- Prescribed medicine items
    panchakarma_notes TEXT,
    clinical_notes TEXT,
    dietary_advice TEXT,
    next_visit_date DATE,
    tests TEXT,
    consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    medicine_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    panchakarma_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_type TEXT CHECK (discount_type IN ('amount', 'percentage')),
    discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_mode TEXT CHECK (payment_mode IN ('Cash', 'UPI', 'Card', 'Net Banking')),
    payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opd_patient ON opd_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_opd_date ON opd_records(visit_date);

-- ==============================================================================
-- TABLE: appointments (Clinic Calendar, Bookings & Follow-up Reminders)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY, -- e.g. 'APT-1725700000000'
    patient_id TEXT,
    patient_name TEXT NOT NULL,
    patient_mobile TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    reason TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Appointment' CHECK (type IN ('Appointment', 'Follow-up Reminder')),
    status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);

-- ==============================================================================
-- TABLE: daily_notes (Calendar Daily Clinical Notes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS daily_notes (
    date DATE PRIMARY KEY,
    note TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- SINGLETON CONFIG TABLES: doctor_profile, clinic_settings, email_config
-- ==============================================================================
CREATE TABLE IF NOT EXISTS doctor_profile (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name TEXT NOT NULL,
    qualifications TEXT NOT NULL,
    specialisation TEXT NOT NULL,
    medical_license_no TEXT NOT NULL,
    email TEXT NOT NULL,
    contact TEXT NOT NULL,
    photo_url TEXT,
    consultation_fee NUMERIC(10, 2) DEFAULT 500,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinic_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    website TEXT,
    operating_hours TEXT NOT NULL,
    logo_url TEXT,
    currency TEXT NOT NULL DEFAULT '₹',
    tax_number TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    smtp_email TEXT NOT NULL,
    smtp_app_password TEXT NOT NULL,
    smtp_server TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    smtp_port INTEGER NOT NULL DEFAULT 587,
    enable_notifications BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- ENABLE SUPABASE REALTIME (Instant Sync between Doctor & Receptionist Devices)
-- ==============================================================================
DO $$
BEGIN
    -- Add tables to realtime publication if not already present
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'queue_items') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE queue_items;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'patient_visits') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE patient_visits;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'patients') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE patients;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'appointments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
    END IF;
END $$;

-- Set REPLICA IDENTITY FULL so realtime subscribers get complete updated rows
ALTER TABLE queue_items REPLICA IDENTITY FULL;
ALTER TABLE patient_visits REPLICA IDENTITY FULL;
ALTER TABLE patients REPLICA IDENTITY FULL;
ALTER TABLE appointments REPLICA IDENTITY FULL;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Enable RLS on all tables
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE opd_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for application client (anon & authenticated roles)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "medihive_allow_all_%I" ON %I;', t, t);
        EXECUTE format('CREATE POLICY "medihive_allow_all_%I" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END $$;

-- ==============================================================================
-- SEED INITIAL CLINIC DATA
-- ==============================================================================
-- 1. Staff Accounts
INSERT INTO user_accounts (id, username, name, role, password_hash)
VALUES
    ('usr-doc', 'doctor', 'Dr. Shweta N. Sawant', 'doctor', 'doctor123'),
    ('usr-admin', 'admin', 'Dr. Shweta (Admin)', 'doctor', 'admin123'),
    ('usr-rec', 'receptionist', 'Clinic Reception', 'receptionist', 'reception123'),
    ('usr-rec2', 'reception', 'Reception Desk', 'receptionist', 'reception123')
ON CONFLICT (username) DO NOTHING;

-- 2. Doctor Profile
INSERT INTO doctor_profile (id, name, qualifications, specialisation, medical_license_no, email, contact, consultation_fee)
VALUES (
    1,
    'Dr. Shweta N. Sawant',
    'B.A.M.S., M.D. (Ayurveda)',
    'Ayurvedic Medicine & Panchakarma Specialist',
    'MH-AYU-84920',
    'dr.shweta@medihive.com',
    '+91 98765 43210',
    500
)
ON CONFLICT (id) DO NOTHING;

-- 3. Clinic Settings
INSERT INTO clinic_settings (id, name, address, phone, email, website, operating_hours, currency)
VALUES (
    1,
    'MediHive Ayurvedic Clinic & Panchakarma Center',
    'Plot 42, Shiv Samarth Complex, MG Road, Pune, Maharashtra 411001',
    '+91 20 2567 8900',
    'contact@medihive.com',
    'https://medihive.vercel.app',
    'Mon-Sat: 10:00 AM - 1:00 PM & 5:00 PM - 8:30 PM (Sun Closed)',
    '₹'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Email Config
INSERT INTO email_config (id, smtp_email, smtp_app_password, smtp_server, smtp_port, enable_notifications)
VALUES (
    1,
    'noreply@medihive.com',
    'app_password_placeholder',
    'smtp.gmail.com',
    587,
    true
)
ON CONFLICT (id) DO NOTHING;

```

---

## Summary of Tables Created

| Table Name | Description | Key Features |
| :--- | :--- | :--- |
| **`user_accounts`** | Staff credentials & roles | Pre-seeded with `doctor` & `receptionist` logins |
| **`patients`** | Master patient directory, medical background & allergies | Fast search indexes on `mobile` and `full_name` |
| **`patient_visits`** | Visit records, chief complaints, illness tags, & baseline vitals | Foreign key reference to `patients(id)` |
| **`queue_items`** | Live FIFO consultation waiting queue | **Realtime replication enabled** for cross-device sync |
| **`opd_records`** | Doctor clinical diagnoses, Rx prescriptions, and invoicing | Structured JSONB for medicines & symptom arrays |
| **`appointments`** | Clinic calendar appointments & follow-up reminders | Date-based index for fast calendar queries |
| **`daily_notes`** | Clinic calendar daily notes | Keyed by date (`YYYY-MM-DD`) |
| **`doctor_profile`** | Doctor name, qualifications & medical license number | Singleton configuration table (`id = 1`) |
| **`clinic_settings`** | Clinic name, address, hours, branding letterhead | Singleton configuration table (`id = 1`) |
| **`email_config`** | SMTP settings for automated prescriptions | Singleton configuration table (`id = 1`) |

---

## Realtime Live Synchronization

The script automatically executes:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE queue_items;
ALTER PUBLICATION supabase_realtime ADD TABLE patient_visits;
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
```
This ensures that whenever:
- A receptionist checks in a patient, the Doctor's cabin view updates **instantly without page refreshes**.
- A doctor calls or finishes a consultation, the receptionist desk and waiting room screen reflect the updated status **in real time**.
