# 2026-08-12 — Admin user portal

Branch: `feature/admin-user-portal` (off `security/audit-2026-07-15` @ `a021f46`)

## What was done

Nine-task plan (`docs/superpowers/plans/2026-08-12-admin-user-portal.md`), executed and reviewed task by task:

1. **Schema** — `User.suspendedAt` and `PasswordResetToken` model.
2. **Suspension enforcement, two chokepoints** — sign-in (`authorize`) rejects suspended users; active sessions get suspension re-checked and kicked (session JWT re-check).
3. **Search filtering** — suspended technicians hidden from public search and profile pages.
4. **Password-reset actions** — hashed, single-use, 1-hour tokens; neutral response regardless of whether the email exists.
5. **Public reset pages** — `/forgot-password` and `/reset-password/[token]`.
6. **Admin actions** — list/detail/suspend/reactivate/resend-verification/send-reset server actions, wrapped for admin-only access.
7. **Admin users list page** — `/dashboard/admin/users`, search + role/status filters.
8. **Admin user detail page** — profile, services, availability, recent bookings, reviews, verification status, suspend/reactivate and other account actions.
9. **This task** — Playwright e2e coverage for the public reset flow, docs, full gate.

### Commits (`git log --oneline a021f46..HEAD`)

```
e852601 feat: admin user detail page with suspend and account actions
e97d7e0 feat: admin users list page with search and filters
57993ad test: cover hashedPassword strip and admin wrapper actions
6a4d6b8 feat: admin user actions — list, detail, suspend, verification, password reset
270a136 fix: remove dead duplicate forgot-password button on sign-in
61d1d89 feat: public forgot-password and reset-password pages
0166618 feat: password reset actions with hashed single-use tokens
d3834d4 feat: hide suspended technicians from search and profile pages
0001713 fix: wrap sign-in page in Suspense for useSearchParams prerender
76dfe2e feat: block suspended users at sign-in and in active sessions
ccb132c feat: add User.suspendedAt and PasswordResetToken model
```

Plus this task's commit (e2e spec + docs, see below).

## Key decisions

- **Suspension = hide + block, never delete.** Suspended accounts vanish from search/profile and cannot sign in, but rows and history stay intact — reversible by design, and nothing downstream (bookings, reviews) needs to handle a missing user.
- **Two enforcement chokepoints for suspension**, not one: `authorize()` blocks it at sign-in, and the session JWT is re-checked (15-minute window) so an already-signed-in user gets kicked out shortly after an admin suspends them, without a full session-store lookup on every request.
- **Password reset tokens are hashed at rest, single-use, 1-hour expiry.** The raw token is only ever visible in the (dev) email/console output — the DB never holds anything an attacker with read access could replay.
- **Neutral response against account enumeration.** `/forgot-password` returns the identical "if an account exists…" message whether or not the email matches a user, and takes the same code path either way (verified in Task 4 unit tests and this task's e2e).

## Problems hit (fix rounds, from `progress.md`)

- **Task 2 build failure**: `/sign-in` used `useSearchParams()` outside a `Suspense` boundary, which Next.js's static prerender needs — the build failed. Fixed by wrapping the sign-in form in `<Suspense>` (commit `0001713`).
- **Task 5 dead duplicate button**: the forgot-password page shipped with a leftover duplicate "forgot password" button on the sign-in page that did nothing — found in review, removed (commit `270a136`).
- **Task 6 missing security-behavior tests**: initial admin-actions pass was missing coverage for stripping `hashedPassword` out of API/query results and for the admin-only wrapper actions (the access-control layer around suspend/reactivate/etc.) — both gaps were coverage-only, not behavior bugs, but were required before Task 6 could be marked complete. Added in commit `57993ad`.

No other fix rounds were needed across Tasks 1, 3, 4, 7, 8 — each passed task-level review clean on the first pass (see `progress.md` for the minor, deliberately-deferred nitpicks logged against each, none of which blocked completion).

## This task (Task 9)

- Added `e2e/password-reset.spec.ts` — 3 tests covering the neutral forgot-password response (known + unknown email), the expired/invalid-token message on `/reset-password/[token]`, and the sign-in → forgot-password link. The brief's spec selectors matched the shipped page markup exactly (`getByPlaceholder`, button/link names) — no spec or page changes needed. Full token round-trip is covered by Task 4's unit tests, not e2e, since the raw reset token only ever appears in the dev console/email and is hashed in the DB.
- CHANGELOG.md: new `## 2026-08-12 — Admin user portal` section above the existing 2026-08-12 entry.
- README.md: not touched — run instructions are unchanged by this feature.
- Full gate (`npm run test:all`): lint --quiet, unit suite, coverage, build, and e2e all green — see `task-9-report.md` for exact output/coverage numbers.

## Open items (deliberately out of scope, per spec)

- Pagination on the admin users list beyond the 200-user cap.
- Admin audit log (who suspended/reset what, when).
- Admin impersonation ("sign in as user" for support).
- Final whole-branch review deferred follow-ups: session revocation on password reset (tokenVersion via the 15-min JWT recheck), admin audit log, pagination past the 200-user cap, branch-coverage lift, admin reset-toast rate-limit honesty, PENDING+role filter combo, forgot-password try/finally.
