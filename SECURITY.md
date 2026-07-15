# Security Audit — bookapianotuner (2026-07-15)

## Summary

Overall the app is in good shape: server actions consistently check `getServerSession` + role + resource ownership, Prisma's parameterized queries eliminate SQL injection, blog HTML is sanitized with an allowlist before storage, and the Stripe webhook verifies signatures. Two real access-control gaps were found in the REST API routes (as opposed to the server actions, which are written correctly) that leak private data to the wrong users. No RCE, SSRF, command injection, or committed secrets were found.

**Counts:** Critical: 0 · High: 2 · Medium: 2 · Low: 3

## Findings

### [High] Broken access control — any authenticated user can read any conversation's messages

**File:** `src/app/api/messages/[threadId]/route.ts:11-27`

```ts
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
...
const messages = await prisma.message.findMany({ where, ... }); // no ownership filter
```

This route only checks that *a* session exists — it never checks that `session.user.id` is the customer or technician on the thread. Compare with the server action doing the same job correctly, `getMessages()` in `src/actions/messages.ts:110-132`, which fetches the thread's first message and verifies `userId === first.customerId || userId === tech.userId` before returning anything. The API route (used for polling — see `src/components/messages/message-thread.tsx:54-58`) skips that check entirely.

**Exploit:** Any signed-in customer or technician who obtains another user's `threadId` (format `${customerId}:${technicianId}:${bookingId}` or `${userId}:${technicianId}:general`, both built from real, resolvable database IDs) can call `GET /api/messages/<threadId>` directly and read the full private message history between two other parties — no membership in that conversation required.

**Confirmed** — the code path has zero authorization check beyond "is logged in"; verified by reading the full route handler.

**Fix:** Reuse the same ownership check as the server action before returning messages:

```ts
if (messages.length > 0) {
  const first = messages[0];
  const tech = await prisma.technicianProfile.findUnique({
    where: { id: first.technicianId },
    select: { userId: true },
  });
  if (session.user.id !== first.customerId && session.user.id !== tech?.userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
}
```
Better: extract `validateParticipant`-style logic into a shared helper in `src/lib/` and call it from both the server action and this route so the check can't drift again.

---

### [High] Excessive data exposure — public technician API leaks home coordinates and Stripe account ID

**File:** `src/app/api/technicians/[id]/route.ts:9-16, 28-34`

```ts
const [technician, reviewAgg] = await Promise.all([
  prisma.technicianProfile.findUnique({
    where: { id },
    include: { user: {...}, services: {...} },
  }), ...
]);
...
return Response.json({ technician: { ...technician, avgRating, reviewCount } });
```

This route has **no auth check at all** (by design — it's the public technician-profile endpoint), but it spreads the *entire* `TechnicianProfile` row into the JSON response. Per `prisma/schema.prisma`, that row includes `latitude`, `longitude`, `addressLine1` (the technician's home/business address geocoded to exact coordinates), `stripeAccountId` (their Stripe Connect account identifier), and `rejectionReason` (an admin's private note from a rejected onboarding review) — none of which the public-facing profile page needs or should show.

**Exploit:** Any unauthenticated visitor viewing a technician's public profile page (`/technicians/[id]`) triggers this exact API call (see `src/app/(public)/technicians/[id]/book/page.tsx:139`) and can just as easily `curl https://.../api/technicians/<id>` directly to get precise home-address GPS coordinates and the technician's Stripe account ID for any technician on the platform — a real physical-safety/stalking risk for technicians who work out of their home, plus an unnecessary financial-account disclosure.

**Confirmed** — verified against the Prisma schema; the endpoint requires no session and returns the raw row.

**Fix:** Select only public-safe fields instead of spreading the whole model:

```ts
const technician = await prisma.technicianProfile.findUnique({
  where: { id },
  select: {
    id: true, bio: true, businessName: true, yearsExperience: true,
    certifications: true, serviceRadius: true, city: true, state: true,
    pianoTypes: true, travelFeeCents: true, ptgMember: true, portfolioPhotos: true,
    isVerified: true, isActive: true,
    user: { select: { name: true } },
    services: { where: { isActive: true }, orderBy: { priceCents: "asc" } },
  },
});
```
Never expose `latitude`/`longitude`/`addressLine1` (use them only server-side for radius search and travel-time math, which already happens elsewhere), `stripeAccountId`, `rejectionReason`, or `onboardingStatus` internals through any public API.

## Medium

### [Medium] No rate limiting on login and signup

**File:** `src/lib/auth.ts:23-49` (credentials `authorize`), `src/actions/auth.ts:10-68` (`signUp`)

**Exploit (theoretical):** Nothing throttles repeated `POST /api/auth/callback/credentials` attempts, so an attacker can brute-force a known user's email/password at whatever rate the server and bcrypt cost allow. `signUp` similarly has no throttle, enabling account-creation spam / email-bombing of arbitrary addresses via the verification email.

**Theoretical** — no PoC run (per instructions, the app was not started), but the absence of any rate-limit/lockout code is confirmed by grep across `src/`.

**Fix:** Add IP+email based rate limiting (e.g., `@upstash/ratelimit` if Redis/Upstash is available, or a simple in-memory/DB-backed sliding window keyed on email+IP) in front of the credentials `authorize()` callback and `signUp`/`resendVerification`. Lock out or slow down after ~5 failed attempts per 15 minutes.

### [Medium] Missing security headers

**File:** `next.config.ts` (empty config)

No `Content-Security-Policy`, `X-Frame-Established`/`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, or `Permissions-Policy` are set anywhere (checked `next.config.ts`, `proxy.ts`, and all route handlers — none set response headers).

**Confirmed absent**, exploitability is context-dependent (defense-in-depth against XSS/clickjacking, not a standalone bug).

**Fix:** Add a `headers()` function in `next.config.ts` applying at least:
```ts
async headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ],
  }];
}
```
Add a CSP once the Tiptap/Google Maps/Cloudinary/Stripe script origins are enumerated (start in report-only mode to avoid breaking those integrations).

## Low

### [Low] CRON endpoint uses non-constant-time secret comparison

**File:** `src/app/api/cron/tune-reminders/route.ts:22` — `if (cronSecret !== expectedSecret)`

**Theoretical.** A network-timing side channel on a JS string `!==` comparison is very hard to exploit in practice over HTTPS/the internet, but it's a one-line fix.

**Fix:** `import { timingSafeEqual } from "crypto"` and compare fixed-length buffers, or just leave as-is if this is acceptable residual risk — flagging for completeness.

### [Low] Email enumeration on signup and resend-verification

**File:** `src/actions/auth.ts:26-29` (`"An account with this email already exists"`) and `:70-74` (`"No account found with this email"`)

**Confirmed** distinguishable responses let an attacker check whether a given email is registered. Common tradeoff for UX; flagging so it's a conscious choice, not an oversight.

**Fix:** If this matters for your threat model, return a generic "If that email is registered, we've sent instructions" message for `resendVerification`, and consider the same for signup (at the cost of a worse UX when a user mistypes their own email).

### [Low] `.env.test` committed to git

**File:** `.env.test` (tracked in git)

**Confirmed**, but low risk as-is: it only contains `NEXTAUTH_SECRET="test-secret-e2e"` used for the local Playwright/e2e run against `test.db`, not a production secret.

**Fix:** No action required as long as this file never carries a real secret. Add a comment at the top of `.env.test` reminding future editors it's committed and must stay test-only.

## Hardening checklist ("how to make this unhackable")

**Auth**
- [ ] Add rate limiting (per-IP and per-email) to `authorize()` in `src/lib/auth.ts` and to `signUp`/`resendVerification` in `src/actions/auth.ts`.
- [ ] Extract the thread-participant check used in `src/actions/messages.ts` `getMessages()` into a shared `assertThreadParticipant(userId, threadId)` helper and call it from both the server action and `src/app/api/messages/[threadId]/route.ts`.
- [ ] Add a generic audit note: any *new* `src/app/api/**/route.ts` handler must call `getServerSession` **and** verify the resource belongs to that session's user/role before touching Prisma — this project's server actions already do this consistently; the one API route that didn't is the High finding above.

**Input validation**
- No missing-validation issues found — every mutating server action runs its payload through a Zod schema before touching the DB. Keep this pattern for all new actions/routes.

**Secrets**
- [ ] Confirm `CRON_SECRET` is set to a long random value in production (it's not documented in `.env.example` — add it there as an empty placeholder so it isn't forgotten at deploy time).
- [ ] Keep `.env`, `.env.local` out of git (already correctly gitignored) — don't relax this.

**Dependencies**
- [ ] Run `npm audit` (not run as part of this audit per the read-only constraint) and address any High/Critical advisories before the next deploy.
- [ ] `next-auth@^4.24.13` is on the legacy v4 line; v5 (`next-auth@beta`/`auth.js`) has a different session/JWT API. No known active CVE was identified for 4.24.13 at review time, but plan a v5 migration on your own timeline rather than reactively.

**Headers/config**
- [ ] Add the `headers()` block in `next.config.ts` described in the Medium finding above.
- [ ] Once headers are in place, add a CSP (start `Content-Security-Policy-Report-Only`) covering Google Maps, Cloudinary, Stripe.js, and Tiptap's needs before enforcing it.

**File handling**
- [ ] `uploadPhoto` (`src/actions/photos.ts`) already allowlists MIME type and caps size at 5MB before handing the buffer to Cloudinary — no path traversal risk since no local filesystem writes occur. No change needed.
- [ ] `deletePhoto` takes a raw `publicId` string with no ownership check tying it to the calling user's own uploads — a signed-in user could pass another user's Cloudinary `publicId` and delete their photo. Low-to-medium impact (deletion only, no read), but worth scoping: store `publicId` against the owning record (booking review, portfolio, etc.) and verify ownership before calling `cloudinary.uploader.destroy`.

## Dependency & config notes

- `package.json` versions (next 16.2.1, react 19.2.4, prisma 7.6.0, next-auth 4.24.13, stripe 21.0.1, bcryptjs 3.0.3, sanitize-html 2.17.5, jose 6.2.2) all look current as of this review; none are visibly years-stale. Full CVE coverage requires running `npm audit` against the registry, which was intentionally not done here (read-only audit, no installs/network calls performed).
- No security headers configured in `next.config.ts` (see Medium finding).
- `.gitignore` correctly excludes `.env`, `.env.local`, `*.db`, `/src/generated/prisma`; verified none of `dev.db`/`test.db` are tracked in git despite being present on disk.
- `.env.example` and `.env.test` are the only env-shaped files tracked in git; neither contains a real secret.
- CORS: no custom CORS headers are set anywhere (no `Access-Control-Allow-Origin: *` found) — Next.js route handlers default to same-origin, which is correct for this app since there's no public API meant for cross-origin consumption.

## Abuse & Cost-DoS (Denial-of-Wallet) — added 2026-07-15

Scope: rate-limit/spend-cap vectors only, per the earlier audit's own hardening checklist which already flagged "no rate limiting" generically. This section finds the *specific, previously-unlisted* endpoints where that gap has a real dollar or availability cost, plus one webhook-replay gap.

### [Medium] Public, unauthenticated server action fans out to a free-but-ToS-limited geocoder AND (when enabled) a paid Google Maps API — no rate limit

**File:** `src/actions/booking.ts:464-474` (`getAvailableSlots`) → `src/actions/booking.ts:379-403` (`buildFeasibilityContext`) → `src/lib/travel-time.ts:25-48` (`googleProvider.travelMinutes`, real Google Distance Matrix API call) and `src/lib/geocoding.ts:26-53` (`geocode`, Nominatim call)

`getAvailableSlots` has **no `getServerSession` check at all** — contrast with the sibling `createBooking` (`src/actions/booking.ts:28-29`) and `updateBookingStatus` (`:199`), which both gate on session. Any visitor on a technician's public booking page (or anyone who scripts the Next.js server-action RPC directly) can call this repeatedly with an arbitrary `technicianId`/`date`/`customerAddress`, and each call:
- geocodes the supplied address via free Nominatim with zero caching/debounce (server-side, not the client-typed search box), risking the shared server IP being rate-limited/banned under Nominatim's usage policy (1 req/sec) — an outage for every real user's search, not just this caller;
- if `GOOGLE_MAPS_BILLING_ENABLED=true` in production, calls the **paid** Google Distance Matrix API once per candidate slot comparison, with no cap.

**Exploit:** `for i in $(seq 1 100000); do curl .../booking action.../getAvailableSlots ...; done` — no session cookie required, no per-IP or per-technician throttle anywhere in the call chain.

**Confirmed** — read the full call chain; no auth check, no rate limit, no cache.

**Fix:** Add a `getServerSession` check (even an "anonymous but rate-limited" tier) or, at minimum, wrap `getAvailableSlots` in a per-IP sliding-window limiter (e.g., 10 req/min) before it reaches `geocode`/`googleProvider`. Cache geocoded addresses (they're stable) instead of re-geocoding on every slot check.

### [Medium] `sendMessage` has no rate limit — each call also fires a transactional email with no throttle

**File:** `src/actions/messages.ts:44-103`

`sendMessage` requires a session (`validateParticipant`, line 59) so it's not fully anonymous, but nothing throttles how often one authenticated user can call it. Every successful send also does a `prisma.user.findUnique` ×2 and, if the recipient has an email, an unconditional `sendEmail(...)` call (line 97) to a transactional-email provider (Resend, per stack) — a metered/paid API. Content is capped at 2000 chars (`src/lib/validations/message.ts`) so per-message payload isn't the issue; call *frequency* is.

**Exploit:** A signed-in customer or technician scripts rapid-fire `sendMessage` calls to a real counterpart (or to themselves via a "general" thread) — each call is a DB write plus one outbound transactional email, at whatever rate the client can issue requests. This both floods the recipient's inbox and drains email-send quota/cost.

**Confirmed** — no rate-limit code found anywhere in `src/actions/messages.ts` or its callers.

**Fix:** Per-user sliding-window limiter (e.g., 1 message per 2-3 seconds, or N per minute) in `sendMessage` before the `prisma.message.create` call; consider batching/skipping the email notification if the same sender messaged the same recipient within the last few minutes.

### [Medium] Message-poll endpoint has no server-side throttle — client's 5s interval is not enforced server-side

**File:** `src/app/api/messages/[threadId]/route.ts:6-39`; polled from `src/components/messages/message-thread.tsx:44-70` (client `setInterval(..., 5000)`)

The 5-second poll interval is purely client-side JS. The route itself does a `prisma.message.findMany` with `include: { sender: ... }` on every hit with no rate limiting, caching, or `Cache-Control` headers. A bot bypassing the browser and hitting this URL directly (using a `threadId` it's authorized for — or, until the separately-reported broken-access-control finding above is fixed, *any* thread) can hammer it at any rate, generating one DB query per request indefinitely.

**Exploit:** Trivial `while true; do curl -H "Cookie: ..." .../api/messages/<threadId>; done` loop — no 429s, no backoff, ever.

**Theoretical** (requires a valid session cookie, so bounded by the population of registered accounts — but signup itself has no rate limit per the existing Medium finding above, so an attacker can mint many accounts first).

**Fix:** Add a per-user (or per-IP) rate limiter to this route (e.g., 1 req/sec, matching the client's own poll cadence) and set `Cache-Control: private, max-age=1` or similar short cache so rapid duplicate polls within the same second are cheap.

### [Low] Stripe webhook has payment-level idempotency but no `event.id` dedup — a replayed valid signed event resends the payment-receipt email

**File:** `src/app/api/webhooks/stripe/route.ts:27-77`

Signature verification is present and correct (already noted as a strength in the original audit). The handler does dedupe the `Payment` row itself (`existing` check, lines 32-44, updates instead of double-inserting), but the `sendEmail(...)` call for the payment receipt (lines 57-75) runs unconditionally on every event that reaches this branch, regardless of whether the `Payment` already existed. There's no stored table of processed `event.id`s to short-circuit a second delivery of the *same* event.

**Exploit (theoretical):** Stripe's signature-timestamp tolerance is ~5 minutes by default; anyone who captures one legitimately-signed raw webhook payload+signature (e.g., via Stripe CLI `stripe events resend`, a proxy/log leak, or Stripe's own retry-then-succeed-then-retry-again edge cases) can replay it within that window to re-trigger the receipt email each time, at no cost to the attacker but at Resend-send cost and spam to the real customer.

**Theoretical** — no PoC run; the code path (email fires regardless of the `existing`/create branch taken) was verified by reading the handler.

**Fix:** Store processed `event.id` (Stripe events are globally unique) in a small table or reuse the `Payment.stripePaymentId` uniqueness, and skip re-sending the email (and ideally skip reprocessing entirely) if this exact `event.id` was already handled. Cheap one-column dedup table with a unique constraint is enough.

### [Low] Public search page geocodes on every request with no caching — free API, but availability risk

**File:** `src/app/(public)/search/page.tsx:37-55`

Every hit to `/search?q=<anything>` (fully public, no auth, no CAPTCHA) triggers a live server-side `fetch` to Nominatim (`src/lib/geocoding.ts:26-53`) with no caching or per-IP throttle. Not a paid API, but Nominatim's usage policy caps free usage at ~1 req/sec per IP/user-agent and will block abusive callers — since all requests originate from the app's single server-side `User-Agent: PianoTuner/1.0`, one attacker script hammering `/search?q=x` can get the *entire app's* geocoding blocked, silently degrading search for every real user (falls back to un-geocoded results).

**Confirmed** — no cache, no debounce, no rate limit in the call path; matches the same missing-throttle pattern as the booking-availability finding above.

**Fix:** Cache geocode results (e.g., keyed by normalized query string, TTL a few days — city/zip geocodes don't change) and add a per-IP rate limit on `/search`. Lowest-effort fix: memoize/cache in front of `geocode()` itself so it benefits every caller (search, booking, technician signup) at once.

### Already covered (from the original audit, not duplicated here)
- No rate limiting on login (`authorize()`) and signup (`signUp`) — Medium finding above.
- Missing security headers — Medium finding above.
- Broken access control on the messages API route and excessive data exposure on the technicians API route — High findings above (both also amplify the cost-DoS surface here: unrestricted read access means the poll-flooding vector isn't even bounded to "your own" threads until that's fixed).
- Stripe webhook signature verification — confirmed present and correct; only the `event.id` replay/idempotency gap above is new.

### Checked, no new gap found
- Unbounded logging/disk growth: all logging is `console.log`/`console.error` (line-bounded messages, no request-body dumping, no local file writes via `fs.appendFile`/`fs.writeFile`/`winston`/`pino` found anywhere in `src/`) — relies on the hosting platform's log capture/retention, which is outside this app's control and not a self-inflicted growth vector.
- `createReview`: naturally throttled — one review per `COMPLETED` booking, enforced by a DB lookup + existing-review check (`src/actions/review.ts:25-35`); not a flooding vector since it requires a real completed booking first.

### Recommended shared defenses (tuned to this stack)
1. **One rate-limit primitive, reused everywhere.** Add `@upstash/ratelimit` (or an equivalent sliding-window helper backed by Redis/Upstash if available in this deploy target, else a DB-backed counter) and wire it into: `authorize()`/`signUp` (already flagged), `getAvailableSlots`, `sendMessage`, `GET /api/messages/[threadId]`, and `/search`. A single `checkRateLimit(key, limit, windowSec)` helper in `src/lib/` keeps this from drifting per-route.
2. **Stripe: verify + dedup.** Signature verification already exists; add an `event.id` unique-constraint table (or reuse `Payment.stripePaymentId`) so replays are no-ops, and make the handler idempotent end-to-end (including the email side effect), not just for the DB row.
3. **CAPTCHA/Turnstile on signup and booking creation.** Cloudflare Turnstile (free) on `signUp` and `createBooking` raises the cost of scripted account/booking spam well above simple curl loops, complementing rate limiting rather than replacing it.
4. **Spend caps on paid APIs.** `GOOGLE_MAPS_BILLING_ENABLED` is a good pattern (defaults off, falls back to free haversine on any error) — keep it, but also cache geocode results and gate `getAvailableSlots` behind auth or a rate limit so the *free* Nominatim path can't be weaponized into a service-wide outage even when Google billing is off.
5. **Generic 429 middleware.** Since Next 16 uses `proxy.ts` (not `middleware.ts`) for routing concerns, consider adding a lightweight IP-based request counter there for all `/api/*` and server-action POSTs as a blunt backstop, independent of the per-route limiters above.
