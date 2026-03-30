# Technician Onboarding & Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guided onboarding wizard for new technicians with admin verification before profiles appear in search.

**Architecture:** New `onboardingStatus` field on TechnicianProfile drives the flow. After signup, technicians land in a fullscreen wizard (profile + services), then the dashboard shows a checklist banner for optional steps (availability, submit). Admins review submissions and approve/reject with email notifications.

**Tech Stack:** Next.js 16, Prisma 7 (SQLite), Vitest, server actions, Resend email, shadcn/ui components

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src/lib/constants.ts` | Add `ONBOARDING_STATUS` constant (modify) |
| `src/actions/onboarding.ts` | Server actions: `completeWizard`, `submitForReview` |
| `src/actions/admin.ts` | Server actions: `approveSubmission`, `rejectSubmission` |
| `src/lib/emails/onboarding.ts` | Email content: approval + rejection |
| `src/lib/validations/onboarding.ts` | Zod schema for wizard profile step |
| `src/app/(auth)/onboarding/page.tsx` | Fullscreen wizard page |
| `src/app/(auth)/onboarding/submit/page.tsx` | Summary + submit for review page |
| `src/components/onboarding/wizard.tsx` | Multi-step wizard component |
| `src/components/onboarding/profile-step.tsx` | Wizard step 1: profile details |
| `src/components/onboarding/services-step.tsx` | Wizard step 2: services review |
| `src/components/onboarding/banner.tsx` | Dashboard checklist banner |
| `src/app/(dashboard)/dashboard/admin/submissions/page.tsx` | Admin submissions list |
| `src/components/admin/submission-card.tsx` | Approve/reject card for a technician |
| `__tests__/actions/onboarding.test.ts` | Tests for onboarding actions |
| `__tests__/actions/admin.test.ts` | Tests for admin actions |
| `__tests__/lib/emails/onboarding.test.ts` | Tests for email content |

### Modified Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `onboardingStatus` field to TechnicianProfile |
| `prisma/seed.ts` | Add admin user, set existing tech to `APPROVED` |
| `src/lib/constants.ts` | Add `ONBOARDING_STATUS` constant |
| `src/actions/technician-signup.ts` | Set `isActive=false`, `onboardingStatus=WIZARD_PENDING`, change redirect |
| `src/app/(dashboard)/dashboard/technician/page.tsx` | Render OnboardingBanner |
| `src/app/(dashboard)/layout.tsx` | Redirect `WIZARD_PENDING` to `/onboarding` |
| `proxy.ts` | Add admin route protection |
| `__tests__/helpers/mocks.ts` | Add `mockAdminSession`, update fixtures with `onboardingStatus` |
| `__tests__/actions/technician-signup.test.ts` | Update expectations for `isActive=false` |

---

### Task 1: Schema — Add onboardingStatus field and ADMIN role support

**Files:**
- Modify: `prisma/schema.prisma:71-99`
- Modify: `src/lib/constants.ts`
- Modify: `prisma/seed.ts`
- Modify: `__tests__/helpers/mocks.ts`

- [ ] **Step 1: Add onboardingStatus to TechnicianProfile in schema**

In `prisma/schema.prisma`, add the `onboardingStatus` field to the TechnicianProfile model after `isActive`:

```prisma
  isActive        Boolean @default(true)
  onboardingStatus String @default("WIZARD_PENDING") // WIZARD_PENDING | CHECKLIST_PENDING | SUBMITTED | APPROVED | REJECTED
  rejectionReason  String? // Admin's reason when rejecting
```

- [ ] **Step 2: Add ONBOARDING_STATUS constant**

In `src/lib/constants.ts`, add:

```typescript
export const ONBOARDING_STATUS = {
  WIZARD_PENDING: "WIZARD_PENDING",
  CHECKLIST_PENDING: "CHECKLIST_PENDING",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
```

- [ ] **Step 3: Run migration**

```bash
nvm use 20 && npx prisma migrate dev --name add-onboarding-status
```

Expected: Migration creates successfully, adds `onboardingStatus` column with default `WIZARD_PENDING` and nullable `rejectionReason`.

- [ ] **Step 4: Update seed file — add admin user, set tech to APPROVED**

In `prisma/seed.ts`, add an admin user after the customer:

```typescript
  // Create an admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      hashedPassword: await hash("password123", 12),
      role: "ADMIN",
    },
  });
```

And update the technician profile creation to include `onboardingStatus: "APPROVED"`:

```typescript
  const techProfile = await prisma.technicianProfile.upsert({
    where: { userId: techUser.id },
    update: {},
    create: {
      userId: techUser.id,
      bio: "RPT with 15 years of experience tuning and repairing all piano types.",
      businessName: "Mike's Piano Service",
      yearsExperience: 15,
      certifications: JSON.stringify(["RPT", "PTG Member"]),
      serviceRadius: 30,
      latitude: 42.3601,
      longitude: -71.0589,
      addressLine1: "123 Tremont St",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
      isVerified: true,
      onboardingStatus: "APPROVED",
    },
  });
```

Add to the seed log:

```typescript
  console.log("Seeded:", { customer: customer.id, technician: techProfile.id, booking: booking.id, admin: admin.id });
```

- [ ] **Step 5: Update test fixtures**

In `__tests__/helpers/mocks.ts`, add `mockAdminSession`:

```typescript
export function mockAdminSession() {
  return {
    user: {
      id: "admin-1",
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
    },
  };
}
```

Update `fixtures.technicianProfile` to include the new fields:

```typescript
  technicianProfile: {
    id: "tech-profile-1",
    userId: "tech-user-1",
    bio: "Experienced piano tuner",
    businessName: "Mike's Piano Service",
    yearsExperience: 15,
    certifications: JSON.stringify(["RPT"]),
    serviceRadius: 30,
    latitude: 42.36,
    longitude: -71.06,
    addressLine1: "123 Main St",
    city: "Boston",
    state: "MA",
    zipCode: "02108",
    stripeAccountId: null,
    isVerified: true,
    isActive: true,
    onboardingStatus: "APPROVED",
    rejectionReason: null,
    pianoTypes: null,
    travelFeeCents: null,
    ptgMember: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
```

- [ ] **Step 6: Re-seed database**

```bash
nvm use 20 && npx prisma db seed
```

Expected: Seeds successfully with admin user and technician with `APPROVED` status.

- [ ] **Step 7: Run existing tests to confirm nothing broke**

```bash
nvm use 20 && npm run test:run
```

Expected: All existing tests pass.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts src/lib/constants.ts __tests__/helpers/mocks.ts
git commit -m "feat: add onboardingStatus field and ADMIN role to schema"
```

---

### Task 2: Update signup action — set isActive=false and onboardingStatus

**Files:**
- Modify: `src/actions/technician-signup.ts:60-75`
- Modify: `__tests__/actions/technician-signup.test.ts`

- [ ] **Step 1: Write the failing test**

In `__tests__/actions/technician-signup.test.ts`, update the first test to assert the new field values. Add these assertions after the existing ones:

```typescript
  it("creates profile with WIZARD_PENDING status and isActive=false", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.technicianProfile.create.mockResolvedValue({ id: "new-profile" });
    prismaMock.service.createMany.mockResolvedValue({ count: 3 });

    const fd = makeFormData(validForm);
    const result = await createTechnicianProfile(fd);

    expect(result.success).toBe(true);
    const profileData = prismaMock.technicianProfile.create.mock.calls[0][0].data;
    expect(profileData.isActive).toBe(false);
    expect(profileData.onboardingStatus).toBe("WIZARD_PENDING");
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
nvm use 20 && npx vitest run __tests__/actions/technician-signup.test.ts
```

Expected: FAIL — `isActive` is not set (defaults to `true`), `onboardingStatus` is `undefined`.

- [ ] **Step 3: Update the signup action**

In `src/actions/technician-signup.ts`, add the import for `ONBOARDING_STATUS`:

```typescript
import { ROLES, ONBOARDING_STATUS } from "@/lib/constants";
```

In the `prisma.technicianProfile.create` call, add two fields to the `data` object:

```typescript
      isActive: false,
      onboardingStatus: ONBOARDING_STATUS.WIZARD_PENDING,
```

Change the return at the end from:

```typescript
  revalidatePath("/search");
  return { success: true };
```

to:

```typescript
  revalidatePath("/search");
  return { success: true, redirect: "/onboarding" };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
nvm use 20 && npx vitest run __tests__/actions/technician-signup.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/actions/technician-signup.ts __tests__/actions/technician-signup.test.ts
git commit -m "feat: set isActive=false and WIZARD_PENDING on technician signup"
```

---

### Task 3: Onboarding validation schema

**Files:**
- Create: `src/lib/validations/onboarding.ts`

- [ ] **Step 1: Create the validation schema**

Create `src/lib/validations/onboarding.ts`:

```typescript
import { z } from "zod";

export const wizardProfileSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters").max(1000),
  businessName: z.string().max(100).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(100),
});

export type WizardProfileInput = z.infer<typeof wizardProfileSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/onboarding.ts
git commit -m "feat: add wizard profile validation schema"
```

---

### Task 4: Onboarding server actions

**Files:**
- Create: `src/actions/onboarding.ts`
- Create: `__tests__/actions/onboarding.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/actions/onboarding.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockTechnicianSession,
  makeFormData,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { completeWizard, submitForReview } from "@/actions/onboarding";

const mockGetSession = vi.mocked(getServerSession);

describe("completeWizard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates profile and sets status to CHECKLIST_PENDING", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "WIZARD_PENDING",
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});

    const fd = makeFormData({
      bio: "I have been tuning pianos for over 10 years.",
      businessName: "Mike's Piano Service",
      yearsExperience: "15",
    });
    const result = await completeWizard(fd);

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: {
        bio: "I have been tuning pianos for over 10 years.",
        businessName: "Mike's Piano Service",
        yearsExperience: 15,
        onboardingStatus: "CHECKLIST_PENDING",
      },
    });
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const fd = makeFormData({ bio: "Test", yearsExperience: "5" });
    const result = await completeWizard(fd);
    expect(result.error).toBeDefined();
  });

  it("rejects if profile is not in WIZARD_PENDING status", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "APPROVED",
    });

    const fd = makeFormData({ bio: "Test bio text here", yearsExperience: "5" });
    const result = await completeWizard(fd);
    expect(result.error).toContain("already completed");
  });

  it("rejects invalid data", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "WIZARD_PENDING",
    });

    const fd = makeFormData({ bio: "short", yearsExperience: "5" });
    const result = await completeWizard(fd);
    expect(result.error).toBeDefined();
  });
});

describe("submitForReview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets status to SUBMITTED", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "CHECKLIST_PENDING",
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});

    const result = await submitForReview();

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: { onboardingStatus: "SUBMITTED" },
    });
  });

  it("allows resubmission from REJECTED status", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "REJECTED",
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});

    const result = await submitForReview();

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: { onboardingStatus: "SUBMITTED", rejectionReason: null },
    });
  });

  it("rejects if not in CHECKLIST_PENDING or REJECTED status", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "APPROVED",
    });

    const result = await submitForReview();
    expect(result.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
nvm use 20 && npx vitest run __tests__/actions/onboarding.test.ts
```

Expected: FAIL — module `@/actions/onboarding` does not exist.

- [ ] **Step 3: Implement onboarding actions**

Create `src/actions/onboarding.ts`:

```typescript
"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ONBOARDING_STATUS } from "@/lib/constants";
import { wizardProfileSchema } from "@/lib/validations/onboarding";

async function getOnboardingProfile() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return { error: "Unauthorized" as const };
  }
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return { error: "Profile not found" as const };
  return { session, profile };
}

export async function completeWizard(formData: FormData) {
  const result = await getOnboardingProfile();
  if ("error" in result) return { error: result.error };
  const { profile } = result;

  if (profile.onboardingStatus !== ONBOARDING_STATUS.WIZARD_PENDING) {
    return { error: "Wizard already completed" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = wizardProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.technicianProfile.update({
    where: { id: profile.id },
    data: {
      bio: parsed.data.bio,
      businessName: parsed.data.businessName || null,
      yearsExperience: parsed.data.yearsExperience,
      onboardingStatus: ONBOARDING_STATUS.CHECKLIST_PENDING,
    },
  });

  revalidatePath("/dashboard/technician");
  return { success: true };
}

export async function submitForReview() {
  const result = await getOnboardingProfile();
  if ("error" in result) return { error: result.error };
  const { profile } = result;

  const allowed = [ONBOARDING_STATUS.CHECKLIST_PENDING, ONBOARDING_STATUS.REJECTED];
  if (!allowed.includes(profile.onboardingStatus)) {
    return { error: "Cannot submit from current status" };
  }

  const data: { onboardingStatus: string; rejectionReason?: null } = {
    onboardingStatus: ONBOARDING_STATUS.SUBMITTED,
  };
  if (profile.onboardingStatus === ONBOARDING_STATUS.REJECTED) {
    data.rejectionReason = null;
  }

  await prisma.technicianProfile.update({
    where: { id: profile.id },
    data,
  });

  revalidatePath("/dashboard/technician");
  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
nvm use 20 && npx vitest run __tests__/actions/onboarding.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/actions/onboarding.ts src/lib/validations/onboarding.ts __tests__/actions/onboarding.test.ts
git commit -m "feat: add onboarding server actions with tests"
```

---

### Task 5: Onboarding email content

**Files:**
- Create: `src/lib/emails/onboarding.ts`
- Create: `__tests__/lib/emails/onboarding.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/emails/onboarding.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { profileApprovedEmail, profileRejectedEmail } from "@/lib/emails/onboarding";

describe("profileApprovedEmail", () => {
  it("returns subject and html with technician name", () => {
    const result = profileApprovedEmail("Mike Tuner");
    expect(result.subject).toBe("Your profile is live!");
    expect(result.html).toContain("Mike Tuner");
    expect(result.html).toContain("approved");
  });
});

describe("profileRejectedEmail", () => {
  it("returns subject and html with reason", () => {
    const result = profileRejectedEmail("Mike Tuner", "Please add a more detailed bio.");
    expect(result.subject).toBe("Your profile needs changes");
    expect(result.html).toContain("Mike Tuner");
    expect(result.html).toContain("Please add a more detailed bio.");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
nvm use 20 && npx vitest run __tests__/lib/emails/onboarding.test.ts
```

Expected: FAIL — module `@/lib/emails/onboarding` does not exist.

- [ ] **Step 3: Implement email content functions**

Create `src/lib/emails/onboarding.ts`:

```typescript
import { buildEmailHtml } from "@/lib/email";

export function profileApprovedEmail(technicianName: string): { subject: string; html: string } {
  return {
    subject: "Your profile is live!",
    html: buildEmailHtml("Your Profile Has Been Approved",
      `<p>Hi <strong>${technicianName}</strong>,</p>
      <p>Great news! Your technician profile has been approved and is now visible to customers in search results.</p>
      <p>Log in to your dashboard to manage your bookings, services, and availability.</p>`),
  };
}

export function profileRejectedEmail(technicianName: string, reason: string): { subject: string; html: string } {
  return {
    subject: "Your profile needs changes",
    html: buildEmailHtml("Your Profile Needs Changes",
      `<p>Hi <strong>${technicianName}</strong>,</p>
      <p>We've reviewed your profile and it needs some changes before it can go live.</p>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="font-weight:600;margin:0 0 4px;">Feedback:</p>
        <p style="margin:0;">${reason}</p>
      </div>
      <p>Please update your profile and resubmit for review.</p>`),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
nvm use 20 && npx vitest run __tests__/lib/emails/onboarding.test.ts
```

Expected: All 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/emails/onboarding.ts __tests__/lib/emails/onboarding.test.ts
git commit -m "feat: add onboarding approval/rejection email content"
```

---

### Task 6: Admin server actions

**Files:**
- Create: `src/actions/admin.ts`
- Create: `__tests__/actions/admin.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/actions/admin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockAdminSession,
  mockTechnicianSession,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn((heading: string, body: string) => `<html>${heading}${body}</html>`),
}));

import { getServerSession } from "next-auth";
import { sendEmail } from "@/lib/email";
import { approveSubmission, rejectSubmission, getPendingSubmissions } from "@/actions/admin";

const mockGetSession = vi.mocked(getServerSession);
const mockSendEmail = vi.mocked(sendEmail);

describe("approveSubmission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets isActive=true, isVerified=true, onboardingStatus=APPROVED and sends email", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "SUBMITTED",
      user: { name: "Mike Tuner", email: "tech@example.com" },
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});

    const result = await approveSubmission("tech-profile-1");

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: {
        isActive: true,
        isVerified: true,
        onboardingStatus: "APPROVED",
      },
    });
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail.mock.calls[0][0].to).toBe("tech@example.com");
  });

  it("rejects non-admin user", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    const result = await approveSubmission("tech-profile-1");
    expect(result.error).toContain("Unauthorized");
  });

  it("rejects if profile is not SUBMITTED", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      onboardingStatus: "APPROVED",
    });

    const result = await approveSubmission("tech-profile-1");
    expect(result.error).toBeDefined();
  });
});

describe("rejectSubmission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets onboardingStatus=REJECTED with reason and sends email", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "SUBMITTED",
      user: { name: "Mike Tuner", email: "tech@example.com" },
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});

    const result = await rejectSubmission("tech-profile-1", "Please add a more detailed bio.");

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: {
        onboardingStatus: "REJECTED",
        rejectionReason: "Please add a more detailed bio.",
      },
    });
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it("rejects empty reason", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    const result = await rejectSubmission("tech-profile-1", "");
    expect(result.error).toContain("reason");
  });
});

describe("getPendingSubmissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all SUBMITTED profiles", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.technicianProfile.findMany.mockResolvedValue([
      { id: "p1", onboardingStatus: "SUBMITTED", user: { name: "A", email: "a@test.com" } },
    ]);

    const result = await getPendingSubmissions();
    expect(result.submissions).toHaveLength(1);
    expect(prismaMock.technicianProfile.findMany).toHaveBeenCalledWith({
      where: { onboardingStatus: "SUBMITTED" },
      include: { user: { select: { name: true, email: true } }, services: true },
      orderBy: { updatedAt: "asc" },
    });
  });

  it("rejects non-admin user", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    const result = await getPendingSubmissions();
    expect(result.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
nvm use 20 && npx vitest run __tests__/actions/admin.test.ts
```

Expected: FAIL — module `@/actions/admin` does not exist.

- [ ] **Step 3: Implement admin actions**

Create `src/actions/admin.ts`:

```typescript
"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { ROLES, ONBOARDING_STATUS } from "@/lib/constants";
import { profileApprovedEmail, profileRejectedEmail } from "@/lib/emails/onboarding";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return { error: "Unauthorized" as const };
  }
  return { session };
}

export async function getPendingSubmissions() {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const submissions = await prisma.technicianProfile.findMany({
    where: { onboardingStatus: ONBOARDING_STATUS.SUBMITTED },
    include: { user: { select: { name: true, email: true } }, services: true },
    orderBy: { updatedAt: "asc" },
  });

  return { submissions };
}

export async function approveSubmission(profileId: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const profile = await prisma.technicianProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!profile) return { error: "Profile not found" };
  if (profile.onboardingStatus !== ONBOARDING_STATUS.SUBMITTED) {
    return { error: "Profile is not pending review" };
  }

  await prisma.technicianProfile.update({
    where: { id: profileId },
    data: {
      isActive: true,
      isVerified: true,
      onboardingStatus: ONBOARDING_STATUS.APPROVED,
    },
  });

  const email = profileApprovedEmail(profile.user.name ?? "Technician");
  await sendEmail({ to: profile.user.email!, subject: email.subject, html: email.html });

  revalidatePath("/dashboard/admin/submissions");
  return { success: true };
}

export async function rejectSubmission(profileId: string, reason: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  if (!reason.trim()) return { error: "A reason is required" };

  const profile = await prisma.technicianProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!profile) return { error: "Profile not found" };
  if (profile.onboardingStatus !== ONBOARDING_STATUS.SUBMITTED) {
    return { error: "Profile is not pending review" };
  }

  await prisma.technicianProfile.update({
    where: { id: profileId },
    data: {
      onboardingStatus: ONBOARDING_STATUS.REJECTED,
      rejectionReason: reason,
    },
  });

  const email = profileRejectedEmail(profile.user.name ?? "Technician", reason);
  await sendEmail({ to: profile.user.email!, subject: email.subject, html: email.html });

  revalidatePath("/dashboard/admin/submissions");
  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
nvm use 20 && npx vitest run __tests__/actions/admin.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/actions/admin.ts __tests__/actions/admin.test.ts
git commit -m "feat: add admin approve/reject actions with email notifications"
```

---

### Task 7: Route protection — admin routes and onboarding redirect

**Files:**
- Modify: `proxy.ts`
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add admin route protection to proxy.ts**

In `proxy.ts`, update the `config.matcher` to include the onboarding route and add admin route check. Replace the entire file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  const pathname = request.nextUrl.pathname;

  // Redirect technician-only routes for non-technicians
  if (pathname.startsWith("/dashboard/technician") && token.role !== "TECHNICIAN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect customer-only routes for non-customers
  if (pathname.startsWith("/dashboard/customer") && token.role !== "CUSTOMER") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect admin-only routes for non-admins
  if (pathname.startsWith("/dashboard/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Onboarding routes require TECHNICIAN role
  if (pathname.startsWith("/onboarding") && token.role !== "TECHNICIAN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
```

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat: add admin and onboarding route protection"
```

---

### Task 8: Onboarding wizard UI

**Files:**
- Create: `src/app/(auth)/onboarding/page.tsx`
- Create: `src/components/onboarding/wizard.tsx`
- Create: `src/components/onboarding/profile-step.tsx`
- Create: `src/components/onboarding/services-step.tsx`

- [ ] **Step 1: Create the profile step component**

Create `src/components/onboarding/profile-step.tsx`:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Props = {
  defaultValues: {
    bio: string;
    businessName: string;
    yearsExperience: number;
  };
  onNext: (data: FormData) => void;
  loading: boolean;
};

export function ProfileStep({ defaultValues, onNext, loading }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onNext(new FormData(e.currentTarget));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="bio">About You</Label>
        <Textarea
          id="bio"
          name="bio"
          required
          minLength={10}
          rows={4}
          placeholder="Tell customers about your experience, specialties, and approach..."
          defaultValue={defaultValues.bio}
        />
        <p className="text-xs text-muted-foreground">Minimum 10 characters</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessName">Business Name (optional)</Label>
        <Input
          id="businessName"
          name="businessName"
          placeholder="e.g. Mike's Piano Service"
          defaultValue={defaultValues.businessName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="yearsExperience">Years of Experience</Label>
        <Input
          id="yearsExperience"
          name="yearsExperience"
          type="number"
          min="0"
          max="100"
          required
          defaultValue={defaultValues.yearsExperience || ""}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create the services step component**

Create `src/components/onboarding/services-step.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createService, updateService, deleteService } from "@/actions/technician";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMin: number;
  isActive: boolean;
};

type Props = {
  initialServices: Service[];
  onComplete: () => void;
  loading: boolean;
};

export function ServicesStep({ initialServices, onComplete, loading }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  async function refreshServices() {
    const res = await fetch("/api/technician/services");
    const data = await res.json();
    setServices(data.services ?? []);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);

    const result = editingService
      ? await updateService(editingService.id, formData)
      : await createService(formData);

    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(editingService ? "Service updated" : "Service added");
      setDialogOpen(false);
      setEditingService(null);
      await refreshServices();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this service?")) return;
    await deleteService(id);
    toast.success("Service deleted");
    setServices((s) => s.filter((svc) => svc.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Review your services below. You can add, edit, or remove them.
        </p>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingService(null);
        }}>
          <DialogTrigger>
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input id="name" name="name" required defaultValue={editingService?.name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={editingService?.description ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input id="price" name="price" type="number" step="0.01" min="0" required
                    defaultValue={editingService ? (editingService.priceCents / 100).toFixed(2) : ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationMin">Duration (min)</Label>
                  <Input id="durationMin" name="durationMin" type="number" min="15" step="15" required
                    defaultValue={editingService?.durationMin ?? ""} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : editingService ? "Update" : "Add Service"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-muted-foreground">No services yet. Add at least one service.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => (
            <div key={svc.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <p className="font-medium text-slate-900">{svc.name}</p>
                {svc.description && <p className="text-sm text-muted-foreground">{svc.description}</p>}
                <p className="mt-1 text-sm text-slate-500">
                  ${(svc.priceCents / 100).toFixed(2)} &middot; {svc.durationMin} min
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => { setEditingService(svc); setDialogOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(svc.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button onClick={onComplete} className="w-full" disabled={services.length === 0 || loading}>
        {loading ? "Finishing..." : "Complete Setup"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create the wizard component**

Create `src/components/onboarding/wizard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileStep } from "./profile-step";
import { ServicesStep } from "./services-step";
import { completeWizard } from "@/actions/onboarding";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMin: number;
  isActive: boolean;
};

type Props = {
  profile: {
    bio: string | null;
    businessName: string | null;
    yearsExperience: number | null;
  };
  services: Service[];
};

const STEPS = ["Profile Details", "Services & Pricing"];

export function OnboardingWizard({ profile, services }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<FormData | null>(null);

  async function handleProfileNext(formData: FormData) {
    setProfileData(formData);
    setStep(1);
  }

  async function handleComplete() {
    if (!profileData) {
      toast.error("Please complete the profile step first");
      setStep(0);
      return;
    }

    setLoading(true);
    const result = await completeWizard(profileData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      if (result.error.includes("Bio")) setStep(0);
    } else {
      toast.success("Setup complete!");
      router.push("/dashboard/technician");
    }
  }

  return (
    <div className="w-full max-w-lg">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-500 mb-2">
          {STEPS.map((label, i) => (
            <span key={label} className={i <= step ? "font-medium text-slate-900" : ""}>
              {label}
            </span>
          ))}
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-amber-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      {step === 0 && (
        <ProfileStep
          defaultValues={{
            bio: profile.bio ?? "",
            businessName: profile.businessName ?? "",
            yearsExperience: profile.yearsExperience ?? 0,
          }}
          onNext={handleProfileNext}
          loading={false}
        />
      )}
      {step === 1 && (
        <ServicesStep
          initialServices={services}
          onComplete={handleComplete}
          loading={loading}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the onboarding page**

Create `src/app/(auth)/onboarding/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
    include: { services: { where: { isActive: true } } },
  });

  if (!profile) redirect("/sign-up/technician");
  if (profile.onboardingStatus !== "WIZARD_PENDING") redirect("/dashboard/technician");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Complete Your Profile</h1>
      <p className="mb-8 text-sm text-slate-500">
        Just a few more details before you can start receiving bookings.
      </p>
      <OnboardingWizard
        profile={{
          bio: profile.bio,
          businessName: profile.businessName,
          yearsExperience: profile.yearsExperience,
        }}
        services={profile.services}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify it builds**

```bash
nvm use 20 && npx next build 2>&1 | tail -20
```

Expected: Build succeeds (or at least the onboarding page compiles without errors).

- [ ] **Step 6: Commit**

```bash
git add src/app/\(auth\)/onboarding/page.tsx src/components/onboarding/wizard.tsx src/components/onboarding/profile-step.tsx src/components/onboarding/services-step.tsx
git commit -m "feat: add onboarding wizard with profile and services steps"
```

---

### Task 9: Onboarding dashboard banner

**Files:**
- Create: `src/components/onboarding/banner.tsx`
- Modify: `src/app/(dashboard)/dashboard/technician/page.tsx`

- [ ] **Step 1: Create the banner component**

Create `src/components/onboarding/banner.tsx`:

```tsx
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { ONBOARDING_STATUS } from "@/lib/constants";

type Props = {
  onboardingStatus: string;
  hasAvailability: boolean;
  rejectionReason: string | null;
};

type Step = {
  label: string;
  done: boolean;
  href?: string;
};

export function OnboardingBanner({ onboardingStatus, hasAvailability, rejectionReason }: Props) {
  if (onboardingStatus === ONBOARDING_STATUS.APPROVED) return null;

  const steps: Step[] = [
    { label: "Profile details", done: true },
    { label: "Services & pricing", done: true },
    { label: "Set availability", done: hasAvailability, href: "/dashboard/technician/availability" },
    { label: "Submit for review", done: onboardingStatus === ONBOARDING_STATUS.SUBMITTED, href: "/onboarding/submit" },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  if (onboardingStatus === ONBOARDING_STATUS.SUBMITTED) {
    return (
      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="font-medium text-blue-900">Profile under review</p>
        <p className="mt-1 text-sm text-blue-700">
          We're reviewing your profile. You'll receive an email once it's approved.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
      {onboardingStatus === ONBOARDING_STATUS.REJECTED && rejectionReason && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-900">Changes requested</p>
          <p className="mt-1 text-sm text-red-700">{rejectionReason}</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium text-amber-900">Complete your profile to appear in search</p>
        <span className="text-sm text-amber-700">{doneCount} of {steps.length} steps done</span>
      </div>
      <div className="mb-3 h-2 rounded-full bg-amber-200">
        <div
          className="h-2 rounded-full bg-amber-500 transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        {steps.map((step) => (
          <span key={step.label} className="flex items-center gap-1.5 text-sm">
            {step.done ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-green-700">{step.label}</span>
              </>
            ) : step.href ? (
              <Link href={step.href} className="flex items-center gap-1.5 text-slate-600 underline hover:text-slate-900">
                <Circle className="h-4 w-4" />
                {step.label}
              </Link>
            ) : (
              <>
                <Circle className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">{step.label}</span>
              </>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add banner to the technician dashboard**

In `src/app/(dashboard)/dashboard/technician/page.tsx`, add import at the top:

```typescript
import { OnboardingBanner } from "@/components/onboarding/banner";
import { ONBOARDING_STATUS } from "@/lib/constants";
```

After the profile is fetched (line 25), redirect to onboarding if `WIZARD_PENDING`:

```typescript
  if (!profile) redirect("/dashboard");
  if (profile.onboardingStatus === ONBOARDING_STATUS.WIZARD_PENDING) redirect("/onboarding");
```

Fetch availability count for the banner (add to the `Promise.all` array):

```typescript
  const [todayCount, pendingCount, revenueAgg, reviewAgg, availabilityCount] =
    await Promise.all([
      // ... existing queries ...
      prisma.availabilitySlot.count({
        where: { technicianId: profile.id },
      }),
    ]);
```

Add the banner just before the stat cards in the JSX:

```tsx
      {/* Onboarding Banner */}
      <OnboardingBanner
        onboardingStatus={profile.onboardingStatus}
        hasAvailability={availabilityCount > 0}
        rejectionReason={profile.rejectionReason}
      />
```

- [ ] **Step 3: Run tests to confirm nothing broke**

```bash
nvm use 20 && npm run test:run
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/banner.tsx src/app/\(dashboard\)/dashboard/technician/page.tsx
git commit -m "feat: add onboarding progress banner to technician dashboard"
```

---

### Task 10: Submit for review page

**Files:**
- Create: `src/app/(auth)/onboarding/submit/page.tsx`

- [ ] **Step 1: Create the submit page**

Create `src/app/(auth)/onboarding/submit/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ONBOARDING_STATUS } from "@/lib/constants";
import { SubmitForm } from "./submit-form";

export default async function SubmitPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      services: { where: { isActive: true } },
      availabilitySlots: true,
    },
  });

  if (!profile) redirect("/sign-up/technician");

  const allowed = [ONBOARDING_STATUS.CHECKLIST_PENDING, ONBOARDING_STATUS.REJECTED];
  if (!allowed.includes(profile.onboardingStatus)) redirect("/dashboard/technician");

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full max-w-lg">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Review & Submit</h1>
      <p className="mb-8 text-sm text-slate-500">
        Review your profile below. Once submitted, an admin will review it.
      </p>

      {profile.rejectionReason && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-900">Previous feedback</p>
          <p className="mt-1 text-sm text-red-700">{profile.rejectionReason}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Profile</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Name</dt>
              <dd className="text-slate-900">{profile.user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Location</dt>
              <dd className="text-slate-900">{profile.city}, {profile.state}</dd>
            </div>
            {profile.businessName && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Business</dt>
                <dd className="text-slate-900">{profile.businessName}</dd>
              </div>
            )}
            {profile.yearsExperience != null && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Experience</dt>
                <dd className="text-slate-900">{profile.yearsExperience} years</dd>
              </div>
            )}
            {profile.bio && (
              <div>
                <dt className="text-slate-500 mb-1">Bio</dt>
                <dd className="text-slate-900">{profile.bio}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Services ({profile.services.length})</h3>
          {profile.services.length === 0 ? (
            <p className="text-sm text-slate-500">No services added yet.</p>
          ) : (
            <ul className="space-y-2">
              {profile.services.map((svc) => (
                <li key={svc.id} className="flex justify-between text-sm">
                  <span className="text-slate-900">{svc.name}</span>
                  <span className="text-slate-500">${(svc.priceCents / 100).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Availability</h3>
          {profile.availabilitySlots.length === 0 ? (
            <p className="text-sm text-slate-500">No availability set (you can add this later).</p>
          ) : (
            <ul className="space-y-1">
              {profile.availabilitySlots
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((slot) => (
                  <li key={slot.id} className="flex justify-between text-sm">
                    <span className="text-slate-900">{dayNames[slot.dayOfWeek]}</span>
                    <span className="text-slate-500">{slot.startTime} - {slot.endTime}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <SubmitForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the submit form client component**

Create `src/app/(auth)/onboarding/submit/submit-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitForReview } from "@/actions/onboarding";
import { toast } from "sonner";

export function SubmitForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    const result = await submitForReview();
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile submitted for review!");
      router.push("/dashboard/technician");
    }
  }

  return (
    <Button onClick={handleSubmit} className="w-full" disabled={loading}>
      {loading ? "Submitting..." : "Submit for Review"}
    </Button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/onboarding/submit/page.tsx src/app/\(auth\)/onboarding/submit/submit-form.tsx
git commit -m "feat: add submit for review page with profile summary"
```

---

### Task 11: Admin submissions page

**Files:**
- Create: `src/app/(dashboard)/dashboard/admin/submissions/page.tsx`
- Create: `src/components/admin/submission-card.tsx`

- [ ] **Step 1: Create the submission card component**

Create `src/components/admin/submission-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveSubmission, rejectSubmission } from "@/actions/admin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  priceCents: number;
  durationMin: number;
};

type Props = {
  profile: {
    id: string;
    bio: string | null;
    businessName: string | null;
    yearsExperience: number | null;
    city: string | null;
    state: string | null;
    ptgMember: boolean;
    user: { name: string | null; email: string | null };
    services: Service[];
  };
};

export function SubmissionCard({ profile }: Props) {
  const router = useRouter();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    const result = await approveSubmission(profile.id);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Approved ${profile.user.name}`);
      router.refresh();
    }
  }

  async function handleReject() {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    setLoading(true);
    const result = await rejectSubmission(profile.id, reason);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Rejected ${profile.user.name}`);
      router.refresh();
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{profile.user.name}</h3>
          <p className="text-sm text-slate-500">{profile.user.email}</p>
        </div>
        {profile.ptgMember && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            PTG Member
          </span>
        )}
      </div>

      <dl className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <dt className="text-slate-500">Location</dt>
          <dd className="text-slate-900">{profile.city}, {profile.state}</dd>
        </div>
        {profile.businessName && (
          <div className="flex justify-between">
            <dt className="text-slate-500">Business</dt>
            <dd className="text-slate-900">{profile.businessName}</dd>
          </div>
        )}
        {profile.yearsExperience != null && (
          <div className="flex justify-between">
            <dt className="text-slate-500">Experience</dt>
            <dd className="text-slate-900">{profile.yearsExperience} years</dd>
          </div>
        )}
      </dl>

      {profile.bio && (
        <div className="mb-4">
          <p className="text-sm text-slate-500 mb-1">Bio</p>
          <p className="text-sm text-slate-900">{profile.bio}</p>
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-slate-500 mb-2">Services ({profile.services.length})</p>
        <div className="flex flex-wrap gap-2">
          {profile.services.map((svc) => (
            <span key={svc.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {svc.name} — ${(svc.priceCents / 100).toFixed(2)}
            </span>
          ))}
        </div>
      </div>

      {showReject ? (
        <div className="space-y-3">
          <Textarea
            placeholder="Explain what changes are needed..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleReject} disabled={loading} className="flex-1">
              {loading ? "Rejecting..." : "Send Rejection"}
            </Button>
            <Button variant="outline" onClick={() => setShowReject(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button onClick={handleApprove} disabled={loading} className="flex-1">
            {loading ? "Approving..." : "Approve"}
          </Button>
          <Button variant="outline" onClick={() => setShowReject(true)} disabled={loading}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the admin submissions page**

Create `src/app/(dashboard)/dashboard/admin/submissions/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getPendingSubmissions } from "@/actions/admin";
import { SubmissionCard } from "@/components/admin/submission-card";
import { ClipboardCheck } from "lucide-react";

export default async function AdminSubmissionsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== ROLES.ADMIN) redirect("/dashboard");

  const result = await getPendingSubmissions();
  if (result.error) redirect("/dashboard");

  const submissions = result.submissions ?? [];

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Technician Submissions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and approve technician profiles
        </p>
      </div>

      <div className="mt-8">
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ClipboardCheck className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">No pending submissions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((profile) => (
              <SubmissionCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/admin/submissions/page.tsx src/components/admin/submission-card.tsx
git commit -m "feat: add admin submissions page with approve/reject"
```

---

### Task 12: Update technician signup redirect

**Files:**
- Modify: `src/app/(auth)/sign-up/technician/page.tsx`

- [ ] **Step 1: Update the signup form to redirect to /onboarding**

In `src/app/(auth)/sign-up/technician/page.tsx`, find the form submission handler where it checks `result.success` and change the redirect from `/dashboard/technician` to `/onboarding`:

Find:
```typescript
router.push("/dashboard/technician");
```

Replace with:
```typescript
router.push("/onboarding");
```

- [ ] **Step 2: Run all tests**

```bash
nvm use 20 && npm run test:run
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/sign-up/technician/page.tsx
git commit -m "feat: redirect technician signup to onboarding wizard"
```

---

### Task 13: End-to-end verification

- [ ] **Step 1: Re-seed the database and start the dev server**

```bash
nvm use 20 && npx prisma migrate dev && npx prisma db seed && npm run dev
```

- [ ] **Step 2: Manual verification checklist**

Test these flows manually:

1. Sign up as a new technician at `/sign-up/technician` → should redirect to `/onboarding`
2. Complete the wizard (fill profile, review services) → should redirect to `/dashboard/technician` with banner
3. Visit `/dashboard/technician/availability` → set some hours
4. Click "Submit for review" in the banner → redirects to `/onboarding/submit`
5. Submit → banner changes to "Profile under review"
6. Log in as admin (`admin@example.com` / `password123`) → visit `/dashboard/admin/submissions`
7. Approve the submission → technician gets email (check console in dev)
8. Log back in as technician → banner should be gone, profile visible in `/search`

- [ ] **Step 3: Run full test suite**

```bash
nvm use 20 && npm run test:run
```

Expected: All tests pass.

- [ ] **Step 4: Commit any fixes needed**

If any fixes were needed during manual verification, commit them.
