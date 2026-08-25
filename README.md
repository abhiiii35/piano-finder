# Book A Piano Tuner

A two-sided marketplace and business platform for piano technicians and customers. Customers search for tuners, book appointments, and pay online. Technicians manage schedules, customer records, service history, finances, and automated reminders.

## Features

**Marketplace & Booking**
- Location-based search and technician discovery
- Real-time booking with instant payment via Stripe
- Technician profiles with ratings, services, and pricing
- Messaging between technicians and customers
- Reviews and ratings

**Scheduling & Travel**
- Calendar management with availability and time-off blocking
- Travel-aware scheduling and route optimization
- Smart rescheduling with optional suggested times
- Calendar filters by service type, customer, city
- Automatic mileage tracking with manual edits

**Customer Relationship Management**
- Multi-contact customer records (primary + additional people)
- Multiple service locations per customer
- Multiple pianos per customer with full history
- Global search (customers, contacts, pianos, bookings)
- Bulk import from CSV, Excel, Gazelle, vCard, Google Contacts

**Service Records & History**
- Detailed service logging with pitch offset, humidity, temperature
- Photo and PDF attachments
- Automatic entries from completed bookings
- Unified timeline with trend charts
- Private client pages (no login) with selective history visibility
- Quick-log presets for faster data entry

**Reminders & Retention**
- Automatic tune reminders (customizable frequency per piano)
- Appointment reminders (24 hours before by default)
- Editable email templates with placeholders
- Auto-send or review-first modes

**Finance & Reporting**
- Invoice generation with PDF
- Expense tracking
- Automatic and manual mileage logs
- Revenue and expense summaries

## Getting Started

### Requirements

- Node.js 20 (required for better-sqlite3 binary compatibility; default Homebrew node v24 will cause build errors)

### Installation and running

```bash
# First, set Node 20 in your PATH
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database

Local development uses SQLite (`dev.db`). Seed with test accounts:

```bash
npm run db:seed
```

Test logins:
- **Technician**: `tech@example.com` / `password123`
- **Customer**: `customer@example.com` / `password123`
- **Admin**: `admin@example.com` / `password123`

### Build and test

```bash
npm run build          # Next.js build + Prisma generation
npm run test:run       # Unit tests (Vitest)
npm run test:coverage  # Coverage report
npm run test:e2e       # End-to-end tests (Playwright, seeds test.db on port 3001)
npm run test:all       # Full gate: lint + unit + coverage + build + e2e
```

## User Guides

For end users, step-by-step instructions are in `docs/user-guide/`:

- **[Scheduling](docs/user-guide/scheduling.md)** — Calendar, availability, time off, rescheduling, route planning, mileage
- **[Customers & CRM](docs/user-guide/customers-crm.md)** — Customer records, contacts, locations, pianos
- **[Importing Clients](docs/user-guide/importing-clients.md)** — Bulk import from spreadsheets, Gazelle, phone contacts, Google
- **[Service Records](docs/user-guide/service-records.md)** — Logging visits, readings, photos, trends, client pages
- **[Reminders](docs/user-guide/reminders.md)** — Tune and appointment reminders, templates
- **[Setup Notes](docs/user-guide/setup-notes.md)** — System configuration for administrators (cron jobs, environment variables)

## Stack

- **Frontend**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (base-nova)
- **Backend**: Next.js API routes, Prisma 7 ORM
- **Database**: SQLite (local), Turso/LibSQL (production)
- **Auth**: NextAuth.js v4 (credentials + Google OAuth)
- **Payments**: Stripe
- **Email**: Resend
- **Images**: Cloudinary
- **Testing**: Vitest (unit), Playwright (e2e)

## Environment Variables

See `.env.example` for the full list. Key variables:

```
# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-string>

# Database (local)
DATABASE_URL=file:./dev.db

# Reminders (cron jobs)
CRON_SECRET=<random-string>

# External services (optional for local dev)
STRIPE_PUBLIC_KEY=...
STRIPE_SECRET_KEY=...
RESEND_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
```

For production, use Turso for the database:

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

## Repository

GitHub: [abhiiii35/piano-finder](https://github.com/abhiiii35/piano-finder)

## License

Proprietary
