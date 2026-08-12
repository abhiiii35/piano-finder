# Admin User Portal — Design Spec

**Date:** 2026-08-12
**Status:** Approved by user (conversation 2026-08-12)
**Goal:** Let the admin inspect any tuner or customer account in one place to troubleshoot, with a small set of operational actions (suspend/reactivate, resend verification, send password reset). Also closes the missing forgot-password product gap for all users.

## Context

The admin foundation already exists: `User.role = "ADMIN"`, seeded `admin@example.com`, `proxy.ts` gates `/dashboard/admin/*`, `requireAdmin()` in `src/actions/admin.ts`, admin links in `sidebar-nav.tsx`. This feature extends that area; it is not a new portal or app.

**Decisions made during brainstorming:**
- Read-only inspection + account actions. No impersonation, no data editing (out of scope, can bolt on later).
- Suspension = hidden from search **and** blocked from sign-in.
- Full public forgot-password flow (not admin-only trigger) — every user benefits; the admin button reuses the same send function.
- Scope covers **both tuners and customers** in one user browser.

## 1. Routes & navigation

| Route | Access | Purpose |
|---|---|---|
| `/dashboard/admin/users` | ADMIN (existing proxy gate) | User list: search by name/email; filter by role (All / Tuners / Customers) and status (Active / Suspended / Pending onboarding — tuners whose `onboardingStatus` is not `APPROVED`). Row: name, email, role, status badge, joined date → detail link. |
| `/dashboard/admin/users/[id]` | ADMIN | Troubleshooting detail view (below). |
| `/forgot-password` | Public | Email entry. Always responds "if that account exists, we sent a link" — no account enumeration. |
| `/reset-password/[token]` | Public | New password form. Expired/used token shows "this link has expired — request a new one", not a 404. |

Navigation: add "Users" to `adminLinks` in `src/components/dashboard/sidebar-nav.tsx`; add "Forgot password?" link on the sign-in page.

**Detail page layout:** common header (name, email, role, verification + suspension status, action buttons), then role-specific read-only sections:
- **Tuner:** profile fields, onboarding status, services + prices, availability slots by weekday, recent bookings, reviews received, blog posts. Items link to their public/technician pages where those exist.
- **Customer:** recent bookings with status/payment, reviews written.

## 2. Data model (one migration)

- `User.suspendedAt DateTime?` — null = active. Timestamp (not boolean) so the admin can see when someone was suspended.
- New `PasswordResetToken` model mirroring the existing `VerificationToken` pattern: `identifier` (email), `token` (stored hashed), `expires` (1 hour), `@@unique([identifier, token])`. Single-use — deleted on redemption.

No other schema changes; everything the detail page shows already exists in current models.

## 3. Suspension enforcement chokepoints

Exactly two places, both server-side:

1. **Sign-in** (`src/lib/auth.ts`):
   - Credentials `authorize()` returns null for suspended users; UI shows plain-language "This account has been suspended. Contact support."
   - `signIn` callback blocks the Google OAuth path identically.
   - JWT callback re-checks `suspendedAt` on token refresh, so an already-logged-in user is ejected at the next session refresh, not just next login.
2. **Search** (`src/lib/queries/technicians.ts`):
   - `searchTechnicians` adds `user: { suspendedAt: null }` to the Prisma `where`.
   - `getTechnicianById` returns null for suspended tuners (direct-link protection).

Nothing is deleted: existing bookings, messages, and reviews stay intact in the DB.

## 4. Server actions

**Admin actions** in `src/actions/admin.ts`, following its existing `requireAdmin()` pattern:
- `getUsers(filters)` — list with search/role/status filters.
- `getUserDetail(id)` — everything the detail page renders.
- `suspendUser(id)` / `reactivateUser(id)` — sets/clears `suspendedAt`; revalidates search and profile paths.
- `adminResendVerification(id)` — wraps existing `resendVerification` in `src/actions/auth.ts`.
- `adminSendPasswordReset(id)` — calls the same send function as the public flow.

**Guard rails:** an admin cannot suspend their own account or another ADMIN.

**Public actions** in `src/actions/auth.ts`:
- `requestPasswordReset(email)` — silent success regardless of whether the account exists; creates hashed token, emails link via existing Resend setup (`src/lib/emails/`). With no `RESEND_API_KEY` locally, `src/lib/email.ts` already logs the email to the dev console, so the flow is testable locally.
- `resetPassword(token, newPassword)` — validates token + expiry, bcrypt-hashes the new password, deletes the token.

## 5. Error handling & UX

Plain language throughout (project rule: non-technical users, no jargon or raw errors):
- Suspend has a confirmation dialog: "This tuner will disappear from search and won't be able to log in."
- Success/failure toasts on all actions.
- Suspended sign-in attempt: friendly message, never a raw error.
- Expired/used reset token: "this link has expired — request a new one" page.

## 6. Testing (boundary tests per project DoD)

Unit (mocked Prisma, existing setup):
- Suspended tuner absent from `searchTechnicians`; `getTechnicianById` returns null; `authorize()` rejects; reactivation restores all three.
- Admin cannot suspend self or another ADMIN.
- Reset token: expired rejected; single-use (second redemption fails); unknown email returns silent success.

E2E (Playwright, existing setup): one flow — forgot-password → token from console/email → reset → sign-in with new password.

## Out of scope (deliberate)

Impersonation/view-as, editing tuner data, audit log, admin role management, customer-specific suspension UI beyond the same button (it works identically for both roles). All can be added later without rework.

## External dependencies

None new. Resend (already integrated, lazy-init) sends the reset/verification emails; dev mode logs to console.
