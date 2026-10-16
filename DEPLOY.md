# CareAfter — Deployment & Verification Guide

## 1. Environment Configuration

Ensure the following variables are configured in `.env.local` (local development) and your production host (e.g., Vercel):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash
PATIENT_SESSION_SECRET=careafter_super_secure_patient_session_secret_min_32_chars
```

---

## 2. Database Migrations

Run all migrations in order using the Supabase SQL Editor:
1. `supabase/migrations/001_initial_schema.sql` (Hospitals, profiles, departments, patients, audit)
2. `supabase/migrations/002_fix_rls.sql` (RLS policies)
3. `supabase/migrations/003_phase3_monitoring.sql` (Monitoring plans, checkins, responses, alerts, app_settings)
4. `supabase/migrations/004_patient_auth.sql` (Patient username unique index & password_hash; drops sim_token)

---

## 3. Seed & Backfill Demo Data

To populate sample hospitals, doctors, and backfill all demo patients with valid patient portal logins:

```bash
npm run seed
npx tsx scripts/backfill-patient-credentials.ts
```

### Seeded Credentials:
- **Hospital Staff (Laptop):**
  - Sunrise Hospital: `admin@sunrise.demo` / `CareAfter2025!`
  - Lakeview Medical (Tenant Isolation Demo): `admin@lakeview.demo` / `CareAfter2025!`
- **Patient Portal (Phone / Mobile Browser):**
  - Route: `/patient/login`
  - Demo Patient: `rajesh.sharma` / `rajesh62`
  - Demo Patient: `mary.varghese` / `mary71`

---

## 4. End-to-End Phone & Laptop Testing Workflow

Instead of the old `/sim` token link or QR code, test using a real two-device or split-window setup:

1. **Laptop (Admin / Doctor)**:
   - Sign in at `/login` as `admin@sunrise.demo`.
   - Navigate to **Enrol Patient** (`/app/patients/enrol`).
   - Fill out Step 1 (Basics: Full Name, Age, Phone) and click **Continue to Clinical History**.
   - Notice the patient account is created instantly in `pending` status, with generated credentials (e.g. `anitha.menon` / `anitha62`).

2. **Phone / Incognito Tab (Patient)**:
   - Navigate to `/patient/login`.
   - Enter `anitha.menon` and `anitha62`.
   - See the comforting pending screen: *"Your hospital is setting up your care plan..."* with active live polling.

3. **Laptop (Admin / Doctor)**:
   - Complete Step 2 (paste or upload clinical note) and extract with Gemini.
   - Review Step 3 (verify medications, select Monitoring Tier, and check Consent).
   - Click **Confirm & Enrol Patient**.
   - Credentials are confirmed on screen with single-click Copy buttons.

4. **Phone (Patient - Live Switch)**:
   - Notice the phone screen **switches live without refreshing** to the active Day 1 Check-In questions!
   - Switch language to **Malayalam (മലയാളം)** or **Hindi (हिंदी)** and tap the speaker icon to test Web Speech audio playback.
   - Answer with a concerning symptom (e.g. sudden calf pain or chest tightness).
   - Notice precise branching follow-up questions unfold dynamically.
   - Click **Submit Check-In**.

5. **Laptop (Admin Dashboard)**:
   - Head to `/app/dashboard`.
   - The alert immediately appears via Supabase Realtime with the clinical assessment paragraph and severity triage chip (**Critical**, **Urgent**, or **Watch**).
   - Test the simulated fast-forward time controls (`+3 Hours`, `+1 Day`, `+1 Week`, `Reset`) to verify monitoring progression across simulated time.
