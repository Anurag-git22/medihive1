# MediHive — Complete Clinical Management Suite 🩺

![MediHive Banner](public/logo.svg)

**MediHive** is a modern, offline-first clinic management application designed for doctors and clinics. It streamlines patient registration, smart symptom & medicine auto-suggestions, instant prescription generation, clinic calendar follow-up reminders, financial analytics, and on-device data backup.

---

## 🌟 Key Features

1. **Secure On-Device Authentication**
   - Separate staff / doctor logins with session persistence.
   - Master password management and password reset assistance.
   - *Default credentials:* Username: `admin` | Password: `admin123`.

2. **Real-Time Clinic Dashboard**
   - Live KPI counters: Today's OPD, Overdue follow-ups, Follow-ups due today, and Revenue tracking (Today, Weekly, Monthly, Yearly).
   - Interactive mini calendar date strip.
   - Quick patient lookup and 1-click Add Patient flow.
   - Recent Patients table with instant view and edit actions.

3. **OPD Registration & Smart Suggestions**
   - Quick patient search by ID / mobile / name to auto-fill returning patient details.
   - Smart Symptom autocomplete with 1-click chip addition.
   - Medicine prescription manager with auto-dosage, frequency, and timing suggestions.
   - Clinical image upload (skin treatment / reports / lesions).
   - Panchakarma notes & Next Visit follow-up date picker.
   - Auto-calculated billing with consultation, medicine, therapy fees, and discount logic.

4. **Prescription Preview & Printable Letterhead**
   - Professional clinic letterhead with Doctor details, license number, clinic timings, and emblem.
   - Direct 1-click browser printing (`@media print` clean layout).
   - Direct PDF download powered by `jsPDF` and `html2canvas`.

5. **Patient Management & Multi-Visit History**
   - Digital filing cabinet with real-time search and gender filters.
   - Multi-visit patient timeline showing past diagnoses, symptoms, prescribed medicines, and fees.
   - 1-click re-print of previous prescriptions.

6. **Clinic Calendar & Follow-up Reminders**
   - Interactive month view with date indicators for appointments and follow-up checkups.
   - Daily log notes drawer ("Notes for YYYY-MM-DD") with auto-save.
   - Top notification bell and reminder badges when patients are due today.

7. **Clinic Settings & Branding Customization**
   - Doctor Information (Qualifications, Specialisation, Medical License, Photo).
   - Clinic Details (Name, Address, Phone, Website, Operating Hours, Logo).
   - Live prescription letterhead preview.
   - SMTP Email configuration with step-by-step Gmail App Password guide.
   - 1-Click Backup Export (1, 3, 6, 12 months & Full data export to Excel `.xlsx` and `.json`) and Restore.
   - Authentication settings for changing master passwords.

8. **Help Center & FAQs**
   - Built-in searchable FAQs categorized by Patients, Prescriptions, Billing, Calendar, and Settings.
   - Developer & technical contact cards.
   - Interactive Support Ticket submission modal.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build production bundle
npm run build
```

---

## 🏥 Pre-Seeded Sample Data

The application comes pre-loaded with the demo clinic profile and patients matching the feature guide:
- **Doctor:** Dr. Shweta N. Sawant (`B.A.M.S | Ayurveda & Panchakarma Consultant`, Reg No: `I-107200-A`)
- **Clinic:** Dr. Shweta's Ayurveda Clinic, Sawantwadi
- **Patients:**
  - `P0003` — Rajas (Male, 20) — Viral pyrexia & joint stiffness
  - `P0002` — Omkar (Male, 20) — Acute fever & Indigestion (Aam Jwara)
  - `P0001` — XYZ (Male, 23) — Hyperacidity (Amlapitta)

