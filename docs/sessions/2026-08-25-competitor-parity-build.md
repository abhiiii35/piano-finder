# 2026-08-25 — Competitor-parity feature build (waves 1–3)

## What was done

Built the features scoped from `docs/prd-competitor-gap-2026-08-25.md` across three parallel-agent waves on branch `feature/scheduling-upgrades`:

**Wave 1 — scheduling:** reschedule (technician anytime; customer until per-tech cutoff, default 48h) + opt-in propose-times flow with no-login accept page (`/reschedule/[token]`); time-off blocks (`AvailabilityException`) enforced in slots and booking creation, managed on the Availability page and the calendar (hatched rendering, quick-create, one-click day block); calendar filters (service/customer/city, URL-synced); route planner (`/dashboard/technician/route`, nearest-neighbor, haversine ×1.3); auto-mileage on completion (previous-stop leg + return-home upsert, editable, Auto badge).

**Wave 2 — CRM, records, reminders:** Piano/Contact/ServiceLocation models with primary-flag exclusivity, billing address, tabbed customer detail, global search, `npm run backfill:pianos`; import suite (CSV/XLSX mapping UI + Gazelle preset, vCard, Google Contacts via People API with reconnect flow, merge-on-duplicate, 2000-row cap); service records with readings (pitch/humidity/temp), unified timeline, quick-log presets, photo/PDF attachments, recharts trends with healthy bands, environment alerts, Dampp-Chaser comparison, technician/client view preferences, customer My Pianos page, no-login client share page (`/p/[token]`); reminder engine (auto-generate on completion, AUTO/REVIEW modes, recall queue, editable templates, hourly appointment-reminder cron).

**Wave 3 — parity extras:** messages inbox (both roles), ICS calendar feed, full data export CSVs, checkout tips (webhook-stored `tipCents`), branded invoice PDFs (logo), tax summary PDF, insights dashboard (revenue/YoY/seasonality/margin/retention/LTV/city/slipping-away).

**Docs:** 11 user guides in `docs/user-guide/` + setup-notes (cron `x-cron-secret`, Google People API steps) + README feature overview refresh; CHANGELOG entries per wave.

## Commits (this branch)

- `7036c9b` schema + exception CRUD groundwork
- `fe1879e` schema for CRM/records/reminders/parity
- `821aa73` wave 1 features (39 files)
- `aed843d` fix: calendar date param parsed as local date (live-testing find)
- `68a6cd1` xlsx + recharts deps
- `fead43a` CLAUDE.md conflict-free parallel dispatch rules
- `c7c2112` wave 2 features (68 files)
- final commit (this one): wave 3 + docs + wiring

## Key decisions

- Interview answers: customer reschedule cutoff is per-technician setting; haversine now (Google Distance Matrix stays behind `GOOGLE_MAPS_BILLING_ENABLED`); time-block UI on both availability page and calendar; round-trip mileage including home base; vCard + Google OAuth contacts import (Apple has no web contacts API — vCard is the Apple path); CSV+XLSX; reminder send mode per technician (AUTO/REVIEW, default REVIEW); all four service-history extras plus per-technician view prefs and client-visibility controls; Recharts.
- Deferred by user decision: Stripe Connect payouts (platform commission = open decision), SMS reminders (needs owner's Twilio + A2P 10DLC), native apps/offline/multi-seat/multi-currency (PRD §5).
- Orchestration: 11 feature workers + 2 docs workers, disjoint file-ownership matrices; shared files (schema, package.json, deps) orchestrator-owned pre-dispatch. Mid-session the user ordered a pause/review of workflow conflicts → guardrails messaged to running workers and codified permanently in CLAUDE.md ("Conflict-free parallel dispatch") + session memory.

## Problems hit and resolutions

- Empty Prisma migration recorded (`migrate diff` flag renamed in Prisma 7: `--to-schema-datamodel` → `--to-schema`); removed bogus row from `_prisma_migrations`, regenerated real SQL, redeployed.
- Timezone trap (repo's documented recurring bug) hit again: calendar `date` param parsed as UTC midnight; caught by a worker's live walkthrough, fixed with local-date parsing (`aed843d`).
- Orchestrator `pkill -f "next dev"` killed a worker's verification server → workers now banned from pkill/port 3000/installs/migrations/dev.db mutation (CLAUDE.md).
- Mock-implementation leak across test describe blocks (`vi.clearAllMocks` clears calls, not implementations) — fixed by seeding default mocks per beforeEach.
- Stale `.next` validator types after deleting a dead API route — cleared `.next`, rebuilt.
- React Compiler lint rules (`react-hooks/purity`, `react-hooks/immutability`) flagged `Date.now()`/`window.location` patterns in new components — fixed structurally (hoisted helpers), not suppressed.

## Verification

- `tsc --noEmit` clean; 696/696 unit tests (75 files); eslint --quiet clean; production build 64 pages; coverage 90.01% (gate: 90).
- Live smoke on dev server as seeded technician + customer: reschedule page 404s bogus tokens; reminders/customers/import/settings/route/messages/insights/export/availability all 200; export CSV + tax PDF endpoints 200; bogus ICS token 404.

## Open items / next steps

- Platform commission % + Stripe Connect (blocked on product decision Q-2/Q-22 in the gap PRD).
- SMS reminders once Twilio + 10DLC exist (notification layer is template-driven, provider-agnostic).
- Cash tips not recorded (card tips only).
- Google People API must be enabled on the Google Cloud project + `contacts.readonly` scope on the consent screen (docs/user-guide/setup-notes.md).
- Cron jobs to schedule in prod: tune-reminders (daily+), appointment-reminders (hourly), header `x-cron-secret`.
- Worker suggestion for future sessions: worktree isolation (`isolation: "worktree"`) when disjoint ownership isn't clean — now in CLAUDE.md.
