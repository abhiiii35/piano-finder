# Session — Security & compliance audit (2026-08-26)

## What was done
Re-verified every finding in `SECURITY.md` (2026-07-15) against the current code (branch `feature/scheduling-upgrades`, which landed a full day of CRM/messaging/scheduling work on 2026-08-25, after that audit) and fixed everything still present:

- **IDOR** on `GET /api/messages/[threadId]` — added the participant-ownership check the server action already had.
- **PII/financial-account leak** on `GET /api/technicians/[id]` — replaced the full-row spread with an explicit public-field allow-list.
- **Stripe webhook replay** — added `event.id` idempotency via a new `WebhookEvent` table (unique-constraint `create()` as the atomic claim).
- **Rate limiting** — new `src/lib/ratelimit.ts` (in-memory fixed-window, per-IP or per-user) wired into: login, signup, `sendMessage`, `getAvailableSlots`, the message-poll route, and `/search`.
- **Geocode caching** — `src/lib/geocoding.ts` now caches resolved addresses (7-day TTL) and misses (5-min TTL), protecting the app's shared IP from Nominatim's abuse policy.
- **Security headers** — `next.config.ts` now sends `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS, and a report-only CSP.
- **Timing-safe CRON secret comparison** — found the *same* bug in both cron routes (only one was in SECURITY.md's file list); extracted a shared `src/lib/cron-auth.ts` helper so it can't drift between the two again.
- **`npm audit fix`** (no `--force`): 28 → 10 advisories, zero `package.json` changes (all fixes were within existing semver ranges).

Full finding-by-finding detail, dependency-check output, and the Phase 0/module compliance table are in `docs/compliance/2026-08-26-compliance-audit.md`.

## Key decisions
- **Extracted `src/lib/bounded-map.ts`** (a shared bounded-insert-with-eviction helper) rather than duplicating the same "evict oldest entry at N keys" logic in both `ratelimit.ts` and `geocoding.ts` — small DRY win, and it's what let both get cheaply unit-tested without a slow 20k/50k-iteration integration test in each.
- **Stripe webhook idempotency uses a real DB table, not an in-memory Set.** This app is a candidate for serverless deployment (Vercel), where in-memory state doesn't survive between invocations — a Set would silently do nothing. The unique-constraint `create()` is also atomic, which a check-then-insert wouldn't be.
- **Did not fix `deletePhoto`'s missing ownership check** (SECURITY.md Low-Medium) — it needs ownership wired through every caller (portfolio, review, service-record photos) to fix correctly, which is more than a smallest-diff pass; recorded as an open item instead of a rushed partial fix.
- **Did not bump `next`/`sharp`/`postcss`** past what `npm audit fix` (no `--force`) would do on its own — `npm audit fix --force` wants `next@16.3.3`, and this app's `CLAUDE.md`/`AGENTS.md` document extensive Next-16.2.1-specific behavior verified against that exact version. A major-ish bump deserves its own session with a full regression pass, not a drive-by inside a security audit.
- **CSP shipped report-only, not enforcing.** Enumerated the known script/image origins (Google Maps JS API, Cloudinary, Google account avatars, Stripe's hosted-Checkout redirect needs no client script) by grepping the codebase rather than a live network-tab capture (no deployment exists), so it's a best-effort policy pending real violation-report review.

## Problems hit and how resolved
1. **`npm audit fix` bumping the lockfile broke nothing, but my own new code did.** Adding rate limits to `signUp` and idempotency to the Stripe webhook broke 4 existing unit tests:
   - `signUp`'s new per-IP limit (5/hour) tripped on the 6th call within one test file, since all tests in a Vitest run share one process and my mocked `getClientIp()` always resolves the same "unknown" IP. Fixed by exporting a test-only `resetRateLimits()` and calling it in that file's `beforeEach`.
   - The Stripe webhook's `catch` block originally treated **any** error from `prisma.webhookEvent.create()` — including the mocked Prisma client not having a `webhookEvent` model yet — as "this is a duplicate, no-op it." That's a real bug, not just a test artifact: a genuine DB outage would have silently swallowed a real payment webhook forever. Fixed by checking specifically for Prisma's `P2002` (unique-constraint) error code and returning `500` (so Stripe retries) on anything else; added `webhookEvent: createMockModel()` to the shared `__tests__/helpers/mocks.ts`.
2. **Adding the new helper files dropped statement coverage below the repo's 90% push-gate threshold** (89.68% → would have blocked `git push` per `scripts/pre-deploy-check.sh`). Wrote `__tests__/lib/ratelimit.test.ts`, `__tests__/lib/bounded-map.test.ts`, and extended `__tests__/lib/geocoding.test.ts` / `__tests__/lib/auth.test.ts` / `__tests__/app/api/stripe-webhook.test.ts` to close the gap — ended at 90.09%. These are also exactly the "boundary check" tests Step 3 of the audit process asked for (rate-limit allow/block/window-reset, bucket eviction, constant-time secret comparison, geocode cache hit), not coverage-padding for its own sake.
3. **e2e verification was blocked by a pre-existing, unrelated bug**: rebuilding `test.db` from scratch via `prisma migrate deploy` fails with `P2022: column reminderMode does not exist`. Traced it to migration `20260825200051_scheduling_upgrades` (committed 2026-08-25, before this audit) doing a SQLite table-redefinition of `TechnicianProfile` that drops 3 columns (`reminderMode`, `historyViewPrefs`, `clientViewPrefs`) added by the immediately-prior migration. `dev.db` itself still has those columns (it drifted from migration history — confirmed via `prisma migrate dev`'s drift warning when I first tried to add my own migration, which is why I used `prisma migrate deploy` instead to avoid resetting local dev data). Not a security defect and out of scope to fix here (smallest-diff rule), so I substituted a live smoke test against the real (already-drifted, working) `dev.db` + real seeded accounts instead — see the compliance doc's Verification section for the actual curl output (IDOR fix confirmed with three live requests: unauthenticated → 401, wrong user → 403, correct participant → 200 with real data).

## Open items / next steps
See the Open Items table in `docs/compliance/2026-08-26-compliance-audit.md` for the full list with severities. Highest-priority for the owner:
1. The pre-existing migration bug (`reminderMode`/`historyViewPrefs`/`clientViewPrefs` dropped on a fresh deploy) — will break a new Turso database on first deploy. Needs a follow-up migration, independent of this security work.
2. `next`/`sharp`/`postcss`/`xlsx` dependency advisories that need a deliberate major-version decision.
3. Provider-side spend caps (Google Maps key restriction, Stripe/Resend dashboards) — can't be set from the repo.
4. Everything marked N/A-until-deploy / FAIL-open in the Phase 0 table (privacy policy, ToS clickwrap, accessibility statement, incident-response one-pager, data map) — deliberately not built for a pre-launch app with no live traffic, per the audit instructions; build before public launch.

## Verification summary
- `npx tsc --noEmit` — clean
- `npm run lint -- --quiet` — clean
- `npm run test:run` — 711/711 passed
- `npx vitest run --coverage` — 90.09% statements
- `npm run build` — succeeds
- `npx tsx scripts/security-check.ts` — 9/9 boundary checks passed
- Live smoke test against `npm run dev` + real `dev.db` — see compliance doc

## Files touched
Everything the orchestrator should review/commit — see the "Security fixes applied" list in `docs/compliance/2026-08-26-compliance-audit.md` for file:line detail, and the closing report for the full modified/created file list.
