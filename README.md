# CareAfter 🏥

> The care that continues after discharge — intelligent post-operative recovery monitoring with real-time escalation and multilingual patient support.

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live%20Demo-black?logo=vercel)](https://ca-new-tv1w.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Realtime-3ECF8E?logo=supabase)](https://supabase.com/)

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
5. **Time Simulator Controls**:
   - Fast-forward time controls (`+3 Hours`, `+1 Day`, `+1 Week`, `Reset`) to test long-term monitoring progression.

---

## 🛠️ Local Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/sanahmerlin/CA-new.git
cd CA-new
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash
PATIENT_SESSION_SECRET=your-32-character-secret
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS v4, Lucide Icons
- **Backend / Database:** Supabase (PostgreSQL, Row Level Security, Realtime subscriptions)
- **AI / LLM:** Google Gemini API (`@google/genai`)
- **Hosting:** Vercel
