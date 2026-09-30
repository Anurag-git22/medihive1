-- ==============================================================================
-- MEDIHIVE CLINIC PRACTICE & RECEPTION SUITE - DEFAULT SEED DATA
-- ==============================================================================
-- How to run:
-- 1. Open your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Click "SQL Editor" in the left navigation
-- 3. Click "New Query", paste this entire script, and click "Run" (Ctrl+Enter)
-- ==============================================================================

-- 1. Doctor Profile
INSERT INTO doctor_profile (id, name, qualifications, specialisation, medical_license_no, email, contact, consultation_fee)
VALUES (
    1,
    'Dr. Shweta N. Sawant',
    'B.A.M.S | Ayurveda & Panchakarma Consultant',
    'Ayurveda & Panchakarma Specialist',
    'I-107200-A',
    'shreyashshigwan10@gmail.com',
    '9067251670',
    500
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    qualifications = EXCLUDED.qualifications,
    specialisation = EXCLUDED.specialisation,
    medical_license_no = EXCLUDED.medical_license_no,
    email = EXCLUDED.email,
    contact = EXCLUDED.contact,
    consultation_fee = EXCLUDED.consultation_fee;

-- 2. Clinic Settings
INSERT INTO clinic_settings (id, name, address, phone, email, website, operating_hours, currency)
VALUES (
    1,
    'Dr. Shweta''s Ayurveda Clinic',
    'Nemani bhavan, near Milagris school, office no 4, Salaiwada, Sawantwadi',
    '9067251670',
    'shreyashshigwan10@gmail.com',
    'www.shwetaayurveda.com',
    'Morning 10 am to 1 pm & Evening 5 pm to 8 pm',
    '₹'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    website = EXCLUDED.website,
    operating_hours = EXCLUDED.operating_hours,
    currency = EXCLUDED.currency;

-- 3. Email Config (SMTP)
INSERT INTO email_config (id, smtp_email, smtp_app_password, smtp_server, smtp_port, enable_notifications)
VALUES (
    1,
    'shreyashshigwan10@gmail.com',
    '••••••••••••••••',
    'smtp.gmail.com',
    587,
    true
)
ON CONFLICT (id) DO UPDATE SET
    smtp_email = EXCLUDED.smtp_email,
    smtp_server = EXCLUDED.smtp_server,
    smtp_port = EXCLUDED.smtp_port,
    enable_notifications = EXCLUDED.enable_notifications;

-- 4. Multi-Role Staff User Accounts
INSERT INTO user_accounts (id, username, name, role, password_hash)
VALUES
    ('usr-doc', 'doctor', 'Dr. Shweta N. Sawant', 'doctor', 'doctor123'),
    ('usr-admin', 'admin', 'Dr. Shweta (Admin)', 'doctor', 'admin123'),
    ('usr-rec', 'receptionist', 'Clinic Reception', 'receptionist', 'reception123'),
    ('usr-rec2', 'reception', 'Reception Desk', 'receptionist', 'reception123')
ON CONFLICT (username) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

-- 5. Default Patients
INSERT INTO patients (id, full_name, age, gender, mobile, address, blood_group, allergies, medical_history, registration_date, last_visit_date, total_visits, notes)
VALUES
    (
        'P0001',
        'Aarav Patil',
        34,
        'Male',
        '9823011223',
        'Sawantwadi Bazar, Sindhudurg',
        'O+',
        NULL,
        'Mild Cervical Pain since 6 months',
        CURRENT_DATE - INTERVAL '10 days',
        CURRENT_DATE,
        1,
        'Regular desk worker, experiences shoulder stiffness'
    ),
    (
        'P0002',
        'Omkar R. Desai',
        28,
        'Male',
        '9876543210',
        'Salaiwada, Sawantwadi',
        'B+',
        'Dust allergy',
        'Chronic acidity, bloating and irregular bowel habits',
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE,
        1,
        'Prefers herbal decoction with warm water'
    ),
    (
        'P0003',
        'Rajas M. Sawant',
        42,
        'Male',
        '9011223344',
        'Kudal, Sindhudurg',
        'A+',
        NULL,
        'Lower Back & Left Leg Sciatica pain',
        CURRENT_DATE - INTERVAL '2 days',
        CURRENT_DATE,
        1,
        'Advised Kati Basti 7 days course'
    ),
    (
        'P0004',
        'Pooja N. Kadam',
        29,
        'Female',
        '9765432109',
        'Vengurla, Sindhudurg',
        'O-',
        'Penicillin',
        'Seasonal allergic rhinitis and morning sinus headache',
        CURRENT_DATE,
        CURRENT_DATE,
        0,
        'New patient check-in at front desk'
    )
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    age = EXCLUDED.age,
    gender = EXCLUDED.gender,
    mobile = EXCLUDED.mobile,
    address = EXCLUDED.address,
    blood_group = EXCLUDED.blood_group,
    allergies = EXCLUDED.allergies,
    medical_history = EXCLUDED.medical_history,
    last_visit_date = EXCLUDED.last_visit_date,
    total_visits = EXCLUDED.total_visits,
    notes = EXCLUDED.notes;

-- 6. Default Patient Visits (Front Desk Triage Records)
INSERT INTO patient_visits (id, patient_id, patient_name, patient_age, patient_gender, patient_mobile, visit_date, visit_time, complaint, symptoms, symptom_duration, vitals, receptionist_name, queue_id, queue_number, status)
VALUES
    (
        'VIS-2026-001',
        'P0002',
        'Omkar R. Desai',
        28,
        'Male',
        '9876543210',
        CURRENT_DATE,
        '10:15',
        'Severe heartburn and acid reflux after meals',
        ARRAY['Hyperacidity (Amlapitta)', 'Indigestion (Ajeerna)'],
        '2 weeks',
        '{"bp": "120/80", "pulse": "74", "temp": "98.4", "weight": "68"}',
        'Reception Desk',
        'Q-2026-001',
        'Q-001',
        'With Doctor'
    ),
    (
        'VIS-2026-002',
        'P0003',
        'Rajas M. Sawant',
        42,
        'Male',
        '9011223344',
        CURRENT_DATE,
        '10:30',
        'Radiating pain in left leg from lower back',
        ARRAY['Lower Back Pain (Katisula)', 'Sciatica (Gridhrasi)'],
        '1 month',
        '{"bp": "130/85", "pulse": "78", "temp": "98.6", "weight": "76"}',
        'Reception Desk',
        'Q-2026-002',
        'Q-002',
        'Next'
    ),
    (
        'VIS-2026-003',
        'P0004',
        'Pooja N. Kadam',
        29,
        'Female',
        '9765432109',
        CURRENT_DATE,
        '10:45',
        'Continuous sneezing, morning nasal congestion and headache',
        ARRAY['Allergic Rhinitis (Pratishyaya)', 'Headache'],
        '4 days',
        '{"bp": "115/75", "pulse": "72", "temp": "98.6", "weight": "54"}',
        'Reception Desk',
        'Q-2026-003',
        'Q-003',
        'Waiting'
    )
ON CONFLICT (id) DO UPDATE SET
    complaint = EXCLUDED.complaint,
    symptoms = EXCLUDED.symptoms,
    vitals = EXCLUDED.vitals,
    status = EXCLUDED.status;

-- 7. Live Queue Items (FIFO sequence for Doctor Cabin)
INSERT INTO queue_items (id, queue_number, sequence_number, visit_id, patient_id, patient_name, patient_age, patient_gender, patient_mobile, complaint, symptoms, vitals, arrival_time, visit_date, status)
VALUES
    (
        'Q-2026-001',
        'Q-001',
        1,
        'VIS-2026-001',
        'P0002',
        'Omkar R. Desai',
        28,
        'Male',
        '9876543210',
        'Severe heartburn and acid reflux after meals',
        ARRAY['Hyperacidity (Amlapitta)', 'Indigestion (Ajeerna)'],
        '{"bp": "120/80", "pulse": "74", "temp": "98.4", "weight": "68"}',
        '10:15',
        CURRENT_DATE,
        'With Doctor'
    ),
    (
        'Q-2026-002',
        'Q-002',
        2,
        'VIS-2026-002',
        'P0003',
        'Rajas M. Sawant',
        42,
        'Male',
        '9011223344',
        'Radiating pain in left leg from lower back',
        ARRAY['Lower Back Pain (Katisula)', 'Sciatica (Gridhrasi)'],
        '{"bp": "130/85", "pulse": "78", "temp": "98.6", "weight": "76"}',
        '10:30',
        CURRENT_DATE,
        'Next'
    ),
    (
        'Q-2026-003',
        'Q-003',
        3,
        'VIS-2026-003',
        'P0004',
        'Pooja N. Kadam',
        29,
        'Female',
        '9765432109',
        'Continuous sneezing, morning nasal congestion and headache',
        ARRAY['Allergic Rhinitis (Pratishyaya)', 'Headache'],
        '{"bp": "115/75", "pulse": "72", "temp": "98.6", "weight": "54"}',
        '10:45',
        CURRENT_DATE,
        'Waiting'
    )
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    vitals = EXCLUDED.vitals;

-- 8. OPD Records & Prescriptions
INSERT INTO opd_records (id, patient_id, visit_date, opd_type, charge_type, diagnosis, symptoms, complaint, vitals, medicines, dietary_advice, next_visit_date, consultation_fee, medicine_fee, panchakarma_fee, total_fee, payment_mode, payment_status)
VALUES
    (
        'OPD-2026-001',
        'P0001',
        CURRENT_DATE - INTERVAL '10 days',
        'Consultation',
        'First Visit',
        'Cervical Spondylosis (Manyastambha) & Sandhivata',
        ARRAY['Joint Pain (Sandhivata)', 'Cervical Spondylosis (Manyastambha)'],
        'Neck stiffness and shoulder blade ache while working',
        '{"bp": "124/82", "pulse": "76", "temp": "98.4", "weight": "70"}',
        '[
            {"id": "med-1", "name": "Yograj Guggulu", "category": "Ayurvedic", "dosage": "2 tabs", "frequency": "Twice daily", "timing": "After Food", "instructions": "With warm water"},
            {"id": "med-2", "name": "Maharasnadi yog", "category": "Ayurvedic", "dosage": "2 tabs", "frequency": "Twice daily", "timing": "After Food", "instructions": "With warm water"}
        ]'::jsonb,
        'Avoid cold refrigerated water, sour curd, and heavy fermented food. Drink warm water.',
        CURRENT_DATE,
        500,
        150,
        0,
        650,
        'Cash',
        'Paid'
    )
ON CONFLICT (id) DO UPDATE SET
    diagnosis = EXCLUDED.diagnosis,
    medicines = EXCLUDED.medicines,
    total_fee = EXCLUDED.total_fee;

-- 9. Scheduled Appointments & Reminders
INSERT INTO appointments (id, patient_id, patient_name, patient_mobile, date, time, reason, type, status)
VALUES
    (
        'APT-2026-001',
        'P0001',
        'Aarav Patil',
        '9823011223',
        CURRENT_DATE,
        '11:00',
        '10-Day Follow-up & Joint Assessment',
        'Follow-up Reminder',
        'Scheduled'
    ),
    (
        'APT-2026-002',
        'P0003',
        'Rajas M. Sawant',
        '9011223344',
        CURRENT_DATE + INTERVAL '5 days',
        '10:00',
        'Kati Basti Panchakarma Session 1',
        'Appointment',
        'Scheduled'
    )
ON CONFLICT (id) DO UPDATE SET
    date = EXCLUDED.date,
    time = EXCLUDED.time,
    reason = EXCLUDED.reason,
    status = EXCLUDED.status;

-- 10. Daily Notes
INSERT INTO daily_notes (date, note)
VALUES (
    CURRENT_DATE,
    'Morning OPD active. Panchakarma session scheduled for Rajas Sawant at 10:00 AM.'
)
ON CONFLICT (date) DO UPDATE SET
    note = EXCLUDED.note;

-- 11. Enable Realtime Publications for all clinic tables
-- Ensures Supabase WebSocket streams inserts, updates, and deletes to all active sessions instantly
ALTER PUBLICATION supabase_realtime ADD TABLE patients, patient_visits, queue_items, opd_records, appointments, daily_notes, doctor_profile, clinic_settings;

