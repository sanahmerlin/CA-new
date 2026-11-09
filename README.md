# CareAfter 🏥

> The care that continues after discharge — intelligent post-operative recovery monitoring with real-time clinical escalation, multilingual patient support, and Care+ 24/7 AI ambulance & doctor dispatch.

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live%20Demo-black?logo=vercel)](https://ca-new-tv1w.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Realtime-3ECF8E?logo=supabase)](https://supabase.com/)
[![PayPal](https://img.shields.io/badge/PayPal-Subscriptions%20Sandbox-00457C?logo=paypal)](https://developer.paypal.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 🌐 Live Vercel Deployment

- **Production Live URL:** [https://ca-new-tv1w.vercel.app](https://ca-new-tv1w.vercel.app)
- **Production Alias:** [https://ca-new.vercel.app](https://ca-new.vercel.app)

### Direct Portal Links:
- 👨‍⚕️ **Hospital & Staff Portal:** [https://ca-new-tv1w.vercel.app/login](https://ca-new-tv1w.vercel.app/login)
- 📱 **Patient Care Portal:** [https://ca-new-tv1w.vercel.app/patient/login](https://ca-new-tv1w.vercel.app/patient/login)
- 📊 **Staff Dashboard:** [https://ca-new-tv1w.vercel.app/app/dashboard](https://ca-new-tv1w.vercel.app/app/dashboard)

---

## 🔑 Demo Login Credentials

### Hospital Staff Portal (`/login`)
| Hospital | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Sunrise Hospital** | `admin@sunrise.demo` | `CareAfter2025!` | Admin / Doctor |
| **Lakeview Medical** *(Tenant Isolation)* | `admin@lakeview.demo` | `CareAfter2025!` | Admin / Doctor |

### Patient Care Portal (`/patient/login`)
| Patient | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Rajesh Sharma** | `rajesh.sharma` | `rajesh62` | Day 1 Recovery Check-In |
| **Mary Varghese** | `mary.varghese` | `mary71` | Post-Discharge Monitoring |

---

## ✨ Key Features

1. **AI-Powered Clinical Discharge Ingestion**:
   - Paste or upload discharge notes to instantly extract clinical history, medications, and risk categories via Google Gemini.
2. **Realtime Two-Device Patient Enrolment**:
   - Instant patient account provisioning in `pending` status.
   - Screen transitions automatically in real time without refreshing once the care plan is confirmed.
3. **Multilingual Patient Check-In & Audio Support**:
   - Available in **English**, **Malayalam (മലയാളം)**, and **Hindi (हिंदी)**.
   - Web Speech audio playback and voice response capabilities for accessibility.
4. **Dynamic Branching Follow-ups & Triage**:
   - Evaluates concerning symptoms (e.g., chest pain, calf tenderness) dynamically.
   - Immediate real-time priority alerts on doctor dashboard with **Critical**, **Urgent**, or **Watch** severity triage tags.
5. **Care+ Paid Tier (PayPal Sandbox)**:
   - Automated recurring billing integration using `@paypal/react-paypal-js`.
   - Server-side subscription verification (`/api/paypal/confirm`) with OAuth token exchange and Supabase service role persistence.
6. **Care+ AI Dispatch Assistant (Gemini Function Calling)**:
   - Conversational assistant with tool calling (`find_nearest_ambulances` and `get_on_duty_doctor`).
   - Browser geolocation with automatic fallback to Kochi, Kerala coordinates.
   - Returns interactive tap-to-call cards with driver/doctor phone numbers and distance in kilometers.
7. **Time Simulator Controls**:
   - Fast-forward time controls (`+3 Hours`, `+1 Day`, `+1 Week`, `Reset`) on the doctor dashboard to test long-term monitoring progression.

---

## ⚠️ Simulated Features & Emergency Safety Disclosures

> [!IMPORTANT]
> **Free Emergency Access is Guaranteed for Everyone:**  
> The native emergency hotline (`108` in India) and hospital helpline buttons remain completely **FREE, visible, and accessible to all patients** at all times. Emergency help is never placed behind a paywall.

### Simulated Data Notice:
- **Ambulance Roster & GPS Coordinates:** The 12 seeded ambulances around Kochi, Kerala (Marine Drive, Ernakulam North, Edappally, Kakkanad, etc.) are **simulated demo units**.
- **Driver Phone Numbers:** Driver phone numbers (e.g. `+91 90000 00001` through `+91 90000 00012`) are **obviously simulated dummy numbers**.
- **On-Duty Doctor Roster:** Attending doctors and phone numbers (e.g. `+91 98000 00001`) are **mock records for demonstration purposes**.
- **No Physical Dispatch:** Calling numbers in demo mode does not trigger actual road dispatch or emergency vehicle sirens.

---

## 🛠️ Local Development & Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/sanahmerlin/CA-new.git
cd CA-new
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and provide your credentials (do not commit `.env.local`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash

# Patient Session Secret (min 32 chars)
PATIENT_SESSION_SECRET=careafter_super_secure_patient_session_secret_min_32_chars

# PayPal Sandbox Subscriptions (Care+)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your-paypal-sandbox-client-id
PAYPAL_CLIENT_SECRET=your-paypal-sandbox-client-secret
NEXT_PUBLIC_PAYPAL_PLAN_ID=your-paypal-sandbox-plan-id
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
```

### 3. Run Database Migrations
Execute the SQL migrations in order in the Supabase SQL Editor:
1. `supabase/migrations/001_initial_schema.sql` (Hospitals, profiles, departments, audit)
2. `supabase/migrations/002_phase2_patients.sql` (Patients and records schema)
3. `supabase/migrations/003_phase3_monitoring.sql` (Monitoring plans, checkins, responses, alerts)
4. `supabase/migrations/004_patient_auth.sql` (Patient username & password hash authentication)
5. `supabase/migrations/005_remove_username_unique_constraint.sql` (Fix multi-hospital enrolment)
6. `supabase/migrations/006_careplus_subscriptions.sql` (Care+ subscriptions, ambulances, on-duty doctors, seed data)

Seed initial hospital and staff demo accounts:
```bash
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💳 PayPal Sandbox Testing Guide

To test the Care+ subscription flow end-to-end:
1. Log in to the [PayPal Developer Dashboard](https://developer.paypal.com).
2. Under **Sandbox > Accounts**, obtain a **Personal (Buyer)** sandbox account email and password.
3. Under **Apps & Credentials**, create a REST app to obtain:
   - `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
4. Create a subscription product & monthly billing plan in the sandbox to obtain `NEXT_PUBLIC_PAYPAL_PLAN_ID`.
5. In the patient portal, navigate to the **Care+ Help** tab and click the PayPal Subscribe button.
6. Complete sandbox checkout using the buyer test credentials.
7. The server securely verifies the subscription with PayPal via `/api/paypal/confirm` and immediately unlocks the dispatch assistant.
8. *(Quick Sandbox Fallback)*: When testing locally without PayPal API credentials, click the **Activate Care+ (Sandbox Test Mode)** button to instantly unlock the Care+ dispatch assistant.

---

## 📦 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS v4, Lucide Icons
- **Database & Realtime:** Supabase (PostgreSQL, Row Level Security, Realtime WebSockets)
- **AI & Function Calling:** Google Gemini API (`@google/genai`)
- **Payments:** PayPal Subscriptions SDK (`@paypal/react-paypal-js`)
- **Speech & Audio:** Web Speech API (SpeechRecognition & SpeechSynthesis in English, Malayalam, Hindi)
- **Hosting:** Vercel

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
