# Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send transactional emails for booking confirmations, status changes, and payment receipts.

**Architecture:** Resend SDK behind a swappable `sendEmail()` abstraction. HTML template builder for branded emails. Email content functions per domain. Integrated into existing server actions with try/catch (never blocks main action).

**Tech Stack:** Resend SDK, Next.js 16 server actions, Vitest

---

### Task 1: Email provider abstraction and template builder

**Files:**
- Create: `src/lib/email.ts`
- Create: `__tests__/lib/email.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/email.test.ts
import { describe, it, expect, vi } from "vitest";
import { buildEmailHtml, sendEmail } from "@/lib/email";

describe("buildEmailHtml", () => {
  it("includes heading and body content", () => {
    const html = buildEmailHtml("Test Heading", "<p>Test body</p>");
    expect(html).toContain("Test Heading");
    expect(html).toContain("<p>Test body</p>");
  });

  it("includes PianoTune branding", () => {
    const html = buildEmailHtml("Hi", "<p>Content</p>");
    expect(html).toContain("PianoTune");
  });

  it("includes footer", () => {
    const html = buildEmailHtml("Hi", "<p>Content</p>");
    expect(html).toContain("All rights reserved");
  });
});

describe("sendEmail", () => {
  it("logs to console when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("[EMAIL]"),
      expect.objectContaining({ to: "test@example.com", subject: "Test" })
    );
    spy.mockRestore();
  });

  it("does not throw on failure", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    // Mock the Resend class to throw
    vi.doMock("resend", () => ({
      Resend: vi.fn().mockImplementation(() => ({
        emails: {
          send: vi.fn().mockRejectedValue(new Error("API error")),
        },
      })),
    }));

    // Should not throw
    await expect(
      sendEmail({ to: "test@example.com", subject: "Test", html: "<p>Hi</p>" })
    ).resolves.toBeUndefined();

    delete process.env.RESEND_API_KEY;
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx vitest run __tests__/lib/email.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Install Resend SDK**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npm install resend`

- [ ] **Step 4: Implement email module**

```typescript
// src/lib/email.ts

import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const client = getResend();

  if (!client) {
    console.log("[EMAIL] Dev mode — no RESEND_API_KEY set.", {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  try {
    await client.emails.send({
      from: "PianoTune <notifications@pianotune.com>",
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (error) {
    console.error("[EMAIL] Failed to send:", error);
  }
}

export function buildEmailHtml(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:20px;font-weight:700;color:#1e293b;">🎹 PianoTune</span>
      </div>
      <h1 style="font-size:20px;font-weight:600;color:#1e293b;margin:0 0 16px;">${heading}</h1>
      <div style="font-size:14px;line-height:1.6;color:#475569;">
        ${bodyHtml}
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;font-size:12px;color:#94a3b8;">
      &copy; ${new Date().getFullYear()} PianoTune. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}
```

- [ ] **Step 5: Run tests**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx vitest run __tests__/lib/email.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Update .env.example**

Add to `.env.example`:
```
# Email (Resend)
RESEND_API_KEY="" # Get from resend.com. Leave empty for console logging in dev.
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/email.ts __tests__/lib/email.test.ts .env.example package.json package-lock.json
git commit -m "feat: add email provider abstraction with Resend and HTML template

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Booking email content functions

**Files:**
- Create: `src/lib/emails/booking.ts`
- Create: `__tests__/lib/emails/booking.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/emails/booking.test.ts
import { describe, it, expect } from "vitest";
import {
  bookingCreatedEmail,
  bookingReceivedEmail,
  bookingStatusEmail,
  bookingCancelledEmail,
} from "@/lib/emails/booking";

const sampleBooking = {
  id: "booking-1",
  scheduledAt: new Date("2026-04-15T10:00:00"),
  addressLine1: "123 Main St",
  city: "Boston",
  state: "MA",
  totalCents: 17500,
};

const sampleServices = ["Standard Tuning"];

describe("bookingCreatedEmail", () => {
  it("includes service name in subject", () => {
    const { subject } = bookingCreatedEmail(sampleBooking, "Mike Tuner", sampleServices);
    expect(subject).toContain("Standard Tuning");
  });

  it("includes booking details in HTML", () => {
    const { html } = bookingCreatedEmail(sampleBooking, "Mike Tuner", sampleServices);
    expect(html).toContain("Mike Tuner");
    expect(html).toContain("123 Main St");
    expect(html).toContain("$175.00");
  });
});

describe("bookingReceivedEmail", () => {
  it("includes customer name in subject", () => {
    const { subject } = bookingReceivedEmail(sampleBooking, "Jane Doe", sampleServices);
    expect(subject).toContain("Jane Doe");
  });

  it("includes booking details in HTML", () => {
    const { html } = bookingReceivedEmail(sampleBooking, "Jane Doe", sampleServices);
    expect(html).toContain("Jane Doe");
    expect(html).toContain("123 Main St");
  });
});

describe("bookingStatusEmail", () => {
  it("returns correct subject for CONFIRMED", () => {
    const { subject } = bookingStatusEmail(sampleBooking, "CONFIRMED", "Mike Tuner");
    expect(subject).toContain("confirmed");
  });

  it("returns correct subject for COMPLETED", () => {
    const { subject } = bookingStatusEmail(sampleBooking, "COMPLETED", "Mike Tuner");
    expect(subject).toContain("completed");
  });

  it("includes technician name in HTML", () => {
    const { html } = bookingStatusEmail(sampleBooking, "CONFIRMED", "Mike Tuner");
    expect(html).toContain("Mike Tuner");
  });
});

describe("bookingCancelledEmail", () => {
  it("includes cancelled in subject", () => {
    const { subject } = bookingCancelledEmail(sampleBooking);
    expect(subject).toContain("cancelled");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx vitest run __tests__/lib/emails/booking.test.ts`

- [ ] **Step 3: Implement booking email functions**

```typescript
// src/lib/emails/booking.ts
import { buildEmailHtml } from "@/lib/email";
import { formatCents } from "@/lib/utils";
import { format } from "date-fns";

type BookingInfo = {
  id: string;
  scheduledAt: Date;
  addressLine1: string;
  city: string;
  state: string;
  totalCents: number;
};

export function bookingCreatedEmail(
  booking: BookingInfo,
  technicianName: string,
  services: string[]
): { subject: string; html: string } {
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a");
  return {
    subject: `Booking Confirmed - ${services.join(", ")}`,
    html: buildEmailHtml(
      "Booking Confirmed",
      `<p>Your booking has been created!</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#64748b;">Technician</td><td style="padding:8px 0;font-weight:600;">${technicianName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Services</td><td style="padding:8px 0;">${services.join(", ")}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Location</td><td style="padding:8px 0;">${booking.addressLine1}, ${booking.city}, ${booking.state}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Total</td><td style="padding:8px 0;font-weight:600;">${formatCents(booking.totalCents)}</td></tr>
      </table>`
    ),
  };
}

export function bookingReceivedEmail(
  booking: BookingInfo,
  customerName: string,
  services: string[]
): { subject: string; html: string } {
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a");
  return {
    subject: `New Booking - ${customerName}`,
    html: buildEmailHtml(
      "New Booking Received",
      `<p>You have a new booking from <strong>${customerName}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#64748b;">Customer</td><td style="padding:8px 0;font-weight:600;">${customerName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Services</td><td style="padding:8px 0;">${services.join(", ")}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Location</td><td style="padding:8px 0;">${booking.addressLine1}, ${booking.city}, ${booking.state}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Total</td><td style="padding:8px 0;font-weight:600;">${formatCents(booking.totalCents)}</td></tr>
      </table>
      <p>Log in to your dashboard to confirm or manage this booking.</p>`
    ),
  };
}

const STATUS_SUBJECTS: Record<string, string> = {
  CONFIRMED: "Your booking has been confirmed",
  IN_PROGRESS: "Your technician is on the way",
  COMPLETED: "Service completed",
};

export function bookingStatusEmail(
  booking: BookingInfo,
  newStatus: string,
  technicianName: string
): { subject: string; html: string } {
  const subject = STATUS_SUBJECTS[newStatus] ?? `Booking status: ${newStatus}`;
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a");
  return {
    subject,
    html: buildEmailHtml(
      subject,
      `<p>Your booking with <strong>${technicianName}</strong> on ${dateStr} has been updated.</p>
      <p style="font-size:16px;font-weight:600;color:#1e293b;">Status: ${newStatus}</p>`
    ),
  };
}

export function bookingCancelledEmail(
  booking: BookingInfo
): { subject: string; html: string } {
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a");
  return {
    subject: "Booking cancelled",
    html: buildEmailHtml(
      "Booking Cancelled",
      `<p>The booking scheduled for ${dateStr} has been cancelled.</p>
      <p>If you have questions, please contact us through the platform.</p>`
    ),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx vitest run __tests__/lib/emails/booking.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/emails/booking.ts __tests__/lib/emails/booking.test.ts
git commit -m "feat: add booking email content functions

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Payment email content functions

**Files:**
- Create: `src/lib/emails/payment.ts`
- Create: `__tests__/lib/emails/payment.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/emails/payment.test.ts
import { describe, it, expect } from "vitest";
import { paymentReceiptEmail } from "@/lib/emails/payment";

describe("paymentReceiptEmail", () => {
  it("includes amount in subject", () => {
    const { subject } = paymentReceiptEmail(
      { scheduledAt: new Date("2026-04-15T10:00:00") },
      { amountCents: 17500, method: "CARD" },
      ["Standard Tuning"]
    );
    expect(subject).toContain("$175.00");
  });

  it("includes services in HTML", () => {
    const { html } = paymentReceiptEmail(
      { scheduledAt: new Date("2026-04-15T10:00:00") },
      { amountCents: 17500, method: "CARD" },
      ["Standard Tuning"]
    );
    expect(html).toContain("Standard Tuning");
  });

  it("shows payment method", () => {
    const { html } = paymentReceiptEmail(
      { scheduledAt: new Date("2026-04-15T10:00:00") },
      { amountCents: 17500, method: "CASH" },
      ["Repair"]
    );
    expect(html).toContain("CASH");
  });
});
```

- [ ] **Step 2: Implement payment email function**

```typescript
// src/lib/emails/payment.ts
import { buildEmailHtml } from "@/lib/email";
import { formatCents } from "@/lib/utils";
import { format } from "date-fns";

export function paymentReceiptEmail(
  booking: { scheduledAt: Date },
  payment: { amountCents: number; method: string | null },
  services: string[]
): { subject: string; html: string } {
  const amount = formatCents(payment.amountCents);
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy");
  return {
    subject: `Payment receipt - ${amount}`,
    html: buildEmailHtml(
      "Payment Receipt",
      `<p>Your payment has been processed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;font-weight:600;">${amount}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Method</td><td style="padding:8px 0;">${payment.method ?? "Card"}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Services</td><td style="padding:8px 0;">${services.join(", ")}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;">${dateStr}</td></tr>
      </table>
      <p>Thank you for choosing PianoTune!</p>`
    ),
  };
}
```

- [ ] **Step 3: Run tests**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx vitest run __tests__/lib/emails/payment.test.ts`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/emails/payment.ts __tests__/lib/emails/payment.test.ts
git commit -m "feat: add payment receipt email content function

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Integrate emails into booking actions

**Files:**
- Modify: `src/actions/booking.ts`
- Modify: `__tests__/actions/booking.test.ts`

- [ ] **Step 1: Add email mock to booking tests**

In `__tests__/actions/booking.test.ts`, add after the existing mocks:

```typescript
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));
```

Add a test inside `describe("createBooking")`:

```typescript
it("sends confirmation emails to customer and technician", async () => {
  const { sendEmail } = await import("@/lib/email");
  mockGetSession.mockResolvedValue(mockCustomerSession());
  prismaMock.service.findMany.mockResolvedValue([fixtures.service]);
  prismaMock.booking.create.mockResolvedValue({
    id: "new-booking",
    scheduledAt: new Date("2026-04-15T10:00:00"),
    addressLine1: "123 Main",
    city: "Boston",
    state: "MA",
    totalCents: 17500,
  });
  // Need technician user email for sending
  prismaMock.technicianProfile.findUnique.mockResolvedValue({
    ...fixtures.technicianProfile,
    user: { name: "Mike Tuner", email: "tech@example.com" },
  });

  await createBooking({
    technicianId: "tech-profile-1",
    serviceIds: ["service-1"],
    scheduledAt: "2026-04-15T10:00:00",
    addressLine1: "123 Main",
    city: "Boston",
    state: "MA",
    zipCode: "02108",
  });

  expect(sendEmail).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx vitest run __tests__/actions/booking.test.ts`

- [ ] **Step 3: Add emails to createBooking**

In `src/actions/booking.ts`, add imports:

```typescript
import { sendEmail } from "@/lib/email";
import { bookingCreatedEmail, bookingReceivedEmail, bookingStatusEmail, bookingCancelledEmail } from "@/lib/emails/booking";
```

After the `prisma.booking.create` call and before the `revalidatePath` calls, add:

```typescript
// Send confirmation emails
try {
  const techProfile = await prisma.technicianProfile.findUnique({
    where: { id: technicianId },
    include: { user: { select: { name: true, email: true } } },
  });
  const serviceNames = services.map((s) => s.name);

  if (session.user.email) {
    const email = bookingCreatedEmail(booking, techProfile?.user.name ?? "Your technician", serviceNames);
    await sendEmail({ to: session.user.email, ...email });
  }
  if (techProfile?.user.email) {
    const email = bookingReceivedEmail(booking, session.user.name ?? "Customer", serviceNames);
    await sendEmail({ to: techProfile.user.email, ...email });
  }
} catch (error) {
  console.error("[EMAIL] Failed to send booking confirmation:", error);
}
```

- [ ] **Step 4: Add emails to updateBookingStatus**

In the same file, after the `prisma.booking.update` call and before the `revalidatePath` calls, add:

```typescript
// Send status change email
try {
  const updatedBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { email: true } },
      technician: { include: { user: { select: { name: true, email: true } } } },
    },
  });
  if (updatedBooking) {
    if (newStatus === "CANCELLED") {
      const email = bookingCancelledEmail(updatedBooking);
      if (updatedBooking.customer.email) {
        await sendEmail({ to: updatedBooking.customer.email, ...email });
      }
      if (updatedBooking.technician.user.email) {
        await sendEmail({ to: updatedBooking.technician.user.email, ...email });
      }
    } else if (updatedBooking.customer.email) {
      const email = bookingStatusEmail(updatedBooking, newStatus, updatedBooking.technician.user.name ?? "Your technician");
      await sendEmail({ to: updatedBooking.customer.email, ...email });
    }
  }
} catch (error) {
  console.error("[EMAIL] Failed to send status email:", error);
}
```

- [ ] **Step 5: Run all tests**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/actions/booking.ts __tests__/actions/booking.test.ts
git commit -m "feat: send email notifications on booking create and status change

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Integrate emails into payment actions

**Files:**
- Modify: `src/actions/payment.ts`
- Modify: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Add email to markCashPayment**

In `src/actions/payment.ts`, add imports:

```typescript
import { sendEmail } from "@/lib/email";
import { paymentReceiptEmail } from "@/lib/emails/payment";
```

After the payment create/update in `markCashPayment`, before `revalidatePath`, add:

```typescript
// Send payment receipt
try {
  const bookingWithDetails = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { email: true } },
      services: { include: { service: { select: { name: true } } } },
    },
  });
  if (bookingWithDetails?.customer.email) {
    const email = paymentReceiptEmail(
      bookingWithDetails,
      { amountCents: booking.totalCents, method: "CASH" },
      bookingWithDetails.services.map((s) => s.service.name)
    );
    await sendEmail({ to: bookingWithDetails.customer.email, ...email });
  }
} catch (error) {
  console.error("[EMAIL] Failed to send payment receipt:", error);
}
```

- [ ] **Step 2: Add email to Stripe webhook**

In `src/app/api/webhooks/stripe/route.ts`, add imports:

```typescript
import { sendEmail } from "@/lib/email";
import { paymentReceiptEmail } from "@/lib/emails/payment";
```

After the payment create/update inside the `if (bookingId)` block, add:

```typescript
// Send payment receipt email
try {
  const bookingWithDetails = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { email: true } },
      services: { include: { service: { select: { name: true } } } },
    },
  });
  if (bookingWithDetails?.customer.email) {
    const email = paymentReceiptEmail(
      bookingWithDetails,
      { amountCents: session.amount_total ?? 0, method: "CARD" },
      bookingWithDetails.services.map((s) => s.service.name)
    );
    await sendEmail({ to: bookingWithDetails.customer.email, ...email });
  }
} catch (error) {
  console.error("[EMAIL] Failed to send payment receipt:", error);
}
```

- [ ] **Step 3: Run build and tests**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx next build && npx vitest run`
Expected: Build succeeds, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/actions/payment.ts src/app/api/webhooks/stripe/route.ts
git commit -m "feat: send payment receipt emails on card and cash payments

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full unit test suite**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run build**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx next build`
Expected: Build succeeds

- [ ] **Step 3: Run e2e tests**

Run:
```bash
source ~/.nvm/nvm.sh && nvm use 20
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null
npx tsx e2e/seed-test-db.ts && npx playwright test
```
Expected: All e2e tests pass
