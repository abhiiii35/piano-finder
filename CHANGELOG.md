# Changelog

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
