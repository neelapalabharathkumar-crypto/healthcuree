# HealthCuree AI — Multi-Hospital Upgrade

## One important note first

The app already runs on Lovable Cloud (Postgres database + auth + file storage), not Firebase. Everything you asked for — accounts, roles, hospital separation, security rules enforced on the server — is fully supported there. Switching to Firebase would mean rebuilding the whole app and losing current data, so I'll keep the existing backend and treat "Firebase collections" in your brief as the data model to build.

## What exists today (audit)

Working: public site (home, about, departments, doctors, services, blog, contact, etc.), patient sign-up/sign-in incl. Google, patient portal (dashboard, booking, appointments, records, prescriptions, bills, notifications, profile), AI health assistant, blood bank search + donor registration, admin panel, reception panel with 5-digit code verification, doctor panel with prescriptions and report upload, mock payments.

Gaps to fix during this work: everything assumes a single hospital, doctors/departments have no hospital owner, staff logins aren't scoped, appointment list shows a shared query, and there is no hospital discovery for patients.

## Plan

### Stage 1 — Hospital foundation
- New `hospitals` table: name, logo, type, description, phone, email, website, emergency contact, emergency/ambulance flags, beds, full address, city/state/pincode, latitude/longitude, status, auto human code (H001, H002…).
- Add hospital ownership to departments, doctors, appointments, payments, prescriptions, medical reports, verification codes, blood stock.
- New `hospital_staff` link table (which staff member belongs to which hospital, plus employee/doctor code like H001-D001).
- New roles: super admin and hospital admin, alongside existing doctor/reception/patient.
- Access rules rewritten so every read and write is checked on the server against the caller's hospital. Hospital A can never reach Hospital B's rows, and patients only ever see their own.
- Existing content is migrated into one seeded hospital so nothing currently working breaks.

### Stage 2 — Super Admin panel
- Platform dashboard: hospitals, patients, doctors, appointments, revenue.
- Hospital list with search, status toggle, edit, and detail view.
- 6-step Add Hospital wizard: basic info → address (with map coordinates) → departments (18 presets + custom, fee/days/hours each) → doctors → reception staff → review & create. Creates the hospital, all records, and real staff login accounts with correct roles and hospital links in one action.
- Hospital detail tabs: overview, departments, doctors, reception staff, appointments, payments, reports.
- Platform-wide appointments, payments, patients, reports.

### Stage 3 — Staff panels scoped to one hospital
- Doctor panel: today's / upcoming / completed appointments, my patients, schedule, prescriptions, records, profile, notifications — all limited to their own hospital and their own patients.
- Reception panel: today's appointments, patient register, doctors, departments, appointment management with check-in, payments dashboard (today/total revenue, paid, pending, cash, online, failed, refunded, with date filters and daily/weekly/monthly reports), hospital profile, notifications — limited to their hospital.
- Hospital admin panel: same hospital, plus staff and department management for that hospital only.
- Login sends each account straight to the right dashboard; typing another panel's address redirects away.

### Stage 4 — Patient experience
- "Hospitals Near Me": uses browser location when allowed, otherwise search by city / area / PIN. Cards show logo, distance, type, address, departments, doctor count, starting fee, emergency and ambulance availability. Filters for distance, department, type, emergency, fee; sort by nearest / recommended / available today. Location is used in the moment and not stored.
- Hospital details page: profile, working hours, departments, doctors, fees, available slots, and Book / View Doctors / View Departments actions.
- Booking flow: hospital → department → doctor → date → available time → confirm details → payment method (UPI, online, cash at hospital) → confirmation with appointment ID and the existing 5-digit verification code.
- Appointment statuses: pending, confirmed, checked in, in consultation, completed, cancelled, no show.
- Payments record method, status (pending, paid, failed, cancelled, refunded, cash pending), reference and hospital. Online/UPI is clearly labelled as demo until a real payment provider is connected — no fake success messages.
- Patient history, prescriptions and records span all hospitals they've visited.

### Stage 5 — Preserve and improve
- Blood bank gains per-hospital stock (group, units available, last updated, contact, request status). Existing donor registry and public search stay as they are; hospital staff manage only their own stock, super admin sees all.
- AI assistant kept as-is, with a clear medical disclaimer and emergency guidance for serious symptoms.
- Branding, public pages, and all current patient features stay.

### Stage 6 — Test and fix
End-to-end pass on every role: super admin creates a hospital with departments, doctors and reception staff; those accounts log in and see only their hospital; a patient finds a hospital nearby, books, pays, gets a code; reception checks them in; the doctor consults and writes a prescription. Cross-hospital and cross-patient access attempts are verified to fail. Mobile, tablet and desktop checked on the key screens.

## Technical notes

- Postgres with row-level security; a `private.hospital_of(user)` helper plus role checks drive every policy, so isolation is enforced in the database, not the interface.
- Staff accounts are created server-side with the admin API; passwords are never stored or shipped in frontend code. The demo super-admin credential is created as a real account, not hard-coded in the UI.
- Distance uses stored latitude/longitude with a Haversine calculation in a server function; patient coordinates are passed per request and never persisted.
- Existing routes keep working; new sections are added under `/admin`, `/hospital`, `/doctor`, `/reception`, `/hospitals`.
- Delivered in the stage order above, each stage buildable and testable on its own.
