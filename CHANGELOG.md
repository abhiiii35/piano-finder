# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **Date-dependent test flake (2026-07-13)**: `getNextAvailableSlot` tests now pin the clock with `vi.useFakeTimers({ toFake: ["Date"] })`; "this-week" test corrected to match calendar-week (ends Saturday) semantics, plus a new midweek boundary test. See `docs/sessions/2026-07-13-availability-flake-fix.md`.

### Added
- **Trust & transparency messaging (2026-07-13)**: Salvaged from a stale branch and adapted to current UI
  - `PitchRaiseDisclosure` component on technician profile sidebar and booking step 4 (confirm), reusing the existing `PITCH_RAISE_LOW`/`PITCH_RAISE_HIGH` cost constants and linking to `/piano-tuning-cost/pitch-raise`
  - 24-hour cancellation policy notice in booking step 4 and in the booking-confirmed email
  - "Verified booking" badge on review cards (all reviews already require a completed booking server-side)
  - Additional review-gating test for a customer attempting to review someone else's booking
- **Tune reminder email feature (2026-07-13)**: Automated piano tuning reminders for customers
  - New `TuneReminder` database model with idempotent sending to prevent double-emails
  - Email templates for 6-month and 12-month tuning reminders
  - Cron endpoint (`POST /api/cron/tune-reminders`) for scheduled reminder dispatches
  - Server actions (`src/actions/reminders.ts`) for selecting due reminders and sending emails
  - Comprehensive unit tests covering selection, send logic, idempotency, and error handling
  - CRON_SECRET environment variable for securing cron endpoint access

## Project Setup

- **Stack**: Next.js 16.2 + React 19 + Prisma 7 + Resend (email)
- **Database**: SQLite (dev), Turso (production)
