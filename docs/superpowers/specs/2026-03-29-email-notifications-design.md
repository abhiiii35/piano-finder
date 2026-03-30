# Email Notifications Design

## Problem

The app is completely silent after actions — no booking confirmations, no status change alerts, no payment receipts. Users have no way to know what's happening unless they check the dashboard.

## Solution

Add transactional email notifications triggered by existing server actions. Uses Resend as the default provider behind a swappable abstraction.

## Architecture

### Provider Abstraction

`src/lib/email.ts` exports a `sendEmail()` function:

```typescript
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void>
```

Default implementation: Resend SDK. Swap to SendGrid/Nodemailer by changing the implementation.

When `RESEND_API_KEY` is not set, logs to console instead of sending (dev mode fallback).

Email failures are logged but never throw — they must not block the main action.

### Template

`buildEmailHtml(heading: string, bodyHtml: string): string` wraps content in a minimal branded layout:
- PianoTune logo (text, not image — no hosting needed)
- Heading
- Body content (passed as HTML string)
- Footer with copyright

Inline CSS, no external dependencies.

### Email Content Functions

Separate files for each domain, returning `{ subject, html }`:

**`src/lib/emails/booking.ts`:**
- `bookingCreatedEmail(booking, technicianName, services)` — for customer
- `bookingReceivedEmail(booking, customerName, services)` — for technician
- `bookingStatusEmail(booking, newStatus, technicianName)` — for customer on status change
- `bookingCancelledEmail(booking, recipientRole)` — for both parties

**`src/lib/emails/payment.ts`:**
- `paymentReceiptEmail(booking, payment, services)` — for customer

### Emails Sent

| Trigger | Recipient | Subject |
|---------|-----------|---------|
| Booking created | Customer | "Booking Confirmed - [Service]" |
| Booking created | Technician | "New Booking - [Customer Name]" |
| Status → CONFIRMED | Customer | "Your booking has been confirmed" |
| Status → IN_PROGRESS | Customer | "Your technician is on the way" |
| Status → COMPLETED | Customer | "Service completed" |
| Status → CANCELLED | Both | "Booking cancelled" |
| Payment succeeded (card/cash) | Customer | "Payment receipt - $[Amount]" |

### Integration Points

Add `sendEmail()` calls after mutations in:
- `src/actions/booking.ts` — `createBooking` and `updateBookingStatus`
- `src/actions/payment.ts` — `markCashPayment`
- `src/app/api/webhooks/stripe/route.ts` — after payment record update

Each call is wrapped in try/catch so email failures don't affect the main operation.

## Files

| File | Change |
|------|--------|
| `src/lib/email.ts` | New — sendEmail provider abstraction, buildEmailHtml template |
| `src/lib/emails/booking.ts` | New — booking email content functions |
| `src/lib/emails/payment.ts` | New — payment email content functions |
| `src/actions/booking.ts` | Modify — send emails on create and status change |
| `src/actions/payment.ts` | Modify — send receipt on cash payment |
| `src/app/api/webhooks/stripe/route.ts` | Modify — send receipt on card payment |
| `.env.example` | Modify — add RESEND_API_KEY |
| `__tests__/lib/email.test.ts` | New — test sendEmail, template builder |
| `__tests__/actions/booking.test.ts` | Modify — verify emails sent on booking actions |

## Environment

```
RESEND_API_KEY="" # Get from resend.com. Leave empty for console logging in dev.
```

## Edge Cases

- **No API key**: log email to console, don't throw
- **Invalid recipient email**: Resend handles validation, we log the error
- **Email send fails**: catch error, log it, continue with the action
- **Booking has no customer email**: skip email (shouldn't happen with auth, but defensive)

## Testing

- Unit test `buildEmailHtml` produces valid HTML with heading/body
- Unit test email content functions return correct subject and include key data
- Unit test `sendEmail` with mocked Resend SDK
- Unit test that booking/payment actions call `sendEmail` with correct args
- Mock `sendEmail` globally in tests — never actually send
