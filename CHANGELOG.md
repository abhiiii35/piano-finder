# Changelog

## 2026-08-25 — Scheduling upgrades (competitor-parity wave 1)
- Reschedule: technicians reschedule any upcoming booking; customers self-reschedule until a per-technician notice window (`TechnicianProfile.rescheduleCutoffHours`, default 48h). Conflict + travel-feasibility re-checked; services/payment preserved; both parties emailed.
- Propose times (opt-in `proposeTimesEnabled`): technician offers 2–4 open slots; client books one from a no-login email link (`/reschedule/[token]`, 7-day expiry) or opens the full scheduler.
- Time off: `AvailabilityException` model enforced in slot computation and booking creation; managed on the Availability page and directly on the calendar (hatched blocks, click-to-create, one-click "Mark day unavailable" in month view).
- Calendar filters: service type / customer / city chips with URL sync.
- Route planner (`/dashboard/technician/route`): nearest-neighbor stop order (haversine × 1.3 road factor) with total miles / driving minutes.
- Auto-mileage: completing a booking logs the leg from the previous stop (or home base) plus a same-day return-home leg, marked Auto; all mileage rows editable/deletable on Finances.
- Fix: calendar `date` search param parsed as a local date (was UTC midnight — day/month views queried the previous day).

## 2026-08-25 — CRM depth, imports, reminders (wave 2)
- Piano, Contact, ServiceLocation models: multiple pianos (make/model/serial/year/type/room/frequency/Dampp-Chaser), multiple contacts and service locations per client with primary flags, separate billing address; tabbed customer detail page; `npm run backfill:pianos` migrates legacy single-piano fields.
- Global search in the dashboard header: clients, contacts, pianos (serial), locations, bookings.
- Import suite (`/dashboard/technician/customers/import`): CSV/XLSX with column-mapping UI + dry-run preview, Gazelle header preset, vCard upload, Google Contacts (People API; requires contacts.readonly scope — see docs/user-guide/setup-notes.md). Duplicates merged (blank fields only), 2000-row cap.
- Reminder engine: tune reminders auto-generate on booking completion from piano tuning frequency; AUTO/REVIEW send modes; recall queue at `/dashboard/technician/reminders` with Send now / Mark handled; editable recall + appointment templates with placeholders; hourly appointment-reminder cron (`/api/cron/appointment-reminders`, `x-cron-secret`).

## 2026-08-25 — Piano service records, history timeline, trends, and client share page
- `src/actions/service-record.ts`: technician-scoped CRUD for `ServiceRecord` (authz via `piano.customerRecord.technicianId`), plus `saveHistoryViewPrefs`/`saveClientViewPrefs` for the new view-preference JSON columns. Exports `createServiceRecordFromBooking(bookingId)` — builds a PLATFORM-source record from a completed booking, matching/creating the customer's `Piano` by make+model — **export only**, not wired into booking completion yet.
- `src/actions/share.ts`: `enableShareLink`/`revokeShareLink` set/clear `CustomerRecord.shareToken` (48-char hex).
- Technician piano detail page (`/dashboard/technician/customers/[id]/pianos/[pianoId]`): header with Dampp-Chaser badge and tuning frequency, Timeline/Add entry/Trends tabs, quick-log presets, Cloudinary photo uploads, an environment banner when the latest humidity reading is outside 40–60%, and recharts trend lines (healthy bands for humidity ±10% and pitch ±5¢).
- Client-facing surfaces — customer dashboard (`/dashboard/customer/pianos`) and the no-login share page (`/p/[token]`) — reuse the same `Timeline` component in read-only mode; internal notes are stripped server-side (`src/lib/client-timeline.ts`) and never reach either surface regardless of preferences.
- Settings page (`/dashboard/technician/settings/history`): edit `historyViewPrefs`/`clientViewPrefs`, manage custom quick-log presets, and a Dampp-Chaser pitch-stability comparison (hidden unless both groups have ≥3 readings).
- `src/actions/photos.ts` extended to accept PDF uploads (service record attachments), in addition to JPEG/PNG/WebP.
- New `src/components/records/share-link-card.tsx` (enable/copy/revoke a client link) — exported for the orchestrator to place on the customer detail page.
- Tests: validation boundaries (humidity 0/100, pitch ±200, temperature 20–120, date-not-future), authz on all CRUD + share actions, `createServiceRecordFromBooking` piano matching/creation, client-visibility filtering (internal notes never leak), and Dec 15 + 6 month / month-end next-due boundary cases.

## 2026-08-25 — Messaging, calendar feed, exports, payments extras, insights (wave 3)
- Messages inbox (`/dashboard/messages`, both roles): threads grouped with unread counts; sidebar links added.
- ICS calendar feed: tokened read-only subscription URL (`/api/calendar/[token]`) with enable/regenerate/disable on the Availability page.
- Full data export (`/dashboard/technician/export`): customers, pianos, contacts, locations, service history, bookings as CSV (share/calendar tokens deliberately excluded).
- Tips: optional tip (10/15/20%/custom) added to Stripe Checkout as its own line item; stored on `Payment.tipCents` via webhook metadata; shown on invoices.
- Branded invoices: technician logo upload on Profile; rendered on emailed and downloaded invoice PDFs.
- Tax summary PDF: one-page accountant-ready annual summary (`/api/finances/tax-summary?year=`) from the Finances Reports tab; states it is not tax advice.
- Insights (`/dashboard/technician/insights`): 12-month revenue trend, YoY, revenue by service, seasonality, margin trend, repeat rate, client lifetime value, revenue by city, "clients slipping away" list.
- User guides added under `docs/user-guide/` (scheduling, CRM, importing, service records, reminders, setup notes) and README feature overview refreshed.

## 2026-08-25 — Competitor gap analysis PRD
- Added `docs/prd-competitor-gap-2026-08-25.md`: deep research on Cantus (getcantus.com) and PianoOps (pianoops.com) — feature comparison tables vs Book A Piano Tuner, prioritized gap specs in 8 epics (recall engine, piano health records, CRM depth, calendar upgrades, business insights, client-facing piano page, payments/Stripe Connect, platform), and a 23-question PM/developer checklist. Research + docs only; no code changes.

## 2026-08-12 — Admin user portal

- Admin → Users: searchable list of all tuner and customer accounts with role/status filters (`/dashboard/admin/users`).
- Per-user troubleshooting page: profile, services, availability, recent bookings, reviews, verification status.
- Account actions: suspend/reactivate (suspended accounts vanish from search and cannot sign in; nothing is deleted), resend verification email, send password reset.
- New public forgot-password flow: `/forgot-password` + emailed single-use, 1-hour link to `/reset-password/[token]`.
- Suspension enforced globally via proxy (all routes), not just the dashboard.

## 2026-08-12 — Code review fixes (security/audit-2026-07-15 branch)

- Fixed missing `afterEach` import in `__tests__/lib/queries/technicians.test.ts` that failed `tsc --noEmit` and blocked the Husky push gate.
- Hoisted fake-timer setup (clock pinned to 2026-07-15) into the `getNextAvailableSlot` describe's `beforeEach`, making all seven tests in the block deterministic instead of two.
- Restored lost test coverage: Saturday inclusive end-of-window boundary for the `this-week` filter, and nearest-day selection when the nearer slot has a lower dayOfWeek.
- Split the combined this-week window test into separate found/null tests and renamed titles to match the actual end-of-calendar-week (Saturday) semantics, not "within 7 days".
- Corrected fabricated header name `X-Frame-Established` → `X-Frame-Options` in SECURITY.md.
- Created CHANGELOG.md and session summary (this file and docs/sessions/2026-08-12-security-audit-review-fixes.md).

## 2026-07-15 — Security audit & deterministic tests

- Added SECURITY.md: full security audit and hardening guide (commit 14875ae).
- Pinned availability-window tests to a fixed clock to stop midnight/day-of-week flakes (commit 47c655b).
