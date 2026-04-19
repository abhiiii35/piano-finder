# Backend Features 1-4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement CRM auto-populate, email verification, invoice PDF generation, and Stripe fallback UI — four independent backend features running in parallel.

**Architecture:** Four parallel agents, each owning non-overlapping files. Feature 1 modifies booking status logic. Feature 2 adds verification to auth flow and booking gate. Feature 3 creates new PDF generation files and extends email. Feature 4 adds client-side env checks to booking UI.

**Tech Stack:** Next.js 16, Prisma 7, Vitest, @react-pdf/renderer, Resend email, next-auth

**Spec:** `docs/superpowers/specs/2026-04-19-backend-features-design.md`

---

## Agent 1: CRM Auto-populate

### Task 1: Auto-create CustomerRecord on booking completion

**Files:**
- Modify: `src/actions/booking.ts`
- Test: `__tests__/actions/booking.test.ts`

- [ ] **Step 1: Add test for CRM auto-populate on completion**

In `__tests__/actions/booking.test.ts`, add a new test in the `updateBookingStatus` describe block:

```typescript
it("auto-creates CustomerRecord when booking completes", async () => {
  vi.mocked(getServerSession).mockResolvedValue(mockTechnicianSession());

  prismaMock.booking.findUnique.mockResolvedValue({
    ...fixtures.booking,
    status: "IN_PROGRESS",
    technician: { ...fixtures.technicianProfile, userId: "tech-user-1" },
  });

  prismaMock.booking.update.mockResolvedValue({
    ...fixtures.booking,
    status: "COMPLETED",
  });

  // For the email fetch after status update
  prismaMock.booking.findUnique.mockResolvedValueOnce({
    ...fixtures.booking,
    status: "IN_PROGRESS",
    technician: { ...fixtures.technicianProfile, userId: "tech-user-1" },
  });
  prismaMock.booking.update.mockResolvedValue({
    ...fixtures.booking,
    status: "COMPLETED",
  });
  prismaMock.booking.findUnique.mockResolvedValueOnce({
    ...fixtures.booking,
    status: "COMPLETED",
    customer: { email: "customer@example.com", name: "Jane Doe", phone: "617-555-0100" },
    technician: { ...fixtures.technicianProfile, user: { name: "Mike Tuner", email: "tech@example.com" } },
  });
  prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
  prismaMock.customerRecord.upsert.mockResolvedValue(fixtures.customerRecord);

  const result = await updateBookingStatus("booking-1", "COMPLETED");

  expect(result.success).toBe(true);
  expect(prismaMock.customerRecord.upsert).toHaveBeenCalled();
});
```

- [ ] **Step 2: Implement CRM auto-populate**

In `src/actions/booking.ts`, inside `updateBookingStatus()`, after the `prisma.booking.update()` call (around line 175) and before the email sending try/catch block, add:

```typescript
  // Auto-populate CRM when booking completes
  if (newStatus === "COMPLETED") {
    try {
      const completedBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: { select: { name: true, email: true, phone: true } },
        },
      });
      if (completedBooking?.customer.email) {
        await prisma.customerRecord.upsert({
          where: {
            technicianId_customerEmail: {
              technicianId: booking.technicianId,
              customerEmail: completedBooking.customer.email,
            },
          },
          update: {
            customerName: completedBooking.customer.name ?? undefined,
            customerPhone: completedBooking.customer.phone ?? undefined,
            pianoMake: completedBooking.pianoMake ?? undefined,
            pianoModel: completedBooking.pianoModel ?? undefined,
            pianoLocation: completedBooking.addressLine1 ?? undefined,
          },
          create: {
            technicianId: booking.technicianId,
            customerName: completedBooking.customer.name ?? "Customer",
            customerEmail: completedBooking.customer.email,
            customerPhone: completedBooking.customer.phone,
            pianoMake: completedBooking.pianoMake,
            pianoModel: completedBooking.pianoModel,
            pianoLocation: completedBooking.addressLine1,
          },
        });
      }
    } catch (error) {
      console.error("[CRM] Failed to auto-populate customer record:", error);
    }
  }
```

Note: Check if the `CustomerRecord` model has a `@@unique([technicianId, customerEmail])` constraint. If not, use `findFirst` + `create`/`update` instead of `upsert`. Read `prisma/schema.prisma` to verify.

- [ ] **Step 3: Run tests**

Run: `npm run test:run`
Expected: All tests pass including the new CRM test.

- [ ] **Step 4: Commit**

```bash
git add src/actions/booking.ts __tests__/actions/booking.test.ts
git commit -m "feat: auto-populate CRM CustomerRecord when booking completes"
```

---

## Agent 2: Email Verification

### Task 2: Add emailVerified to NextAuth session

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/types/next-auth.d.ts`

- [ ] **Step 1: Add emailVerified to type augmentation**

In `src/types/next-auth.d.ts`, add `emailVerified` to the Session user type and JWT:

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    emailVerified: Date | null;
  }
}
```

- [ ] **Step 2: Add emailVerified to auth callbacks**

In `src/lib/auth.ts`, update the `authorize` return to include `emailVerified`:

```typescript
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          emailVerified: user.emailVerified,
        };
```

Update the JWT callback:

```typescript
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = user.emailVerified ?? null;
      }
      return token;
    },
```

Update the session callback:

```typescript
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts src/types/next-auth.d.ts
git commit -m "feat: add emailVerified to NextAuth session and JWT"
```

### Task 3: Send verification email on signup

**Files:**
- Modify: `src/actions/auth.ts`
- Create: `src/lib/emails/verification.ts`
- Test: `__tests__/actions/auth.test.ts`

- [ ] **Step 1: Create verification email template**

Create `src/lib/emails/verification.ts`:

```typescript
import { buildEmailHtml } from "@/lib/email";

export function verificationEmail(verifyUrl: string) {
  const html = buildEmailHtml(
    "Verify Your Email",
    `
    <p>Welcome to PianoTune! Please verify your email address to complete your account setup.</p>
    <p style="margin: 24px 0;">
      <a href="${verifyUrl}" style="background-color: #0f1729; color: #f5f0e8; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Verify Email Address
      </a>
    </p>
    <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    `
  );
  return { subject: "Verify your email — PianoTune", html };
}
```

- [ ] **Step 2: Update signUp to send verification email**

In `src/actions/auth.ts`, add imports at the top:

```typescript
import { randomUUID } from "crypto";
import { sendEmail } from "@/lib/email";
import { verificationEmail } from "@/lib/emails/verification";
```

After the `prisma.user.create()` call and before the `return { success: true }`, add:

```typescript
  // Send verification email
  try {
    const token = randomUUID();
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    const emailContent = verificationEmail(verifyUrl);
    await sendEmail({ to: email, ...emailContent });
  } catch (error) {
    console.error("[EMAIL] Failed to send verification email:", error);
  }
```

- [ ] **Step 3: Add test for verification email sending**

In `__tests__/actions/auth.test.ts`, add a test that verifies `verificationToken.create` and `sendEmail` are called after signup. Read the existing test file first to follow the mock patterns.

- [ ] **Step 4: Commit**

```bash
git add src/actions/auth.ts src/lib/emails/verification.ts __tests__/actions/auth.test.ts
git commit -m "feat: send verification email on signup"
```

### Task 4: Create verify-email page

**Files:**
- Create: `src/app/(auth)/verify-email/page.tsx`

- [ ] **Step 1: Create the verification page**

Create `src/app/(auth)/verify-email/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  if (!token || !email) {
    return (
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-xl font-bold text-foreground">Invalid Link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This verification link is missing required parameters.
        </p>
      </div>
    );
  }

  const verificationToken = await prisma.verificationToken.findFirst({
    where: { token, identifier: email },
  });

  if (!verificationToken) {
    return (
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-xl font-bold text-foreground">Invalid or Expired Link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This verification link has expired or already been used.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: email, token } },
    });
    return (
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-xl font-bold text-foreground">Link Expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This verification link has expired. Please sign in and request a new one.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Verify the user
  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: email, token } },
  });

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-accent" />
      <h1 className="mt-4 text-xl font-bold text-foreground">Email Verified!</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your email has been verified. You can now book piano technicians.
      </p>
      <Link
        href="/sign-in"
        className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Sign In
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(auth\)/verify-email/page.tsx
git commit -m "feat: add email verification page"
```

### Task 5: Gate booking on email verification

**Files:**
- Modify: `src/actions/booking.ts`
- Test: `__tests__/actions/booking.test.ts`

- [ ] **Step 1: Add booking gate test**

In `__tests__/actions/booking.test.ts`, add:

```typescript
it("rejects booking from unverified email", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    ...mockCustomerSession(),
    user: { ...mockCustomerSession().user, emailVerified: null },
  });

  const result = await createBooking({
    technicianId: "tech-profile-1",
    serviceIds: ["service-1"],
    scheduledAt: "2026-04-20T10:00:00",
    addressLine1: "123 Main St",
    city: "Boston",
    state: "MA",
    zipCode: "02108",
  });

  expect(result.error).toBe("Please verify your email before booking");
});
```

- [ ] **Step 2: Add the gate to createBooking**

In `src/actions/booking.ts`, in the `createBooking()` function, after the session check (`if (!session) return ...`), add:

```typescript
  if (!session.user.emailVerified) {
    return { error: "Please verify your email before booking" };
  }
```

- [ ] **Step 3: Run tests**

Run: `npm run test:run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/actions/booking.ts __tests__/actions/booking.test.ts
git commit -m "feat: gate booking creation on email verification"
```

### Task 6: Add resend verification action

**Files:**
- Modify: `src/actions/auth.ts`

- [ ] **Step 1: Add resendVerification action**

In `src/actions/auth.ts`, add a new exported function:

```typescript
export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "No account found with this email" };
  if (user.emailVerified) return { error: "Email is already verified" };

  // Rate limit: check if a token was created in the last 60 seconds
  const recentToken = await prisma.verificationToken.findFirst({
    where: {
      identifier: email,
      expires: { gt: new Date(Date.now() + 23 * 60 * 60 * 1000) },
    },
  });
  if (recentToken) {
    return { error: "Please wait before requesting another verification email" };
  }

  // Delete old tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  const token = randomUUID();
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  const emailContent = verificationEmail(verifyUrl);
  await sendEmail({ to: email, ...emailContent });

  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/auth.ts
git commit -m "feat: add resend verification email action"
```

---

## Agent 3: Invoice PDF Generation

### Task 7: Install @react-pdf/renderer

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run: `npm install @react-pdf/renderer`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @react-pdf/renderer for invoice PDF generation"
```

### Task 8: Create PDF component and API route

**Files:**
- Create: `src/components/invoice/invoice-pdf.tsx`
- Create: `src/app/api/invoices/[bookingId]/pdf/route.ts`

- [ ] **Step 1: Create the PDF component**

Create `src/components/invoice/invoice-pdf.tsx`:

```tsx
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatCents } from "@/lib/utils";
import { format } from "date-fns";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  title: { fontSize: 22, fontWeight: "bold", color: "#0f1729" },
  invoiceId: { fontSize: 10, color: "#6b7280", marginTop: 4 },
  companyName: { fontSize: 12, fontWeight: "bold", textAlign: "right" },
  companyDetail: { fontSize: 10, color: "#6b7280", textAlign: "right" },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 9, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e0d5", paddingBottom: 6, marginBottom: 6 },
  tableHeaderText: { fontWeight: "bold", fontSize: 10 },
  tableRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#f0ebe3" },
  totalRow: { flexDirection: "row", paddingTop: 8, marginTop: 4 },
  totalText: { fontWeight: "bold", fontSize: 12 },
  serviceCol: { flex: 2 },
  durationCol: { flex: 1, textAlign: "right" },
  amountCol: { flex: 1, textAlign: "right" },
  paid: { color: "#166534", fontWeight: "bold" },
  unpaid: { color: "#dc2626", fontWeight: "bold" },
});

type InvoiceData = {
  bookingId: string;
  date: Date;
  technician: { name: string; address?: string; cityState?: string; email: string };
  customer: { name: string; email: string; phone?: string | null };
  services: { name: string; durationMin: number; priceCents: number }[];
  totalCents: number;
  isPaid: boolean;
};

export function InvoicePDF({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.invoiceId}>#{data.bookingId.slice(0, 8)}</Text>
          </View>
          <View>
            <Text style={styles.companyName}>{data.technician.name}</Text>
            {data.technician.address && (
              <Text style={styles.companyDetail}>{data.technician.address}</Text>
            )}
            {data.technician.cityState && (
              <Text style={styles.companyDetail}>{data.technician.cityState}</Text>
            )}
            <Text style={styles.companyDetail}>{data.technician.email}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 40, marginBottom: 30 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={{ fontWeight: "bold" }}>{data.customer.name}</Text>
            <Text>{data.customer.email}</Text>
            {data.customer.phone && <Text>{data.customer.phone}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Details</Text>
            <Text>Date: {format(data.date, "MMMM d, yyyy")}</Text>
            <Text style={data.isPaid ? styles.paid : styles.unpaid}>
              {data.isPaid ? "Paid" : "Unpaid"}
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.serviceCol]}>Service</Text>
          <Text style={[styles.tableHeaderText, styles.durationCol]}>Duration</Text>
          <Text style={[styles.tableHeaderText, styles.amountCol]}>Amount</Text>
        </View>

        {data.services.map((s, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.serviceCol}>{s.name}</Text>
            <Text style={styles.durationCol}>{s.durationMin} min</Text>
            <Text style={styles.amountCol}>{formatCents(s.priceCents)}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={[styles.totalText, styles.serviceCol]} />
          <Text style={[styles.totalText, styles.durationCol]}>Total</Text>
          <Text style={[styles.totalText, styles.amountCol]}>{formatCents(data.totalCents)}</Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Create the PDF API route**

Create `src/app/api/invoices/[bookingId]/pdf/route.ts`:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoice/invoice-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      technician: {
        include: { user: { select: { name: true, email: true } } },
      },
      services: { include: { service: true } },
      payment: true,
    },
  });

  if (!booking) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Auth: must be technician or customer of this booking
  const isTechnician = booking.technician.userId === session.user.id;
  const isCustomer = booking.customerId === session.user.id;
  if (!isTechnician && !isCustomer) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = {
    bookingId: booking.id,
    date: booking.scheduledAt,
    technician: {
      name: booking.technician.businessName || booking.technician.user.name || "Technician",
      address: booking.technician.addressLine1 ?? undefined,
      cityState: booking.technician.city
        ? `${booking.technician.city}, ${booking.technician.state} ${booking.technician.zipCode}`
        : undefined,
      email: booking.technician.user.email ?? "",
    },
    customer: {
      name: booking.customer.name ?? "Customer",
      email: booking.customer.email ?? "",
      phone: booking.customer.phone,
    },
    services: booking.services.map((bs) => ({
      name: bs.service.name,
      durationMin: bs.service.durationMin,
      priceCents: bs.priceCents,
    })),
    totalCents: booking.totalCents,
    isPaid: booking.payment?.status === "SUCCEEDED",
  };

  const buffer = await renderToBuffer(<InvoicePDF data={data} />);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${booking.id.slice(0, 8)}.pdf"`,
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/invoice/invoice-pdf.tsx src/app/api/invoices/\[bookingId\]/pdf/route.ts
git commit -m "feat: add invoice PDF generation component and API route"
```

### Task 9: Add PDF download and email buttons to invoice page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/technician/bookings/[id]/invoice/page.tsx`
- Modify: `src/lib/email.ts`
- Create: `src/actions/invoice.ts`
- Create: `src/lib/emails/invoice.ts`

- [ ] **Step 1: Extend sendEmail to support attachments**

In `src/lib/email.ts`, update the function signature and Resend call to support optional attachments:

```typescript
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
```

And in the Resend call, add the attachments field:

```typescript
    await resend.emails.send({
      from: "PianoTune <noreply@yourdomain.com>",
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
```

- [ ] **Step 2: Create invoice email template**

Create `src/lib/emails/invoice.ts`:

```typescript
import { buildEmailHtml } from "@/lib/email";

export function invoiceEmail(technicianName: string) {
  const html = buildEmailHtml(
    "Your Invoice",
    `
    <p>Your invoice from <strong>${technicianName}</strong> is attached as a PDF.</p>
    <p style="color: #6b7280; font-size: 14px;">If you have any questions about this invoice, please contact your technician directly.</p>
    `
  );
  return { subject: `Your invoice from ${technicianName} — PianoTune`, html };
}
```

- [ ] **Step 3: Create emailInvoice server action**

Create `src/actions/invoice.ts`:

```typescript
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoice/invoice-pdf";
import { sendEmail } from "@/lib/email";
import { invoiceEmail } from "@/lib/emails/invoice";

export async function emailInvoice(bookingId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return { error: "Unauthorized" };
  }

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!profile) return { error: "Profile not found" };

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, technicianId: profile.id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      services: { include: { service: true } },
      payment: true,
    },
  });

  if (!booking) return { error: "Booking not found" };
  if (!booking.customer.email) return { error: "Customer has no email address" };

  const techName = profile.businessName || profile.user.name || "Technician";

  const data = {
    bookingId: booking.id,
    date: booking.scheduledAt,
    technician: {
      name: techName,
      address: profile.addressLine1 ?? undefined,
      cityState: profile.city ? `${profile.city}, ${profile.state} ${profile.zipCode}` : undefined,
      email: profile.user.email ?? "",
    },
    customer: {
      name: booking.customer.name ?? "Customer",
      email: booking.customer.email,
      phone: booking.customer.phone,
    },
    services: booking.services.map((bs) => ({
      name: bs.service.name,
      durationMin: bs.service.durationMin,
      priceCents: bs.priceCents,
    })),
    totalCents: booking.totalCents,
    isPaid: booking.payment?.status === "SUCCEEDED",
  };

  const pdfBuffer = await renderToBuffer(<InvoicePDF data={data} />);

  const emailContent = invoiceEmail(techName);
  await sendEmail({
    to: booking.customer.email,
    ...emailContent,
    attachments: [
      { filename: `invoice-${booking.id.slice(0, 8)}.pdf`, content: Buffer.from(pdfBuffer) },
    ],
  });

  return { success: true };
}
```

- [ ] **Step 4: Add Download PDF and Email Invoice buttons to invoice page**

In `src/app/(dashboard)/dashboard/technician/bookings/[id]/invoice/page.tsx`, the current button section (lines 41-48) has only a Print button. This is a server component, so the Email button needs a client wrapper. 

Replace the `no-print` div with a client component. Create a small inline client component or add the buttons directly. Since the page is a server component, add the download button as a plain link and create a small client component for the email button.

Add after the existing Print button:

```tsx
        <a
          href={`/api/invoices/${booking.id}/pdf`}
          download
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
        >
          Download PDF
        </a>
```

For the Email button, create a small client component `src/components/invoice/email-invoice-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { emailInvoice } from "@/actions/invoice";
import { toast } from "sonner";

export function EmailInvoiceButton({ bookingId }: { bookingId: string }) {
  const [sending, setSending] = useState(false);

  async function handleEmail() {
    setSending(true);
    const result = await emailInvoice(bookingId);
    setSending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invoice emailed to customer");
    }
  }

  return (
    <button
      onClick={handleEmail}
      disabled={sending}
      className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
    >
      {sending ? "Sending..." : "Email Invoice"}
    </button>
  );
}
```

Import and add it to the invoice page.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/emails/invoice.ts src/actions/invoice.ts src/components/invoice/email-invoice-button.tsx src/app/\(dashboard\)/dashboard/technician/bookings/\[id\]/invoice/page.tsx
git commit -m "feat: add invoice PDF download, email, and attachment support"
```

---

## Agent 4: Stripe Fallback UI

### Task 10: Add Stripe availability check to booking page

**Files:**
- Modify: `src/app/(public)/technicians/[id]/book/page.tsx`

- [ ] **Step 1: Add Stripe check in Step 4**

In `src/app/(public)/technicians/[id]/book/page.tsx`, in the Step 4 (Confirm) section, find the confirm button. Add a check for `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

Before the `handleConfirm` function, add:

```typescript
  const stripeEnabled = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
```

Then in Step 4's button area, conditionally render:

```tsx
                <Button onClick={handleConfirm} disabled={loading}>
                  {loading ? "Booking..." : stripeEnabled ? "Confirm Booking" : "Book & Pay Later"}
                </Button>
```

Add a note below the button when Stripe isn't configured:

```tsx
                {!stripeEnabled && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Online payments coming soon. Your technician will arrange payment directly.
                  </p>
                )}
```

Also, in `handleConfirm`, if Stripe is not enabled, skip the checkout redirect and just navigate to the booking confirmation:

```typescript
  async function handleConfirm() {
    setLoading(true);
    setConflictSlots(null);
    const result = await createBooking({
      technicianId: params.id as string,
      serviceIds: selectedServices,
      scheduledAt: `${selectedDate}T${selectedTime}:00`,
      ...address,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      if (result.availableSlots) {
        setConflictSlots(result.availableSlots);
      }
    } else {
      toast.success("Booking created!");
      router.push(`/dashboard/customer/bookings/${result.bookingId}`);
    }
  }
```

Note: The current `handleConfirm` already just creates the booking and redirects to the booking detail page — there's no Stripe redirect in `handleConfirm` itself. The Stripe checkout is triggered separately from the booking detail page via the PayButton. So the booking page change is mainly cosmetic: button text and info note.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(public\)/technicians/\[id\]/book/page.tsx
git commit -m "feat: show 'Book & Pay Later' when Stripe is not configured"
```

### Task 11: Add Stripe check to customer booking detail page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/customer/bookings/[id]/page.tsx`

- [ ] **Step 1: Update the Pay Now button conditional**

Read `src/app/(dashboard)/dashboard/customer/bookings/[id]/page.tsx` first. Find where `PayButton` is rendered (conditionally on payment status).

Add a Stripe availability check. The page is likely a server component, so use a server-side env check:

```typescript
const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
```

Update the PayButton conditional from:

```tsx
{booking.payment?.status !== "SUCCEEDED" && booking.status !== "CANCELLED" && (
  <PayButton bookingId={booking.id} />
)}
```

To:

```tsx
{booking.payment?.status !== "SUCCEEDED" && booking.status !== "CANCELLED" && (
  stripeEnabled ? (
    <PayButton bookingId={booking.id} />
  ) : (
    <p className="text-sm text-muted-foreground">
      Payment will be arranged with your technician.
    </p>
  )
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/customer/bookings/\[id\]/page.tsx
git commit -m "feat: show payment message instead of Pay button when Stripe not configured"
```

---

## Task 12: Run tests and final verification

**Files:** None (verification only)

- [ ] **Step 1: Run test suite**

Run: `npm run test:run`
Expected: All tests pass.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve remaining backend feature issues"
```
