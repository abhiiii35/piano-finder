# Security & Compliance Audit — bookapianotuner (piano-finder)

**Date:** 2026-08-26
**Auditor:** Claude security/compliance audit, 2026-08-26
**Git branch:** `feature/scheduling-upgrades`
**Repo:** `abhiiii35/piano-finder` — ships via PR review, not direct push to `main` (different account owns the repo).
**Inputs:** project `SECURITY.md` (2026-07-15 audit + 2026-07-15 abuse/cost-DoS addendum), `/Users/nicholasnguyen/Claude/Claude Code Projects/SECURITY-MASTER.md` §§2, 4, 5, and `/Users/nicholasnguyen/Claude/website compliance/SOP.md` Phase 0.

## Scope note
This is a local/pre-launch app: no production deployment, no third-party trackers/pixels, no live customer traffic. Phase 0 checks that only make sense against a deployed site are marked **N/A-until-deploy** with the deploy-time action stated — no consent banners, privacy policy, or GPC handling were built, per instructions, since there is nothing live to disclose and no tracker to gate.

---

## Security findings — verified against SECURITY.md, then fixed

All findings below were re-verified against the current code before fixing (SECURITY.md is from 2026-07-15; the codebase has changed since — a `feature/scheduling-upgrades` branch with CRM, reminders, messaging, and scheduling work landed 2026-08-25). Every High/Medium finding was still present as described.

| # | Severity | Finding | Status | Fix |
|---|---|---|---|---|
| 1 | High | `GET /api/messages/[threadId]` — any signed-in user reads any thread (no participant check) | **Fixed** | `src/app/api/messages/[threadId]/route.ts:38-51` — added the same customer/technician ownership check the server action (`getMessages`) already does. |
| 2 | High | `GET /api/technicians/[id]` spreads the full DB row — leaks home GPS (`latitude`/`longitude`/`addressLine1`) and `stripeAccountId` to unauthenticated callers | **Fixed** | `src/app/api/technicians/[id]/route.ts:9-30` — replaced `include` + spread with an explicit `select` allow-list (id, bio, businessName, yearsExperience, certifications, serviceRadius, city, state, pianoTypes, travelFeeCents, ptgMember, portfolioPhotos, isVerified, isActive, user.name, services). Verified the one consumer (`(public)/technicians/[id]/book/page.tsx`) only reads those fields — no regression. |
| 3 | Low (webhook section) | Stripe webhook verifies signature but has no `event.id` idempotency — a replayed signed event re-sends the payment receipt email | **Fixed** | New `WebhookEvent` model (`prisma/schema.prisma:497-500`, migration `20260826142445_add_webhook_event_idempotency`) + `src/app/api/webhooks/stripe/route.ts:33-41` — atomically claims `event.id` via a unique-constraint `create()` before doing anything else; a `P2002` violation is treated as a no-op replay, any other error returns 500 so Stripe retries instead of silently dropping a real failure. |
| 4 | Medium | No rate limiting on login/signup | **Fixed** | `src/lib/auth.ts:29-33` (10 attempts / 15 min per email in `authorize()`, throws `TOO_MANY_ATTEMPTS`, surfaced as a plain-language message on the sign-in page) and `src/actions/auth.ts:13-19` (5 sign-ups / hour per IP). |
| 5 | Medium | `sendMessage` has no rate limit; fires an email per call | **Fixed** | `src/actions/messages.ts:59-62` — 20 sends / minute per user. |
| 6 | Medium | `getAvailableSlots` is unauthenticated and fans out to a free Nominatim geocode + (when enabled) paid Google Distance Matrix calls, with no cap | **Fixed** | `src/actions/booking.ts:527-543` — 30 calls / minute per IP; also benefits from the geocode cache below. |
| 7 | Medium | Message-poll route (`GET /api/messages/[threadId]`) has no server-side throttle | **Fixed** | Same route as #1 — 60 req/min per user (generous headroom over the client's 5s poll interval). |
| 8 | Low | Public `/search` geocodes on every request, no caching — risks the shared server IP getting rate-limited/banned by Nominatim | **Fixed** | `src/lib/geocoding.ts` — in-memory cache (7-day TTL on success, 5-min TTL on a miss so a transient outage doesn't poison it for a week; bounded to 20k entries). Benefits `/search`, booking availability, and technician onboarding at once (all three call `geocode()`). Also added a 20 req/min per-IP limit on `/search` itself (`src/app/(public)/search/page.tsx`). |
| 9 | Medium | Missing security headers | **Fixed** | `next.config.ts` — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS, and a report-only CSP (see Open Items — not yet enforcing). |
| 10 | Low | CRON secret compared with `!==` (non-constant-time) | **Fixed** | New shared `src/lib/cron-auth.ts` (`secretsMatch`, `timingSafeEqual`-based) used by both `src/app/api/cron/tune-reminders/route.ts:23` and `src/app/api/cron/appointment-reminders/route.ts:44` — the second cron route had the identical bug and wasn't in SECURITY.md's file list; found by grepping every route using `cronSecret !== expectedSecret` per the root-cause-not-symptom rule. |

### Checked, no fix needed (already correct or accepted trade-off)
- Prisma parameterized queries — no SQL injection surface found.
- Blog HTML sanitized with an allowlist before storage.
- `.env`/`.env.local` correctly gitignored; `git log --all` shows no `.env`/`.env.local` ever committed. `.env.test` and `.env.example` are tracked but contain no real secret (confirmed by reading both).
- No secret in any `NEXT_PUBLIC_*` var (checked `.env.example`).
- Email enumeration on signup/resend-verification and `.env.test` being tracked — both already flagged in SECURITY.md as conscious, low-risk trade-offs; left as-is per that finding's own recommendation.
- `deletePhoto` (Cloudinary) has no ownership check on the passed `publicId` (Low-Medium in SECURITY.md) — **not fixed this pass**: deletion-only impact (no read), not in the named P0/P1 set, and fixing it correctly needs wiring ownership through every caller (portfolio photos, review photos, service-record photos) — flagged as an open item rather than a rushed partial fix.

## Dependency check
`npm audit --omit=dev` (before): **28 vulnerabilities** (3 critical, 15 high, 8 moderate, 2 low).
`npm audit fix` (no `--force`): fixed 18, all within existing `package.json` semver ranges (package-lock.json only — no `package.json` version changes). **Remaining: 10** (1 low, 7 high, 2 critical):
- `next` 16.2.1 → 16.3.3 fix needs `--force` (npm reports it as "outside the stated dependency range" even though it's a minor version) — **not applied**, needs a deliberate bump + full regression pass given how much Next-16-specific behavior this app depends on (see `AGENTS.md`/`CLAUDE.md`).
- `postcss`, `sharp` — transitively pulled in by the `next` bump above; same call.
- `xlsx` — **no fix available upstream** (prototype pollution + ReDoS advisories). Used for CSV/XLSX import (`src/actions/import.ts`, `src/lib/import/`) of technician-uploaded customer lists. Residual risk: a technician importing a malicious `.xlsx` could trigger the ReDoS/prototype-pollution bug. Mitigations already in place: import is authenticated (technician-only), and `src/lib/import/parse.ts` runs the file through validation before use — but the underlying library bug isn't patched. Recommend evaluating a maintained alternative (`exceljs`) on the owner's own timeline; not done here (would be a real code change to import parsing, out of scope for a smallest-diff security pass).

## Verification
- `npx tsc --noEmit` — clean, no errors.
- `npm run lint -- --quiet` — clean.
- `npm run test:run` (Vitest, mocked Prisma) — **711 tests passed**, 0 failed (was 696 before this audit; added 15 new tests covering the new rate-limit/idempotency/geocode-cache logic, fixed 2 pre-existing tests that broke against the new logic — see Session doc).
- `npx vitest run --coverage` — **90.09% statements** (repo's push-gate minimum is 90%; was ~89.7% immediately after adding the untested helpers, brought back up with `__tests__/lib/ratelimit.test.ts`, `__tests__/lib/bounded-map.test.ts`, and additions to `__tests__/lib/geocoding.test.ts` / `__tests__/lib/auth.test.ts` / `__tests__/app/api/stripe-webhook.test.ts`).
- `npm run build` — succeeds (Next 16.2.1, Turbopack).
- Standalone boundary script `scripts/security-check.ts` (`npx tsx scripts/security-check.ts`) — 9/9 checks passed (rate limiter allow/block/isolation, bounded-map eviction, constant-time secret comparison incl. different-length inputs, geocode cache hit).
- **Live smoke test** (`npm run dev`, real `dev.db`, real seeded accounts):
  - `GET /api/technicians/<real id>` → response no longer contains `latitude`/`longitude`/`addressLine1`/`stripeAccountId` (verified by field-list diff).
  - `GET /api/messages/<real thread>` unauthenticated → `401`.
  - `GET /api/messages/<real thread>` authenticated as `admin@example.com` (not a participant) → `403 {"error":"Not authorized"}`.
  - `GET /api/messages/<real thread>` authenticated as the actual participant (`customer@example.com`) → `200` with the real message history (no regression).
  - `curl -I /` → `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Content-Security-Policy-Report-Only` all present.
- **e2e (Playwright) — UNVERIFIED-live, blocked by a pre-existing bug unrelated to this audit**: `npm run test:e2e` rebuilds `test.db` from scratch via `prisma migrate deploy`. That fails with `P2022: column reminderMode does not exist` — migration `prisma/migrations/20260825200051_scheduling_upgrades/migration.sql` (committed 2026-08-25, `7036c9b`, before this audit started) does a SQLite table-redefinition of `TechnicianProfile` that omits `reminderMode`, `historyViewPrefs`, and `clientViewPrefs` (added by the *earlier* migration `20260825151200_crm_records_reminders`) from both the `CREATE TABLE new_TechnicianProfile` and the `INSERT INTO ... SELECT` column lists — so those 3 columns are silently dropped on any **fresh** migration replay. The local `dev.db` still has them (it drifted from migration history, confirmed by `prisma migrate dev` reporting "Redefined table TechnicianProfile" drift when I first tried to add the `WebhookEvent` migration — I used `prisma migrate deploy` instead specifically to avoid resetting `dev.db`). **This means a fresh production deploy (new Turso database) via `prisma migrate deploy` would currently come up missing those 3 columns.** Not a security finding, not touched (out of scope — smallest diff, not a named defect), but flagged here because it blocked e2e verification and is a real deployability risk. Recommend a follow-up migration that adds the 3 missing columns back (`ALTER TABLE TechnicianProfile ADD COLUMN ...`) before the next fresh deploy.

## Phase 0 checklist (SOP Phase 0 — every site)

| Check | Result | Evidence |
|---|---|---|
| 0.1 Third-party script inventory | **N/A-until-deploy** | No deployment exists to profile in DevTools. Code-level scan: only third-party origins referenced are Google Maps JS API (`@googlemaps/js-api-loader`, client-side, used in `service-area-map.tsx`), Cloudinary (image hosting, no script), and Stripe (server-side hosted Checkout redirect — no `stripe.js`/Elements loaded client-side, confirmed by grep). At deploy time: run this inventory against the live site with DevTools open per SOP 0.1. |
| 0.1 Data map | **FAIL-open** | Not built — flagged for the owner. A one-table map (category → storage → vendor → purpose → retention) is straightforward given the schema (`prisma/schema.prisma`) but wasn't produced this pass; scope was security fixes, not the full data-map deliverable. |
| 0.1 Page/feature inventory | PASS (informal) | Forms (signup, booking, messages), payments (Stripe Checkout), uploads (Cloudinary photos), login (NextAuth credentials + Google) all identified while reading the code for the security pass. |
| 0.2 Privacy policy | **N/A-until-deploy** | No live site to link a policy on. Build before public launch; must match the 0.1 data map once that exists. |
| 0.2 Terms of service / clickwrap | **N/A-until-deploy** | No account-creation flow reviewed for a ToS checkbox in this pass (out of scope for a security audit); flagged for a dedicated compliance pass before launch. |
| 0.2 Accessibility statement | **FAIL-open** | No accessibility statement page exists. Cheap to add; not built this pass (would need real content, not a security fix). |
| 0.3 HTTPS/HSTS | **N/A-until-deploy** — code-level PASS | HSTS header now sent by the app (`next.config.ts`, this audit); actual TLS termination happens at the hosting layer, not verifiable locally. Verify with `curl -I` against the deployed URL at launch. |
| 0.3 Passwords hashed | PASS | `bcryptjs`, cost factor 12 (`src/actions/auth.ts:34`, `src/lib/auth.ts`). |
| 0.3 Encrypt data at rest | **N/A-until-deploy** | Local dev uses plain SQLite; production target is Turso (libsql) — verify Turso's at-rest encryption / enable it at deploy time. |
| 0.3 Dependency patching cadence | **FAIL-open** | No automated advisory alerts (e.g. Dependabot) configured that this audit could find. `npm audit` run manually this pass (see Dependency check above); recommend enabling Dependabot/Renovate on the GitHub repo. |
| 0.3 Incident-response one-pager | **FAIL-open** | Doesn't exist. Flagged for the owner (`abhiiii35`) — needs a named decision-maker, not something this audit can author. |
| 0.4 Email hygiene (CAN-SPAM) | **N/A-until-deploy** | Transactional email sender is Resend (`src/lib/email.ts`); no promotional/marketing email exists yet in this app (only transactional: verification, password reset, booking, message, receipt). Revisit if a marketing-email feature is added. |

## Applicable modules
- **Module A (Accessibility)** — applies, there's a full UI. Quick code-level pass done: `lang="en"` set (`src/app/layout.tsx:34`), no `<img>` tags without `alt` found (repo-wide grep), no `next/image` usage found without an `alt` prop, single `<h1>` spot-checked on sign-in page. **No cheap violations found to fix.** Full Module A.3 conformance (automated axe/Lighthouse scan + manual keyboard/screen-reader pass across every template) is **not done** — needs real browser tooling this audit didn't run; open item.
- **Module S (Payments)** — Stripe hosted Checkout is used (no card data touches the app's own servers — confirmed no `stripe.js`/Elements client-side integration), which keeps this at SAQ A. PASS on the code-level check; PCI DSS 4.x script-integrity/anti-skimming requirements are **N/A-until-deploy** (nothing to monitor without a live checkout page).
- **Module AI** — no AI/LLM-backed features found in this app (checked for chatbot/assistant patterns; none present). Not applicable.
- **Module T (Tracking-tech)** — no third-party pixel, session-replay, or chat-widget script found in the codebase. Not applicable today; re-check if analytics/marketing tooling is ever added (SOP: "no size threshold").
- **Module P (Privacy program)** — thresholds depend on user volume/state, which this pre-launch app doesn't have yet. **N/A-until-deploy**; revisit once there's real traffic and a jurisdiction to evaluate against.
- **Module C (Commerce)** — Stripe Checkout is a one-time payment for a booking, not a subscription — ROSCA/CA-ARL auto-renewal disclosure requirements don't apply as currently built.

## Security fixes applied — file:line
See the Findings table above for the mapping; consolidated list:
- `src/app/api/messages/[threadId]/route.ts:11-51`
- `src/app/api/technicians/[id]/route.ts:1-52` (full-file rewrite of the select)
- `src/app/api/webhooks/stripe/route.ts:27-41`
- `prisma/schema.prisma:497-500` (new `WebhookEvent` model)
- `prisma/migrations/20260826142445_add_webhook_event_idempotency/migration.sql` (new)
- `src/lib/ratelimit.ts` (new — shared in-memory limiter + `getClientIp`)
- `src/lib/bounded-map.ts` (new — shared bounded-Map insert used by the limiter and the geocode cache)
- `src/lib/cron-auth.ts` (new — shared constant-time secret comparison)
- `src/app/api/cron/tune-reminders/route.ts:1-29`
- `src/app/api/cron/appointment-reminders/route.ts:1-50`
- `src/lib/auth.ts:6,29-33`
- `src/app/(auth)/sign-in/page.tsx:39-46`
- `src/actions/auth.ts:9-19`
- `src/actions/booking.ts:15,527-543`
- `src/actions/messages.ts:11,59-62`
- `src/lib/geocoding.ts` (caching added throughout)
- `src/app/(public)/search/page.tsx:1-58`
- `next.config.ts` (full rewrite — headers + report-only CSP)
- `package-lock.json` (`npm audit fix`, no `package.json` changes)

## Open items

| Item | Severity | Owner action needed |
|---|---|---|
| `next`/`sharp`/`postcss` need a major-ish bump (`npm audit fix --force`) to close 9 more advisories | High | Owner decision — dedicate a session to bump + full regression given Next-16-specific behavior this app relies on. |
| `xlsx` has 2 unpatched advisories (prototype pollution, ReDoS), no upstream fix | High | Evaluate `exceljs` or another maintained replacement for `src/lib/import/`; out of scope for this pass. |
| `deletePhoto` has no ownership check on the Cloudinary `publicId` | Low-Medium | Wire ownership through every caller before fixing — deferred, not a P0/P1. |
| Pre-existing migration bug drops `reminderMode`/`historyViewPrefs`/`clientViewPrefs` on a fresh `prisma migrate deploy` | High (deployability, not security) | Add a follow-up migration restoring the 3 columns before the next fresh deploy (new Turso instance) or `test:e2e` run from a clean `test.db`. Blocks this audit's e2e verification. |
| CSP is report-only, not enforced | Medium | Deploy, monitor violation reports for the enumerated origins (Google Maps, Cloudinary, Google avatar images), then flip to enforcing `Content-Security-Policy`. |
| Full Module A accessibility conformance (automated scan + manual keyboard/screen-reader pass) | Medium | Needs real browser/axe tooling against a running instance; not run this pass. |
| Data map, privacy policy, ToS clickwrap, accessibility statement, incident-response one-pager | Varies | All **N/A-until-deploy** or **FAIL-open** — see Phase 0 table. None of these make sense to author speculatively for an app with no live traffic and no named legal/compliance owner yet; build before public launch. |
| Provider-side spend caps (Google Maps key restriction + daily quota, Stripe/Resend dashboards) | High (cost-DoS backstop) | Owner action — verify in each provider's dashboard; not something this audit can set. |
| `.env.test` is tracked in git | Low | Accepted per the original SECURITY.md finding — contains only a test-only `NEXTAUTH_SECRET`, never a real secret. No action unless that changes. |
| Email enumeration on signup/resend-verification | Low | Accepted trade-off per the original SECURITY.md finding (UX vs. enumeration risk). |
