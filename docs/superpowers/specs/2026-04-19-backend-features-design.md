# Backend Features 1-4 Design

## Summary

Four independent backend improvements: CRM auto-populate from completed bookings, email verification with booking-only gate, invoice PDF generation with email, and Stripe fallback UI when keys aren't configured.

## 1. CRM Auto-populate from Bookings

### Trigger
Inside `updateBookingStatus()` in `src/actions/booking.ts`, after a booking transitions to COMPLETED.

### Logic
Upsert `CustomerRecord` where `technicianId` + `customerEmail` match:
- `customerName` from `booking.customer.name`
- `customerEmail` from `booking.customer.email`
- `customerPhone` from `booking.customer.phone`
- `pianoMake` from `booking.pianoMake`
- `pianoModel` from `booking.pianoModel`
- `pianoLocation` from `booking.addressLine1`

If a record exists for this technician + customer email, update piano details. If not, create a new record.

### Error handling
Log and continue — CRM population should not block the status update.

### Schema changes
None — `CustomerRecord` already has all required fields.

## 2. Email Verification

### Gate type
Booking-only — users can browse, explore, and access dashboards without verification. Only `createBooking()` checks `emailVerified`.

### Signup flow change
File: `src/actions/auth.ts`

After creating the user in `signUp()`:
1. Generate a random token (crypto.randomUUID())
2. Store in `VerificationToken` with 24-hour expiry
3. Send verification email with link: `/verify-email?token=TOKEN&email=EMAIL`

### Verification page
New file: `src/app/(auth)/verify-email/page.tsx`

Server component reading `token` and `email` from searchParams:
- Look up `VerificationToken` matching token + identifier (email)
- If valid and not expired: set `user.emailVerified = new Date()`, delete token, show success with sign-in link
- If invalid/expired: show error with "Resend verification" button

### Booking gate
File: `src/actions/booking.ts`

In `createBooking()`, check `session.user.emailVerified`. If null, return `{ error: "Please verify your email before booking" }`.

### Verification email template
New file: `src/lib/emails/verification.ts`

"Verify your email address" with a button linking to the verification URL. Uses existing `buildEmailHtml()` pattern.

### Resend verification
New server action in `src/actions/auth.ts`:

`resendVerification(email)` — generates new token, deletes old ones for that email, sends fresh email. Rate-limited: reject if a token was created in the last 60 seconds.

### Session update
File: `src/lib/auth.ts`

Add `emailVerified` to the JWT callback and session callback alongside `id` and `role`, so it's available as `session.user.emailVerified`.

### Type augmentation
File: `src/types/next-auth.d.ts`

Add `emailVerified: Date | null` to the session user type.

## 3. Invoice PDF Generation

### PDF library
`@react-pdf/renderer` — server-side React-to-PDF rendering. Works on Vercel serverless.

### API route
New file: `src/app/api/invoices/[bookingId]/pdf/route.ts`

GET handler:
- Authenticate request (must be technician or customer of the booking)
- Fetch booking with technician, customer, services, payment data
- Render PDF using `renderToBuffer()` from `@react-pdf/renderer`
- Return with `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="invoice-XXXX.pdf"`

### PDF component
New file: `src/components/invoice/invoice-pdf.tsx`

React PDF component using `Document`, `Page`, `View`, `Text`, `StyleSheet` from `@react-pdf/renderer`. Layout mirrors the existing HTML invoice: header, technician info, customer bill-to, service line items, total, payment status. Styled with navy/gold brand colors.

### UI integration
Modify: `src/app/(dashboard)/dashboard/technician/bookings/[id]/invoice/page.tsx`

Add two buttons next to "Print Invoice":
- "Download PDF" — links to `/api/invoices/[bookingId]/pdf`
- "Email Invoice" — calls `emailInvoice()` server action

### Email invoice action
New file: `src/actions/invoice.ts`

`emailInvoice(bookingId)`:
- Authenticate (technician only)
- Generate PDF buffer
- Send email to customer with PDF attachment

### Invoice email template
New file: `src/lib/emails/invoice.ts`

"Your invoice from [Technician Name]" — simple email with the PDF attached.

## 4. Stripe Fallback UI

### Client-side check
Use `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — if empty string or undefined, Stripe is not configured.

### Booking page (Step 4)
Modify: `src/app/(public)/technicians/[id]/book/page.tsx`

If Stripe not configured:
- Change "Confirm Booking" button to "Book & Pay Later"
- Booking is still created but no Stripe checkout redirect
- Show note below button: "Online payments coming soon. Your technician will arrange payment directly."

If Stripe configured: current flow unchanged.

### Booking detail page
Modify: `src/app/(dashboard)/dashboard/customer/bookings/[id]/page.tsx`

If booking has no payment and Stripe not configured:
- Show "Payment will be arranged with your technician" instead of "Pay Now" button

### No server-side changes
`createCheckoutSession()` is never called when Stripe button is hidden. `markCashPayment()` works regardless.

## Parallel Workstreams

All 4 features are independent — no shared files except minor touches:
- Feature 1 and Feature 2 both modify `src/actions/booking.ts` but different functions (`updateBookingStatus` vs `createBooking`). No conflict.
- Feature 2 modifies `src/lib/auth.ts` and `src/actions/auth.ts` — no overlap with others.
- Feature 3 creates entirely new files.
- Feature 4 modifies booking page and customer booking detail — no overlap with 1-3.

**4 agents, parallel execution.**

## Testing
- Feature 1: Test that completing a booking upserts a CustomerRecord. Test upsert (update existing vs create new).
- Feature 2: Test signUp sends verification email. Test verification page accepts valid token, rejects expired. Test createBooking rejects unverified users.
- Feature 3: Test PDF API route returns valid PDF. Test auth gate (only technician/customer of booking).
- Feature 4: Test booking page renders "Book & Pay Later" when env var is empty.
- Run `npm run test:run` — all tests pass
- Run `npm run build` — build succeeds
