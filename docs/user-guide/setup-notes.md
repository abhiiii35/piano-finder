# Setup Notes — System Configuration for Administrators

Technical configuration required to run the full platform. This section is for whoever operates the application (slightly technical knowledge is OK here).

## Cron Jobs

The system depends on two scheduled cron jobs to send reminder emails. Both require the `CRON_SECRET` environment variable to be configured.

### 1. Tune Reminder Cron

**Endpoint**: `POST /api/cron/tune-reminders`

**Frequency**: Once per day (or hourly; the job is idempotent)

**Purpose**: Send overdue tune reminder emails to customers

**Setup**:

1. Set `CRON_SECRET` environment variable (see section below)
2. Configure your cron service (EasyCron, AWS EventBridge, GitHub Actions, cPanel, etc.) to POST to this endpoint
3. Include the header `x-cron-secret` with the value of `CRON_SECRET`

**Example (curl)**:

```bash
curl -X POST https://yourapp.com/api/cron/tune-reminders \
  -H "x-cron-secret: your_cron_secret_here"
```

**Example (EasyCron web-based)**:

1. Go to EasyCron.com
2. Create a new cron job
3. URL: `https://yourapp.com/api/cron/tune-reminders`
4. HTTP method: POST
5. Custom HTTP header: add `x-cron-secret: your_cron_secret_here`
6. Schedule: daily (any time, e.g., 8 AM)

The job will process up to 100 due reminders per run. If you have many reminders, it runs idempotently so running it more frequently (every hour) is safe.

### 2. Appointment Reminder Cron

**Endpoint**: `POST /api/cron/appointment-reminders`

**Frequency**: Every hour (MUST be hourly; a missed hour means a missed reminder)

**Purpose**: Send appointment reminder emails 24 hours before (or your configured offset) each appointment

**Setup**:

1. Set `CRON_SECRET` (same value as above)
2. Configure your cron service to POST to this endpoint every hour
3. Include header `x-cron-secret: your_cron_secret_here`

**Example**:

```bash
curl -X POST https://yourapp.com/api/cron/appointment-reminders \
  -H "x-cron-secret: your_cron_secret_here"
```

**Critical**: This job uses a 1-hour-wide sliding window. If an hour is skipped, any bookings with appointments in that hour won't get reminders. Running it more frequently (every 30 minutes) won't hurt, but hourly is the minimum.

---

## CRON_SECRET Environment Variable

Set this in your deployment environment. It's the key that secures your cron endpoints.

### Local Development

In `.env` (or `.env.local`):

```
CRON_SECRET=dev_secret_for_local_testing_only
```

### Production

Use your platform's environment variable management:

- **Vercel**: Settings → Environment variables → add `CRON_SECRET`
- **Railway**: Variables → add `CRON_SECRET`
- **Docker/Heroku**: Config vars or secrets
- **Self-hosted**: `.env` or OS environment

Generate a strong value (32+ random characters):

```bash
# macOS/Linux
openssl rand -hex 32

# Online generator
# https://www.random.org/strings/
```

Example production value:

```
CRON_SECRET=a7f2k9x4c8q1l6b3m9n7z2y8w5t1r0e4
```

---

## Google Contacts Import Setup

To allow users to import contacts from Google Contacts, you need a Google Cloud project with the People API enabled.

### Create and configure the Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **People API**:
   - Go to APIs & Services → Library
   - Search for "People API"
   - Click it, then click **Enable**
4. Create an OAuth consent screen:
   - Go to APIs & Services → OAuth consent screen
   - Choose **External** as user type
   - Fill in required fields:
     - App name: "Book A Piano Tuner" (or your branding)
     - User support email: your email
     - Developer contact: your email
5. Add scopes for People API:
   - Click **Add or remove scopes**
   - Search for `https://www.googleapis.com/auth/contacts.readonly`
   - Select it and save
   - This is the minimum scope needed (read-only)
6. Add test users (if in Testing mode):
   - Add your email and any other testers
   - Users not listed cannot sign in

### Create OAuth credentials

1. Go to APIs & Services → Credentials
2. Click **Create Credentials** → OAuth client ID
3. Choose **Web application**
4. Add authorized redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourapp.com/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**

### Set environment variables

In your `.env` (local) or deployment platform:

```
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_URL=http://localhost:3000  # local
# Production: NEXTAUTH_URL=https://yourapp.com
```

### Testing mode vs. production

- **Testing mode** (during development):
  - OAuth consent screen is in "Testing" mode
  - Only users you add as test users can sign in
  - No Google verification needed
  - Refresh tokens last 7 days

- **Production mode** (publish to users):
  - OAuth consent screen must be published
  - Requires Google verification (may take days or weeks)
  - All users can sign in
  - Refresh tokens last longer

For local development and staging, keep it in Testing mode and add your testers. When you're ready for real users, publish it.

---

## Customer Data Backfill Script

If you have legacy customer records in the old format (single-piano fields per customer) and want to migrate to the new multi-piano system, run the backfill script.

### When to run it

- After upgrading to a version with multi-piano support
- If you have existing customers with pianos stored in the old schema
- One time only (it's idempotent, so it's safe to run multiple times, but unnecessary)

### Run the script

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"  # Important on this machine
npm run backfill:pianos
```

This script:

1. Finds all CustomerRecords with legacy piano fields (make, model, serialNumber, etc.)
2. Creates a Piano record for each one
3. Links the piano to the customer's primary (or first) service location
4. Marks the legacy fields as migrated (clears them so they're not duplicated)

The script is safe to run multiple times; it won't create duplicates.

---

## Deferred Features and Open Decisions

### Stripe Connect and Platform Commission

**Status**: Not yet implemented

The marketplace needs a way for the platform to collect commission on transactions and for technicians to receive payouts. This requires:

1. Stripe Connect integration (technician onboarding, account linking)
2. Commission rate configuration (percentage or fixed fee)
3. Automated payout scheduling (daily, weekly, on-demand)

**Current state**: Payments work but all money goes directly to the technician's Stripe account. There's no commission collection or platform revenue.

**To implement**: Add Stripe Connect, define commission model, set up payout webhooks.

### SMS Reminders

**Status**: Not yet implemented

Customers who prefer text message reminders instead of email need SMS support.

**Current state**: Reminders are email-only.

**To implement**: 
1. Add Twilio integration
2. Register for A2P 10DLC (Application-to-Person, 10-digit long code) — required by Twilio for SMS
3. Add SMS toggle to reminder settings
4. Update reminder templates to support SMS (shorter format)

---

## Third-Party Services

The app integrates with several external services. All are optional for local development (use empty keys).

| Service | Purpose | Env vars |
|---|---|---|
| **Stripe** | Payment processing | `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY` |
| **Resend** | Email sending | `RESEND_API_KEY` |
| **Cloudinary** | Image hosting | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` |
| **Google Maps** | Location search, geocoding | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| **Google OAuth** | Sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (see section above) |

For local development, leave these empty or use test/sandbox keys. The app boots fine without them and degrades gracefully (search, payment, images, etc. may not work, but the core app does).

For production, configure real keys with your account manager or service provider.

---

## Database

### Local Development

SQLite database file at `./dev.db`. Prisma uses the `@prisma/adapter-better-sqlite3` adapter locally.

To reset the database:

```bash
rm dev.db
npm run db:seed
```

### Production

Turso (LibSQL) database. Configuration in `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` environment variables.

If both are set, production mode is used. If either is empty, local SQLite is used instead. This allows testing production-like code locally without a Turso account.

See `src/lib/prisma.ts` for the adapter selection logic.

---

## Common Troubleshooting

### Build fails with "ERR_DLOPEN_FAILED" or "better-sqlite3" error

**Cause**: Node version mismatch. The better-sqlite3 binary in node_modules was built for Node 20, but the default Homebrew node is v24.

**Fix**:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm run build
```

Always set the PATH before running any npm command.

### Cron jobs return 401 "Unauthorized"

**Cause**: The `x-cron-secret` header is missing or doesn't match `CRON_SECRET`.

**Check**:

1. Is `CRON_SECRET` set in your environment?
2. Does the cron service include the header?
3. Does the header value match `CRON_SECRET` exactly?

**Test locally**:

```bash
curl -X POST http://localhost:3000/api/cron/tune-reminders \
  -H "x-cron-secret: YOUR_SECRET_HERE"
```

### Emails not sending

**Cause**: Resend API key not set or invalid.

**Check**:

1. Is `RESEND_API_KEY` set?
2. Is it a valid production key (not a sandbox/test key)?
3. Check server logs for Resend API errors.

### Google Contacts import fails

**Cause**: Google OAuth not configured or user not a test user.

**Check**:

1. Are `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set?
2. Is the OAuth consent screen in Testing mode?
3. Is the user added as a test user?
4. Has the user authorized the app to access contacts?

---

## Related Documentation

- **Reminders guide**: `docs/user-guide/reminders.md` (user-facing)
- **CLAUDE.md**: Project commands and conventions
- **env.example**: Template environment variables
