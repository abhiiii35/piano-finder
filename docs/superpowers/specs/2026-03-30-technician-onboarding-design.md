# Guided Technician Onboarding & Verification

## Overview

Multi-step onboarding flow for new technicians with admin verification. Technicians complete a wizard after signup, then finish optional steps from the dashboard before submitting for admin review. Profiles are hidden from search until approved.

## Verification Model

Hybrid approach:
- **Profile completeness** unlocks the ability to submit for review
- **Admin approval** unlocks search visibility (`isActive = true`) and the "Verified" badge (`isVerified = true`)
- Technicians are hidden from search until approved — no incomplete profiles in results

## User Flow

### 1. Signup → Fullscreen Wizard

After completing the existing `/sign-up/technician` form, the technician is redirected to `/onboarding` instead of the dashboard. The wizard has two steps:

1. **Profile details** — bio, business name, years of experience (fields not collected during signup)
2. **Services & pricing review** — shows auto-created services from signup, allows edit/add/remove

The wizard is fullscreen with a progress indicator (no sidebar/nav). Completing it sets `onboardingStatus = CHECKLIST_PENDING` and redirects to the dashboard.

### 2. Dashboard Checklist Banner

The dashboard shows a compact progress bar with horizontal checklist at the top. Remaining steps:

3. **Set availability** (encouraged, not required) — links to existing `/dashboard/technician/availability`
4. **Submit for review** — summary page at `/onboarding/submit`, technician confirms and submits

Banner style: amber progress bar, completed steps in green with checkmarks, pending steps as clickable links. Shows "X of 4 steps done."

### 3. Admin Review

After submission (`onboardingStatus = SUBMITTED`):
- Admin sees pending submissions at `/dashboard/admin/submissions`
- Each submission shows the technician's full profile with approve/reject buttons
- Reject includes a textarea for the reason

**Approve:** `isVerified = true`, `isActive = true`, `onboardingStatus = APPROVED`. Technician receives approval email ("Your profile is live!").

**Reject:** `onboardingStatus = REJECTED`. Technician receives rejection email with admin's reason ("Your profile needs changes — [reason]"). Technician can edit and resubmit.

## Data Model Changes

### New enum: OnboardingStatus

```
WIZARD_PENDING   — just signed up, hasn't completed wizard
CHECKLIST_PENDING — wizard done, on dashboard with banner
SUBMITTED        — submitted for review, waiting on admin
APPROVED         — admin approved, visible in search
REJECTED         — admin rejected, can edit and resubmit
```

### TechnicianProfile changes

- Add `onboardingStatus` field (OnboardingStatus, default `WIZARD_PENDING`)
- Signup now sets `isActive = false` (was `true`)

### Role enum changes

- Add `ADMIN` role to existing Role enum
- Seed one admin user in dev database

### State transitions

| Action | onboardingStatus | isActive | isVerified |
|--------|-----------------|----------|------------|
| Signup | WIZARD_PENDING | false | false |
| Complete wizard | CHECKLIST_PENDING | false | false |
| Submit for review | SUBMITTED | false | false |
| Admin approves | APPROVED | true | true |
| Admin rejects | REJECTED | false | false |
| Resubmit after rejection | SUBMITTED | false | false |

### Migration for existing technicians

Existing technicians get `onboardingStatus = APPROVED`. Their `isActive` value is preserved as-is. No disruption.

## New Pages

| Route | Purpose | Layout |
|-------|---------|--------|
| `/onboarding` | Fullscreen wizard (profile + services) | Centered, no sidebar |
| `/onboarding/submit` | Summary + submit for review | Centered, no sidebar |
| `/dashboard/admin/submissions` | Pending technician submissions | Dashboard sidebar |

## New Components

- **OnboardingWizard** — multi-step form with progress indicator (step 1: profile, step 2: services)
- **OnboardingBanner** — progress bar + horizontal checklist for dashboard top
- **SubmissionCard** — admin view of technician profile with approve/reject + reason textarea

## Modified Files

- `src/actions/technician-signup.ts` — set `isActive = false`, `onboardingStatus = WIZARD_PENDING`, redirect to `/onboarding`
- `src/app/(dashboard)/dashboard/technician/page.tsx` — render OnboardingBanner when `CHECKLIST_PENDING` or `REJECTED`
- Dashboard layout — redirect to `/onboarding` if `WIZARD_PENDING`
- `prisma/schema.prisma` — add OnboardingStatus enum, ADMIN role, onboardingStatus field

## New Server Actions

- `completeOnboardingWizard()` — saves profile details + services, sets status to `CHECKLIST_PENDING`
- `submitForReview()` — sets status to `SUBMITTED`
- `approveSubmission(technicianId)` — approve flow + email
- `rejectSubmission(technicianId, reason)` — reject flow + email

## Emails

Using existing email infrastructure (Resend):
- **Approval email** — "Your profile is live!" with link to their public profile
- **Rejection email** — "Your profile needs changes" with admin's reason and link to edit

## Route Protection

- `WIZARD_PENDING` technician → `/dashboard/technician` redirects to `/onboarding`
- `SUBMITTED` technician → banner shows "Profile under review" (no actions needed)
- `REJECTED` technician → banner shows "Changes requested — [reason]" with edit/resubmit links
- `/dashboard/admin/*` → requires `ADMIN` role

## Search

No query changes needed. The existing `isActive: true` filter already gates everything. Technicians only become `isActive = true` after admin approval.

## Future Features (out of scope)

These were considered but deferred as standalone features:
- **Identity verification** — government ID upload + admin review. Adds trust but requires PII storage/compliance.
- **PTG certificate upload** — photo/PDF of Piano Technicians Guild membership for admin verification. Lightweight but can wait.
- **Stripe Connect setup** — OAuth onboarding flow for in-app payments. `stripeAccountId` field exists but needs full Stripe Connect integration (OAuth, webhooks, account status tracking).
