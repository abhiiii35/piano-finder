# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
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
