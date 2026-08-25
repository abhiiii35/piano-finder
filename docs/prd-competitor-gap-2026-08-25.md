# PRD: Competitor Gap Analysis — Cantus & PianoOps vs. Book A Piano Tuner

**Date:** 2026-08-25
**Status:** Draft for PM/engineering review
**Sources:** Full crawl of www.getcantus.com (all sections, pricing, FAQ, roadmap), www.pianoops.com (homepage, about, SMS program, terms/privacy, iOS App Store version history v0.0.1→v1.1.0, Google Play listing), web/review search (G2, Capterra, Piano World, app stores), and a code-level feature inventory of this repo (`src/`, `prisma/schema.prisma`, `PRD.txt`, `docs/build-prompts/`).

---

## 1. Executive summary

Cantus and PianoOps are **single-sided business-management SaaS for piano technicians** (scheduling, CRM, piano records, invoicing, reminders). Book A Piano Tuner is a **two-sided marketplace**: customer acquisition (search, SEO, job board, reviews) plus a technician dashboard.

**Our structural advantage neither competitor has:** demand generation. Neither Cantus nor PianoOps brings a technician a single new customer — they only manage existing ones. We do search, SEO city pages, a job board, public reviews, and customer accounts.

**Our structural weakness:** our technician dashboard is a thin business OS. Competitors win on retention tooling (recall/service-due tracking), piano health records, CRM depth, calendar flexibility, communications (SMS, templated reminders), and business analytics. A technician comparing dashboards side-by-side would today pick Cantus for running their business — and our marketplace value only materializes if technicians stay active on the platform.

**Strategic thesis for this PRD:** "Come for the leads, stay for the business OS." Close the technician-side gaps so the dashboard alone is competitive with a $19.95–$47.95/mo (Cantus) or $25–$85/mo (PianoOps) standalone product.

Also notable: three features already have schema or code in our repo but are **unwired** (tune reminders never populated, tips field with no UI, `stripeAccountId` never read). These are the cheapest wins in this document.

### Competitor snapshots

| | **Cantus** (getcantus.com) | **PianoOps** (pianoops.com) |
|---|---|---|
| Positioning | All-in-one business app for solo piano technicians; built by a working CPT (Davis Moore) | "The Operating System for the Piano Industry"; 3-person team incl. working technician |
| Platform | Web app only (offline-capable PWA); native apps on roadmap | Web app + **native iOS and Android** apps (iOS 15+; shipped Dec 2025, now v1.1.0) |
| Pricing | Flat $19.95/mo beta (invite-only, price-locked) → $47.95/mo standard from mid-Sept 2026; unlimited clients/pianos, all features, no trial | $25/seat/mo incl. 20 appointments, +$1/appointment over, capped $85/seat/mo; 30-day free trial |
| Maturity | Pre-public-launch, invite-only beta; no independent reviews exist | Live but very young (1 App Store rating); invoicing, bookkeeping, inventory, waitlists all still roadmap |
| Customer-facing | Client self-scheduling link + no-login client piano page | None (technician-side only) |
| Standout features | Recall queue, piano condition graphs, Stripe Connect invoicing, business insights suite, offline mode, route optimization | CRM structure (multi-contact/multi-location), SMS reminders w/ consent flow, templated auto-reminders, native mobile |

Market context: both position against **Gazelle** (growwithgazelle.com), the incumbent — client self-booking, geographic appointment grouping, full piano CRM, QuickBooks integration, from $7/mo usage-scaled. Worth tracking but not researched in depth here.

---

## 2. Feature comparison table

Legend: ✅ has it · ⚠️ partial · ❌ missing · 🗺️ announced roadmap, not shipped · **Us** = Book A Piano Tuner (verified in code, not PRD aspiration)

### Scheduling & calendar

| Feature | Cantus | PianoOps | Us | Notes on our state |
|---|---|---|---|---|
| Technician calendar (day/week/month) | ✅ (month + agenda) | ✅ (month) | ✅ | `src/components/dashboard/calendar*.tsx` |
| Client self-scheduling / online booking | ✅ (per-tech link, ZIP proximity suggestions) | ❌ | ✅ | Ours is marketplace-wide booking wizard — stronger |
| Travel-aware slot feasibility | ⚠️ (proximity suggestions only) | ❌ | ✅ | Unique to us: `src/lib/travel-feasibility.ts` |
| Reschedule an appointment | ✅ | ✅ | ❌ | Only cancel + rebook-from-scratch exists |
| Time blocks / mark day unavailable | ✅ (personal events) | ✅ (time-block + full-day toggle) | ❌ | We only have weekly recurring windows — no vacation days, no one-off blocks |
| Calendar filtering (service type / customer / city) | ❌ | ✅ | ❌ | |
| Calendar import (Google/ICS → appointments) | ❌ | ✅ | ❌ | PRD-planned, no code |
| Calendar export (ICS feed / Google sync) | ❌ | ❌ | ❌ | Whole market gap — cheap differentiator |
| Route optimization (best stop order + drive estimate) | ✅ | ⚠️ (map view exists) | ❌ | |
| Automatic per-appointment mileage capture | ✅ | 🗺️ | ⚠️ | We have *manual* `MileageLog` only |
| Waiting list for openings | ❌ | 🗺️ | ❌ | |
| Conflict-safe booking creation | ✅ | ✅ | ✅ | Transactional overlap check |

### Client management (CRM)

| Feature | Cantus | PianoOps | Us | Notes on our state |
|---|---|---|---|---|
| Client records w/ service history | ✅ | ✅ | ⚠️ | `CustomerRecord` is flat: one contact, one piano, one free-text notes field |
| Multiple pianos per client | ✅ | ✅ | ❌ | One piano's fields inlined on `CustomerRecord` |
| Multiple contacts per client + primary contact | ❌ | ✅ | ❌ | |
| Multiple service locations per client (institutions) | ❌ | ✅ (pianos attached to locations) | ❌ | Blocks schools/churches/universities segment |
| Billing address separate from service address | ❌ | ✅ | ❌ | |
| CSV contact import | ❌ | ✅ | ❌ | |
| Competitor data import (Gazelle) | ✅ (2-click, clients + pianos) | ❌ | ❌ | Switching-cost weapon |
| Phone contacts import (mobile) | ❌ | ✅ | ❌ | |
| Global search (any client/piano/record) | ✅ | ✅ | ⚠️ | Only per-page list search |
| Click-to-call / tap-to-text | ✅ | ✅ | ⚠️ | Plain text fields, no `tel:`/`sms:` links |
| Recall queue (who's due/overdue for service) | ✅ | ⚠️ (tuning-frequency field) | ❌ | Our `TuneReminder` model + cron exist but **no code ever creates rows** |
| Auto-create CRM record from completed job | ✅ | ✅ | ✅ | `src/actions/booking.ts` upserts on completion |

### Piano & service records

| Feature | Cantus | PianoOps | Us | Notes on our state |
|---|---|---|---|---|
| Piano as first-class entity (make/model/serial/history) | ✅ | ✅ | ⚠️ | Fields inlined on `CustomerRecord` and per-`Booking`; no `Piano` model |
| Tuning frequency / service interval per piano | ✅ | ✅ | ❌ | Drives recall — prerequisite for Epic A |
| Condition logs: pitch, humidity, temperature over time | ✅ | ✅ (charted readings, v1.0.0) | ❌ | Explicitly dropped earlier (`docs/build-prompts/README.md`) — revisit |
| Trend graphs with healthy-range bands | ✅ | ✅ | ❌ | |
| Environment alerts (out-of-range readings) | ✅ | ❌ | ❌ | |
| Dampp-Chaser installed flag + comparison analytics | ✅ | ❌ | ❌ | Niche but credibility-building with techs |
| Photos/audio/PDF attachments per piano or visit | ✅ (photo + audio) | ✅ (photo + PDF) | ❌ | Cloudinary already integrated for other uploads |
| Service report sent to customer after visit | ⚠️ (via client page) | ❌ | ❌ | PRD-planned |
| Services & pricing menu | ✅ | ✅ (custom appointment types) | ✅ | |

### Invoicing, payments & finance

| Feature | Cantus | PianoOps | Us | Notes on our state |
|---|---|---|---|---|
| Online card payment | ✅ (Stripe Connect → tech's own account) | 🗺️ | ⚠️ | Stripe Checkout → **platform's** account; no split/payout. `stripeAccountId` field exists, never used |
| Pay-by-link / QR code | ✅ | 🗺️ | ❌ | |
| Branded PDF invoices (tech's logo) | ✅ | 🗺️ | ⚠️ | PDF invoices exist; no technician logo/branding on them |
| Cash payment recording | ✅ | ❌ | ✅ | |
| Tips | ❌ | ❌ | ⚠️ | `Payment.tipCents` in schema + reports; **no UI writes it** |
| Deposits | ❌ | ❌ | ❌ | PRD-planned |
| Income/expense tracking w/ categories | ✅ | 🗺️ | ✅ | Finance hub is a genuine strength |
| Receipt photo on expenses | ⚠️ | ❌ | ✅ | |
| Mileage deduction at IRS rate | ✅ | 🗺️ | ✅ | Rate table current through 2026 |
| One-click tax summary PDF | ✅ | ❌ | ⚠️ | We have P&L view + CSV, no single accountant-ready PDF |
| QuickBooks-compatible export | ❌ (ledger "coming soon") | ❌ | ✅ | 3-column QBO bank-import CSV |
| Business net worth tracking | ✅ | ❌ | ❌ | |

### Reminders & communications

| Feature | Cantus | PianoOps | Us | Notes on our state |
|---|---|---|---|---|
| Transactional booking emails | ✅ | ✅ | ✅ | Resend, full lifecycle |
| Appointment reminder before visit (email) | ⚠️ (daily digest to tech; client reminders 🗺️) | ✅ (template + send-time rule) | ❌ | |
| SMS reminders/confirmations | 🗺️ | ✅ (consent flow, STOP/HELP, 160-char template) | ❌ | No SMS provider at all |
| Editable message templates | ✅ ("edit every automated message") | ✅ | ❌ | Our email copy is hardcoded |
| Timezone-aware template placeholders | ❌ | ✅ ({Time} adapts to business TZ) | ❌ | |
| Service-due recall outreach (prefilled call/text/email) | ✅ | ❌ | ❌ | |
| Postcard logging + 30-day follow-up | ✅ | ❌ | ❌ | |
| In-app customer↔tech messaging | ❌ | ❌ | ⚠️ | We're alone here — but **no inbox page**; threads only reachable from profile/booking |
| Push notifications | 🗺️ | ✅ | ❌ | |
| "Technician on the way" alert | ❌ | ❌ | ❌ | PRD-planned |

### Customer-facing & growth

| Feature | Cantus | PianoOps | Us | Notes |
|---|---|---|---|---|
| Marketplace search / directory | ❌ | ❌ | ✅ | Radius search, filters |
| SEO content (city cost pages, blog CMS) | ❌ | ❌ | ✅ | |
| Job board (customers post, techs apply) | ❌ | ❌ | ✅ | |
| Public reviews & ratings | ❌ | ❌ | ✅ | |
| Client-facing piano page (no-login share link) | ✅ (history, graphs, photos/audio, pay invoice, review prompt, contact buttons) | ❌ | ❌ | Their answer to our customer accounts |
| Review-request prompt timed post-service | ✅ | ❌ | ⚠️ | We collect reviews but never prompt |
| Technician verification / admin approval | n/a | n/a | ✅ | But homepage claims "background checks" we don't do — see Q-19 |

### Platform & operations

| Feature | Cantus | PianoOps | Us | Notes |
|---|---|---|---|---|
| Native mobile apps | 🗺️ | ✅ (iOS + Android) | ❌ | We're responsive web + bottom tab nav |
| Offline mode w/ sync | ✅ | ❌ | ❌ | |
| Multi-technician / seats | 🗺️ | ⚠️ (seats exist; pooled billing 🗺️) | ❌ | |
| Full data export (clients, pianos, history, photos) | ✅ (one-tap) | ✅ (CSV/PDF pre-cancellation) | ⚠️ | Finance CSV only |
| Self-service account deletion | ✅ | ⚠️ (90-day retention) | ❌ | |
| Multi-currency + mi/km units | ✅ (USD, ZAR, GBP, EUR…) | ❌ | ❌ | |
| Dark mode | ❌ | ✅ (dark-first design) | ✅ | |
| Inventory/parts tracking | 🗺️ | 🗺️ | ❌ | Both roadmap — market signal, not urgent |

### What we have that neither competitor has

Customer acquisition (search + SEO + job board), public reviews, in-app messaging, travel-aware slot feasibility, online card payments **live today** (PianoOps: roadmap; Cantus: live via Connect), QuickBooks CSV export, receipt-photo expense tracking, admin moderation pipeline, dark mode (vs Cantus).

---

## 3. Gap features to incorporate (developer specs)

Priorities: **P0** = wire what exists / broken-looking basics · **P1** = competitive necessity · **P2** = differentiation · **P3** = later. Effort: S <1 day · M 1–3 days · L 1–2 weeks · XL >2 weeks.

### Epic A — Recall & retention engine (P0/P1)

The single biggest competitive gap. Cantus's flagship feature is the recall queue; piano tuning is a recurring-service business (6/12-month cycles) and neither our customers nor technicians get any "you're due" signal today.

**A1. Wire the existing tune-reminder pipeline (P0, S).**
`TuneReminder` model, secret-protected cron endpoint (`src/app/api/cron/tune-reminders/route.ts`), send logic and email template all exist — but no code ever creates a `TuneReminder` row, so the pipeline is dead. On booking completion (`updateBookingStatus` in `src/actions/booking.ts`, where the CRM upsert already happens), create 6-month and 12-month reminders from `scheduledAt` for the customer email. Delete/regenerate on subsequent completions. Acceptance: completing a booking creates rows; cron sends when due; idempotent re-runs.

**A2. Tuning frequency per client/piano (P1, S).**
Add `tuningFrequencyMonths Int?` (default 6) to `CustomerRecord` (or the `Piano` model if C1 lands first). Editable on the CRM record form. A1 uses it instead of hardcoded 6/12. PianoOps has this field; Cantus infers interval adherence.

**A3. Recall queue dashboard (P1, M).**
New technician page `/dashboard/technician/recalls`: list of CRM records where `lastCompletedBooking + tuningFrequencyMonths ≤ now`, sorted most-overdue first, showing "Henderson — 4 months overdue" style rows (Cantus pattern). Row actions: call (`tel:`), email (prefilled `mailto:` or in-app send), "log outreach", dismiss/snooze. Derivable by query — no new model needed beyond an `OutreachLog` if we log contact attempts (recommended: `id, technicianId, customerRecordId, channel CALL/EMAIL/TEXT/POSTCARD, notes, createdAt`). Surface an overdue count badge on the technician dashboard.

**A4. Editable reminder/outreach templates (P1, M).**
Cantus markets "edit every automated message"; PianoOps has template + send-time rules. Add `MessageTemplate` model (`technicianId, type RECALL/APPT_REMINDER, subject, body, sendOffsetHours`), with `{customerName}`, `{pianoMake}`, `{lastServiceDate}`, `{bookingTime}` placeholders. Fall back to current hardcoded copy when unset. Note: the orphaned lifecycle-email code (`src/actions/lifecycle-email.ts`, `src/lib/email-templates.ts` — built, never called) either gets wired into this or deleted.

**A5. Appointment reminder emails to customers (P1, S once A4 exists).**
24–48h-before reminder via the same cron pattern as A1. Cantus lists this as roadmap; PianoOps ships it. Table stakes.

**A6. SMS reminders (P2, L).**
No SMS anywhere today. Requires: provider (Twilio or Resend-adjacent), A2P 10DLC campaign registration, per-customer consent capture (PianoOps model: technician confirms customer's consent in-app; STOP/HELP handling; 160-char template constraint), phone normalization. Do email-first (A5), SMS after PM answers Q-8/Q-9.

**A7. Postcard logging (P3, S).**
Log-only feature (Cantus): record "postcard mailed" as an `OutreachLog` entry; auto-create a follow-up recall entry 30 days later. No print/mail integration.

### Epic B — Piano health records (P1/P2)

Both competitors chart pitch/humidity/temperature per piano over time. This was explicitly dropped from our build (`docs/build-prompts/README.md`) — the competitive picture argues for reinstating it. It also feeds Epic F (client-facing page) and differentiates technicians' service quality.

**B1. `Piano` as first-class entity (P1, M).**
New model: `Piano { id, customerRecordId, make, model, serialNumber, type, location, tuningFrequencyMonths, damppChaserInstalled Boolean, notes }`. Migrate inlined fields from `CustomerRecord` (keep columns during transition, backfill, then drop). Booking wizard's piano fields link to or create a `Piano` when the technician completes the job. Enables multiple pianos per client (both competitors have this; we can't represent a church with 3 pianos).

**B2. Service visit records with readings (P1, L).**
`ServiceRecord { id, pianoId, bookingId?, technicianId, date, pitchOffsetCents Float?, humidityPct Float?, temperatureF Float?, workPerformed, recommendations, notes }`. Technician fills a short form when completing a booking (optional fields — one-tap skip). History tab on piano/CRM detail.

**B3. Trend graphs with healthy-range bands (P2, M).**
Line charts (humidity 40–60% band, pitch drift, temperature) on the piano detail page from `ServiceRecord` rows. Chart lib choice: PM question Q-13 (nothing chart-capable in deps today; Recharts is the obvious candidate).

**B4. Media attachments on pianos/visits (P2, M).**
Photos (and PDFs) on `Piano`/`ServiceRecord` via existing Cloudinary integration (`src/lib/cloudinary.ts` — pattern already used for portfolio/blog/receipts). Cantus also does audio clips — defer audio (Q-14).

**B5. Environment alerts + Dampp-Chaser analytics (P3, M).**
Alert when a logged reading is out of safe range; aggregate Dampp-Chaser vs non-equipped pitch stability across a technician's book (Cantus's credibility feature). Needs B2 data volume first.

### Epic C — CRM depth & import (P1/P2)

**C1. Multiple contacts & locations per client (P2, L).**
PianoOps's structural advantage — institutions (schools, churches, venues) have a facilities contact, a billing contact, several buildings. Models: `Contact { id, customerRecordId, name, email, phone, isPrimary }`, `ServiceLocation { id, customerRecordId, label, address…, isPrimary }`; `Piano.serviceLocationId`. Add `billingAddress` to `CustomerRecord`. Scope check with PM first (Q-5) — solo-residential-heavy books may not need this yet.

**C2. CSV import (P1, M).**
PianoOps ships it; Cantus ships Gazelle-specific import. Upload CSV → column-mapping UI → validated dry-run preview → create `CustomerRecord`s (skip/merge on duplicate email — unique constraint already exists on `(technicianId, customerEmail)`). This is the #1 onboarding-friction killer for techs with an existing book of clients.

**C3. Gazelle/competitor import (P2, M after C2).**
A preset mapping over C2 for Gazelle's export format (clients + pianos). Marketing-significant: both competitors court Gazelle switchers.

**C4. Global search (P2, M).**
One search box in the technician dashboard header across customers, pianos, bookings, invoices. SQLite/Turso: `LIKE`-based union query is fine at our scale; no search infra needed.

**C5. Click-to-call/text/email (P0, S).**
Render CRM/booking phone numbers as `tel:`/`sms:` links and emails as `mailto:`. Trivial; do with any adjacent work.

### Epic D — Calendar & scheduling upgrades (P0/P1)

**D1. Time blocks & days off (P0, L).**
Biggest scheduling hole: a technician cannot take a vacation day, block a dentist appointment, or mark a one-off closure — availability is only weekly recurring windows, so the booking wizard will happily sell slots on their day off. Model: `AvailabilityException { id, technicianId, startsAt, endsAt, allDay Boolean, reason? }`. Enforce in slot computation (`src/actions/booking.ts` `getAvailableSlots`) and render on the calendar. PianoOps: time-block + full-day toggle; Cantus: personal events on calendar. Date/boundary tests mandatory (project's known trap — local-date parsing).

**D2. Reschedule flow (P0, M).**
Both competitors reschedule; we force cancel + rebook. Add `rescheduleBooking(bookingId, newSlot)` server action re-running the same conflict/travel-feasibility checks, preserving services/payment state, emailing both parties. Customer-initiated reschedule policy: PM question Q-6 (cutoff window, who may reschedule).

**D3. Calendar filters (P1, S).**
Filter chips (service type, customer name, city) on the technician calendar — client-side filter over already-fetched bookings. PianoOps pattern.

**D4. ICS calendar feed export (P1, S–M).**
Neither competitor has calendar sync — cheap differentiator. Read-only tokened ICS feed URL (`/api/calendar/[token].ics`) subscribable from Google/Apple Calendar. Import (ICS/Google → appointments, PianoOps-style) is separate and larger — defer (Q-7).

**D5. Route optimization + auto-mileage (P2, L).**
Cantus flagship: optimal stop order for a day + "~42 miles · ~55 min" summary + per-appointment mileage auto-logged into the existing `MileageLog`/deduction pipeline. We already have haversine plumbing (`src/lib/travel-time.ts`) and a gated Google Distance Matrix provider (`GOOGLE_MAPS_BILLING_ENABLED`). Day-view "Optimize route" button → ordered list + total; log mileage rows on completion. Nearest-neighbor heuristic is fine at ≤10 stops/day. Google billing decision: Q-11.

### Epic E — Business insights (P1/P2)

Cantus's analytics suite is its premium-feel centerpiece; we show four numbers (`/dashboard/technician`). All of the below is derivable from existing `Payment`, `Booking`, `Expense`, `MileageLog`, `Review`, `CustomerRecord` data — no new capture needed.

**E1. Insights v1 (P1, L).** New `/dashboard/technician/insights`: monthly revenue trend (12mo), YoY growth, revenue by service type, average job value, seasonality (busiest months), expense ratio / profit margin trend. Chart lib per Q-13.

**E2. Retention & client analytics (P2, M).** Repeat-client rate, average client tenure, client lifetime value, "slipping away" list (ties into Epic A recall queue), revenue by city (booking lat/lng already stored).

**E3. Tax summary PDF (P2, S).** One-click accountant-ready annual PDF (income by category, expenses by category, mileage deduction) — compose existing `src/lib/finance/report.ts` output through the existing `@react-pdf/renderer` pipeline. Keep the never-computes-tax-owed rule.

**E4. Forecasting / acquisition ROI / net worth (P3).** Cantus-parity extras; revisit after E1/E2 adoption data.

### Epic F — Client-facing piano page (P2, L)

Cantus's most distinctive feature: per-client private share link, **no login required**, showing piano info + last/next service, condition graphs, photos, an open invoice with a pay button, a well-timed review prompt, and contact buttons. Our equivalent answer differs (customers have real accounts), but the no-login link matters for the 80% of clients who won't create an account.

Spec: tokened public route `/p/[token]` per `CustomerRecord` (unguessable token, revocable). Shows: piano(s) + service history (needs B1/B2), next-due date (Epic A), technician contact buttons, open unpaid invoice with Stripe pay link, review prompt after recent completed booking. Requires PM decision Q-15 (does this cannibalize customer accounts, or is it the wedge that feeds them?).

### Epic G — Payments upgrades (P1–P3)

**G1. Stripe Connect payouts (P1, XL).**
Today every card payment lands in the **platform's** Stripe account with no split or payout mechanism — fine for demo, not a real marketplace. `TechnicianProfile.stripeAccountId` exists unused. Move to Stripe Connect (Express accounts): tech onboarding link, destination charges with `application_fee_amount` (commission per Q-2), payout dashboard link. Cantus already gives techs direct-to-their-Stripe payments; this is also the prerequisite for monetizing via take-rate. Biggest single engineering item in this PRD.

**G2. Tips UI (P2, S).**
`Payment.tipCents` already flows through finance reports and CSV export — add the missing writer: optional tip selector on the Stripe Checkout line items (or post-service payment page). Decision Q-3.

**G3. Branded invoices (P2, S).**
Technician logo upload (Cloudinary) + business details rendered on the existing invoice PDF template.

**G4. Deposits (P3, M).** Partial-payment-at-booking; policy questions (amount, refund rules) → Q-4.

**G5. Wallets (P3, S).** Enable Apple/Google Pay by dropping the explicit `payment_method_types: ["card"]` restriction on Checkout sessions (Stripe then auto-offers wallets). Verify against current Stripe docs at implementation time.

### Epic H — Platform & housekeeping (P0–P3)

**H1. Messages inbox (P0, M).** We have threaded messaging but **no inbox** — no page lists a user's conversations; threads are only reachable via a technician profile button or booking detail. Add `/dashboard/messages` (both roles): thread list, unread badges, sidebar/bottom-nav link. Unread counts already tracked (`Message.isRead`).

**H2. Full data export (P1, M).** Both competitors offer full export (Cantus: one-tap, markets it as a trust feature). Extend the existing finance CSV export: ZIP of customers, pianos, bookings, service history, invoices CSVs. Also the honest answer to "what if I leave?"

**H3. Self-service account deletion (P2, M).** Settings-page deletion with grace period (Cantus: 30-day; PianoOps: 90-day). Legal/policy per Q-18.

**H4. PWA + push notifications (P2, M).** Manifest + service worker (installable app, Cantus's current model) and web push for new bookings/messages. Full offline sync (Cantus) is XL and deferred — Q-16.

**H5. Native mobile apps (P3, XL).** PianoOps ships native; Cantus is racing there. Not in scope until PWA data says otherwise — Q-16.

**H6. Multi-technician seats (P3, XL).** Both competitors: roadmap/partial. Watch, don't build — Q-17.

**H7. Multi-currency & units (P3, M).** Cantus is international (USD/ZAR/GBP/EUR, mi/km); we're US-only ($, miles, IRS rates hardcoded). Only if Q-20 says international is in scope.

### Suggested sequencing

1. **Sprint-sized P0 batch:** A1 (wire reminders), D2 (reschedule), D1 (time blocks), H1 (messages inbox), C5 (tel/mailto links). After this batch we look *finished* rather than *behind*.
2. **P1 wave:** A2+A3+A4+A5 (recall engine), C2 (CSV import), B1 (Piano entity), D3+D4, E1, H2, G1 (Connect — start early, longest lead).
3. **P2 wave:** B2–B4, C1/C3/C4, D5, E2/E3, F, G2/G3, H3/H4.
4. **P3:** hold for adoption data + PM answers.

---

## 4. PM / developer question checklist

Answers needed before (or during) implementation. Grouped; blocking items marked ⛔ for their epic.

### Strategy & positioning
- [ ] **Q-1 ⛔(scope of everything):** Are we staying a two-sided marketplace, or also selling the technician dashboard as standalone SaaS (Cantus/PianoOps model)? If SaaS: subscription price point vs. their $19.95–$85/mo range, and does marketplace commission stack on top?
- [ ] **Q-2 ⛔(G1):** What is our take rate / commission on marketplace bookings? Flat fee vs percentage? This determines Stripe Connect charge architecture (destination charge + `application_fee_amount` vs separate transfers).
- [ ] **Q-19:** Homepage currently claims "verified with credentials, certifications, and background checks" but admin review is a manual read of self-reported text. Do we (a) build real verification (which provider? cost per check?) or (b) soften the copy now? (Legal exposure either way.)
- [ ] **Q-20:** Is international (multi-currency, km) in scope this year, or explicitly US-only? (Affects H7, IRS-rate assumptions, SMS provider choice.)

### Recall & communications (Epic A)
- [ ] **Q-5a:** Default tuning interval — 6 months, 12, or per-piano required field? Who can change it (tech only, or customer preference too)?
- [ ] **Q-6a:** Recall reminders: sent automatically to customers, or queued for the technician to approve/send? (Cantus queues for the tech; auto-send risks techs feeling bypassed.)
- [ ] **Q-8 ⛔(A6):** SMS provider preference (Twilio vs alternatives)? Who owns A2P 10DLC registration — platform-level brand or per-technician campaigns? Budget per message?
- [ ] **Q-9 ⛔(A6):** SMS consent model: PianoOps-style (technician attests verbal consent, STOP/HELP auto-handled) or explicit customer opt-in at booking? Legal review needed?
- [ ] **Q-10:** May technicians edit *all* automated email copy (Cantus's pitch) or only the recall/reminder templates? (Full editability = support burden + brand-consistency risk.)

### Piano records (Epic B)
- [ ] **Q-12 ⛔(B1):** Migration approach sign-off: introduce `Piano` model and backfill from `CustomerRecord`/`Booking` inline fields — OK to run a data migration on production Turso? Maintenance window?
- [ ] **Q-13 ⛔(B3,E1):** Chart library choice (Recharts vs alternatives) — no charting dep exists today; whoever lands first (B3 or E1) sets it.
- [ ] **Q-14:** Audio recordings on pianos (Cantus has them): in scope or photos/PDFs only? (Audio = new storage/playback path; Cloudinary supports it but UX is nontrivial.)

### CRM (Epic C)
- [ ] **Q-5 ⛔(C1):** Do our current/target technicians serve institutions (schools, churches, venues)? If <10% of book, defer multi-contact/multi-location (C1) and keep flat CRM.
- [ ] **Q-21:** CSV import duplicate policy: skip, merge, or prompt per-row? Max rows per import?

### Scheduling (Epic D)
- [ ] **Q-6 ⛔(D2):** Reschedule policy: can customers self-reschedule, and up to how close to the appointment (24h? 48h?)? Does reschedule require technician re-confirmation? Fees?
- [ ] **Q-7:** Calendar import (external events → block our availability) — needed at launch, or is export-only (D4) enough for v1?
- [ ] **Q-11 ⛔(D5):** Turn on Google Distance Matrix billing (`GOOGLE_MAPS_BILLING_ENABLED`) for route optimization, or ship haversine-based estimates first? Monthly API budget?

### Payments (Epic G)
- [ ] **Q-3:** Tips: at checkout (pre-service) or post-service payment link? Suggested percentages or free amount? Does the platform take commission on tips? (Recommend: no.)
- [ ] **Q-4:** Deposits: required for all bookings or technician-configurable? Amount (flat vs %)? Refund policy on cancellation?
- [ ] **Q-22 ⛔(G1):** Stripe Connect account type — Express (Stripe-hosted onboarding, recommended) vs Custom? Who eats processing fees, tech or platform? Payout schedule?

### Client-facing (Epic F)
- [ ] **Q-15 ⛔(F):** Build the no-login client piano page, or double down on customer accounts instead? (Cantus's model targets techs' *existing* clients — exactly the users who never signed up with us. Could be our conversion wedge: page footer = "create account to rebook".)

### Platform (Epic H)
- [ ] **Q-16 ⛔(H4/H5):** Mobile strategy: PWA + push first (cheap), native later only if adoption demands? Or is native app-store presence a marketing requirement now (PianoOps has it, Cantus is coming)?
- [ ] **Q-17:** Multi-technician shops: any real demand in our pipeline? (Both competitors say roadmap — nobody's captured it yet.)
- [ ] **Q-18:** Account deletion grace period (30 vs 90 days) and what survives deletion (reviews? bookings the other party owns?) — needs a data-retention policy decision.
- [ ] **Q-23:** Pricing-page transparency: both competitors publish exact prices; we publish none. What do customers/techs pay today, and does that go public?

---

## 4.5 Implementation status — updated 2026-08-25 (same day, PR #7)

Shipped on `feature/scheduling-upgrades`: **A1–A5** (reminder engine, recall queue, templates, appointment reminders — SMS A6 deferred pending Twilio/10DLC), **B1–B5** (Piano entity, service records w/ readings, trend graphs, attachments incl. PDF, environment alerts + Dampp-Chaser stat), **C1–C5** (multi-contact/location, CSV+XLSX import w/ Gazelle preset, vCard + Google Contacts, global search, tel/mailto), **D1–D3** (time blocks, reschedule + propose-times, calendar filters), **D4** export-side (ICS feed; import deferred), **D5** (route planner + auto-mileage, haversine), **E1–E3** (insights dashboard, retention/LTV/city, tax PDF), **F1** (client share page), **G2/G3** (tips, branded invoices), **H1/H2** (messages inbox, data export). Plus per-technician view-customization for service history (beyond both competitors).

Still open: **G1 Stripe Connect** (blocked on commission decision Q-2/Q-22), **A6 SMS** (owner's Twilio + 10DLC), **A7 postcard log**, **H3 account deletion**, **H4/H5 PWA/native**, **E4**, multi-currency (Q-20). User guides for everything shipped: `docs/user-guide/`.

## 5. Out of scope (deliberately)

- **Inventory/parts tracking** — roadmap-only at *both* competitors; no shipped product to match. Revisit when either ships.
- **General ledger / double-entry accounting** — Cantus roadmap; our QBO CSV export covers the accountant handoff.
- **Offline-first sync** — Cantus's differentiator, XL effort, weak fit with our marketplace-first usage; reconsider with H5.
- **Piano marketplace (sales/moving), dynamic pricing, AI scheduling** — already parked in our own PRD's future section.

## 6. Source appendix

- Cantus: https://www.getcantus.com/ (single-page site: features, compare table, roadmap, pricing, FAQ). No independent reviews exist (invite-only beta; not on G2/Capterra/app stores). Self-published testimonial + 9-min demo video only.
- PianoOps: https://www.pianoops.com/ (+ /about, /sms-program, /legal/terms, /legal/privacy); iOS App Store id6748567563 version history v0.0.1 (2025-12-12) → v1.1.0 (2026-08-15); Google Play com.threestrand.pianoops. One App Store rating; no forum/G2/Capterra coverage found.
- Market incumbent context: Gazelle — https://growwithgazelle.com/product/, /pricing/.
- Our feature inventory: code-verified against `src/`, `prisma/schema.prisma`, `PRD.txt`, `docs/build-prompts/README.md` on 2026-08-25.
