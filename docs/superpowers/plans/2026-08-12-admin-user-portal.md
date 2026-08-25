# Admin User Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin pages to inspect any tuner/customer account with suspend/reactivate, resend-verification, and password-reset actions, plus a public forgot-password flow.

**Architecture:** Extends the existing gated `/dashboard/admin/*` area (proxy.ts gate + `requireAdmin()` in `src/actions/admin.ts`). One migration adds `User.suspendedAt` and a `PasswordResetToken` model. Suspension is enforced at two chokepoints: sign-in (`src/lib/auth.ts`) and technician search (`src/lib/queries/technicians.ts`). Spec: `docs/superpowers/specs/2026-08-12-admin-user-portal-design.md`.

**Tech Stack:** Next.js 16.2 App Router, React 19, Prisma 7 (SQLite via better-sqlite3 adapter), NextAuth v4 (JWT strategy), Zod v4, Vitest (mocked Prisma), Playwright, Resend (lazy-init, console fallback), Tailwind 4 + shadcn base-nova.

## Global Constraints

- **FIRST in every shell:** `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"` (default node 24 breaks better-sqlite3).
- All work on branch `feature/admin-user-portal` (created in Task 1), from `security/audit-2026-07-15`.
- Run from `piano-finder/`. Unit tests: `npm run test:run`. Never `git push` (orchestrator/human owns the push; Husky gate enforces lint + unit + coverage ≥90% + build).
- Zod v4: error access is `.issues[0].message`, never `.errors[0]`.
- Prisma 7: import from `@/generated/prisma/client`; after schema change run `npm run db:migrate`.
- Server actions return `{ error: string }` or `{ success: true, ... }` — never throw to the client (existing pattern in `src/actions/admin.ts`).
- UI copy in plain language, no jargon or raw errors (non-technical users).
- shadcn base-nova: **no `asChild`**; `DropdownMenuItem` uses `onClick` + `router.push()`.
- Dates in tests: construct locally — `new Date(2026, 3, 14, 9, 0)` — never `new Date("yyyy-mm-dd")`.
- No new dependencies.

---

### Task 1: Branch, schema migration, test-mock plumbing

**Files:**
- Modify: `prisma/schema.prisma` (User model ~line 12; after VerificationToken ~line 69)
- Modify: `__tests__/helpers/mocks.ts` (model list ~line 23-37)

**Interfaces:**
- Produces: `User.suspendedAt: Date | null`; model `PasswordResetToken { identifier, token, expires }`; `prismaMock.passwordResetToken` available in all tests.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feature/admin-user-portal
```

- [ ] **Step 2: Add `suspendedAt` to User and the PasswordResetToken model**

In `prisma/schema.prisma`, inside `model User`, after `role`:

```prisma
  suspendedAt    DateTime? // null = active; set = hidden from search + blocked from sign-in
```

After `model VerificationToken` block:

```prisma
model PasswordResetToken {
  identifier String   // user email
  token      String   @unique // sha256 hash of the emailed token
  expires    DateTime

  @@unique([identifier, token])
}
```

- [ ] **Step 3: Run the migration**

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm run db:migrate -- --name admin_portal_suspension_and_password_reset
```

Expected: migration applied, client regenerated. (If prompted for a name interactively, use the same name.)

- [ ] **Step 4: Add the mock model**

In `__tests__/helpers/mocks.ts`, next to `verificationToken: createMockModel(),` add:

```ts
  passwordResetToken: createMockModel(),
```

- [ ] **Step 5: Verify nothing broke**

```bash
npx tsc --noEmit && npm run test:run
```

Expected: clean tsc, 358 tests pass.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations __tests__/helpers/mocks.ts
git commit -m "feat: add User.suspendedAt and PasswordResetToken model"
```

---

### Task 2: Block suspended users at sign-in

**Files:**
- Modify: `src/lib/auth.ts` (authorize ~line 23-49, signIn callback ~line 61-73, jwt callback ~line 74-81)
- Modify: `src/types/next-auth.d.ts` (JWT interface)
- Modify: `proxy.ts` (after the `if (!token)` block, ~line 41)
- Modify: `src/app/(auth)/sign-in/page.tsx` (error handling in `handleSubmit`, ~line 30-33)
- Test: `__tests__/lib/auth.test.ts` (create if absent; if an auth test file already exists, add to it)

**Interfaces:**
- Consumes: `User.suspendedAt` from Task 1.
- Produces: credentials `authorize()` throws `Error("SUSPENDED")` for suspended users; `signIn` callback returns `false` for suspended Google users; JWT gains `suspended?: boolean` and `suspendedCheckedAt?: number`, re-checked against the DB every 15 minutes; proxy redirects suspended sessions to `/sign-in?error=suspended`.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("bcryptjs", () => ({ compare: vi.fn().mockResolvedValue(true) }));

import { authOptions } from "@/lib/auth";
import type { CredentialsConfig } from "next-auth/providers/credentials";

const credentialsProvider = authOptions.providers.find(
  (p) => p.id === "credentials"
) as CredentialsConfig;

const baseUser = {
  id: "u1",
  email: "tech@example.com",
  name: "Tech",
  image: null,
  role: "TECHNICIAN",
  emailVerified: new Date(2026, 0, 1),
  hashedPassword: "hashed",
  suspendedAt: null as Date | null,
};

describe("authorize with suspension", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the user when not suspended", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseUser);
    const result = await credentialsProvider.authorize!(
      { email: "tech@example.com", password: "password123" },
      {} as never
    );
    expect(result).toMatchObject({ id: "u1", role: "TECHNICIAN" });
  });

  it("throws SUSPENDED for a suspended user with a valid password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...baseUser,
      suspendedAt: new Date(2026, 7, 1),
    });
    await expect(
      credentialsProvider.authorize!(
        { email: "tech@example.com", password: "password123" },
        {} as never
      )
    ).rejects.toThrow("SUSPENDED");
  });
});

describe("signIn callback with suspension", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks a suspended Google user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...baseUser,
      suspendedAt: new Date(2026, 7, 1),
    });
    const allowed = await authOptions.callbacks!.signIn!({
      user: { id: "u1" },
      account: { provider: "google" },
    } as never);
    expect(allowed).toBe(false);
  });

  it("allows an active Google user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseUser);
    const allowed = await authOptions.callbacks!.signIn!({
      user: { id: "u1" },
      account: { provider: "google" },
    } as never);
    expect(allowed).toBe(true);
  });
});

describe("jwt callback suspension re-check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks the token suspended on periodic re-check", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...baseUser,
      suspendedAt: new Date(2026, 7, 1),
    });
    // suspendedCheckedAt far in the past forces a re-check
    const token = await authOptions.callbacks!.jwt!({
      token: { id: "u1", role: "TECHNICIAN", emailVerified: null, suspendedCheckedAt: 0 },
    } as never);
    expect(token.suspended).toBe(true);
  });

  it("does not query the DB when the check is fresh", async () => {
    const token = await authOptions.callbacks!.jwt!({
      token: {
        id: "u1",
        role: "TECHNICIAN",
        emailVerified: null,
        suspended: false,
        suspendedCheckedAt: Date.now(),
      },
    } as never);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(token.suspended).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/auth.test.ts
```

Expected: FAIL — authorize resolves instead of throwing; signIn returns true; `token.suspended` undefined.

- [ ] **Step 3: Implement in `src/lib/auth.ts`**

In `authorize()`, after the password check (`if (!isValid) return null;`), add:

```ts
        if (user.suspendedAt) {
          // Surfaced to the sign-in page as result.error === "SUSPENDED"
          throw new Error("SUSPENDED");
        }
```

Replace the `signIn` callback body with:

```ts
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser?.suspendedAt) return false;
        // Auto-verify OAuth users — the provider already verified their email
        if (dbUser && !dbUser.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }
      }
      return true;
    },
```

Replace the `jwt` callback with:

```ts
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = user.emailVerified ?? null;
        token.suspended = false;
        token.suspendedCheckedAt = Date.now();
        return token;
      }
      // Re-check suspension against the DB at most every 15 minutes
      const RECHECK_MS = 15 * 60 * 1000;
      const checkedAt = token.suspendedCheckedAt ?? 0;
      if (Date.now() - checkedAt > RECHECK_MS) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { suspendedAt: true },
        });
        token.suspended = Boolean(dbUser?.suspendedAt);
        token.suspendedCheckedAt = Date.now();
      }
      return token;
    },
```

- [ ] **Step 4: Extend the JWT type**

In `src/types/next-auth.d.ts`, inside `declare module "next-auth/jwt"`'s `interface JWT`, add:

```ts
    suspended?: boolean;
    suspendedCheckedAt?: number;
```

- [ ] **Step 5: Eject suspended sessions in `proxy.ts`**

After the `if (!token) { ... }` block, add:

```ts
  // Suspended accounts are signed out of protected areas
  if (token.suspended) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("error", "suspended");
    return NextResponse.redirect(signInUrl);
  }
```

(`/sign-in` is outside the protected-path check above, so this cannot loop.)

- [ ] **Step 6: Plain-language message on the sign-in page**

In `src/app/(auth)/sign-in/page.tsx`:

Add imports/hooks (the file is already `"use client"`; `useRouter` is already imported from `next/navigation`):

```ts
import { useRouter, useSearchParams } from "next/navigation";
```

Inside the component, before the state hooks:

```ts
  const searchParams = useSearchParams();
  const suspendedParam = searchParams.get("error") === "suspended";
```

Initialize error state from it:

```ts
  const [error, setError] = useState<string | null>(
    suspendedParam
      ? "This account has been suspended. Please contact support."
      : null
  );
```

Replace the error branch in `handleSubmit`:

```ts
    if (result?.error) {
      setError(
        result.error === "SUSPENDED"
          ? "This account has been suspended. Please contact support."
          : "Invalid email or password"
      );
      return;
    }
```

Note: Next.js requires `useSearchParams` under a Suspense boundary during prerender. The `(auth)` pages are client components — if `npm run build` complains about `/sign-in`, wrap the page's default export: rename the current component to `SignInForm` and export `export default function SignInPage() { return <Suspense><SignInForm /></Suspense>; }` with `import { Suspense } from "react"`.

- [ ] **Step 7: Run the tests**

```bash
npx vitest run __tests__/lib/auth.test.ts && npx tsc --noEmit
```

Expected: PASS, clean tsc.

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth.ts src/types/next-auth.d.ts proxy.ts "src/app/(auth)/sign-in/page.tsx" __tests__/lib/auth.test.ts
git commit -m "feat: block suspended users at sign-in and in active sessions"
```

---

### Task 3: Hide suspended tuners from search and direct links

**Files:**
- Modify: `src/lib/queries/technicians.ts` (`searchTechnicians` where-clause; `getTechnicianById`)
- Test: `__tests__/lib/queries/technicians.test.ts` (add to existing `searchTechnicians` and `getTechnicianById` describes)

**Interfaces:**
- Consumes: `User.suspendedAt` from Task 1.
- Produces: `searchTechnicians` filters `user: { suspendedAt: null }`; `getTechnicianById` returns `null` for suspended tuners.

- [ ] **Step 1: Write the failing tests**

In `__tests__/lib/queries/technicians.test.ts`, add to the `searchTechnicians` describe:

```ts
  it("excludes suspended technicians via the where clause", async () => {
    prismaMock.technicianProfile.findMany.mockResolvedValue([]);
    await searchTechnicians({});
    expect(prismaMock.technicianProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: expect.objectContaining({ suspendedAt: null }),
        }),
      })
    );
  });
```

Add to the `getTechnicianById` describe:

```ts
  it("returns null for a suspended technician", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      user: {
        name: "Suspended Tech",
        image: null,
        email: "s@example.com",
        suspendedAt: new Date(2026, 7, 1),
      },
      services: [],
      availabilitySlots: [],
    });
    const result = await getTechnicianById("tech-profile-1");
    expect(result).toBeNull();
  });
```

- [ ] **Step 2: Run to verify they fail**

```bash
npx vitest run __tests__/lib/queries/technicians.test.ts
```

Expected: FAIL — where clause lacks `user`, suspended profile returned non-null.

- [ ] **Step 3: Implement**

In `searchTechnicians`, the `where` object currently includes filters like `isActive`/`onboardingStatus` — merge into it (check the actual object at `src/lib/queries/technicians.ts:~110-150`):

```ts
      user: { suspendedAt: null },
```

If the existing `where` already has a `user` key for name search, merge: `user: { suspendedAt: null, ...existingUserFilter }`.

In `getTechnicianById`, ensure the `user` select includes `suspendedAt`, and after the null check add:

```ts
  if (profile.user.suspendedAt) return null;
```

If `user` is selected with specific fields, add `suspendedAt: true` to that select. Strip `suspendedAt` from the returned object if the existing return shape spreads `profile.user` into a public payload (do not leak it to the public profile page): destructure it out before returning.

- [ ] **Step 4: Run the full file**

```bash
npx vitest run __tests__/lib/queries/technicians.test.ts && npx tsc --noEmit
```

Expected: all pass (21 tests), clean tsc.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/technicians.ts __tests__/lib/queries/technicians.test.ts
git commit -m "feat: hide suspended technicians from search and profile pages"
```

---

### Task 4: Password-reset server actions + email template

**Files:**
- Modify: `src/actions/auth.ts` (append two actions)
- Create: `src/lib/emails/passwordReset.ts`
- Modify: `src/lib/validations/auth.ts` (add `resetPasswordSchema`)
- Test: `__tests__/actions/auth-password-reset.test.ts`

**Interfaces:**
- Consumes: `PasswordResetToken` model + mock (Task 1); `sendEmail`/`buildEmailHtml` from `src/lib/email.ts`.
- Produces: `requestPasswordReset(email: string): Promise<{ success: true } | { error: string }>` (always `{ success: true }` for unknown emails); `resetPassword(token: string, password: string, confirmPassword: string): Promise<{ success: true } | { error: string }>`; `passwordResetEmail(resetUrl: string): { subject: string; html: string }`.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/actions/auth-password-reset.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";
import { prismaMock } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  buildEmailHtml: vi.fn().mockReturnValue("<html></html>"),
}));

import { sendEmail } from "@/lib/email";
import { requestPasswordReset, resetPassword } from "@/actions/auth";

describe("requestPasswordReset", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns silent success for an unknown email (no enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const result = await requestPasswordReset("nobody@example.com");
    expect(result).toEqual({ success: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("creates a hashed single token and emails the raw token link", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "tech@example.com",
    });
    prismaMock.passwordResetToken.findFirst.mockResolvedValue(null);

    const result = await requestPasswordReset("tech@example.com");
    expect(result).toEqual({ success: true });
    expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "tech@example.com" },
    });

    const created = prismaMock.passwordResetToken.create.mock.calls[0][0].data;
    const emailedUrl = vi.mocked(sendEmail).mock.calls[0][0].html;
    // The stored token is the sha256 of the raw token in the emailed link
    const rawToken = /reset-password\/([a-f0-9-]+)/.exec(
      vi.mocked(sendEmail).mock.calls[0][0].html
    )?.[1];
    expect(rawToken).toBeTruthy();
    expect(created.token).toBe(
      createHash("sha256").update(rawToken!).digest("hex")
    );
    expect(created.token).not.toBe(rawToken); // never store the raw token
    expect(emailedUrl).toContain(rawToken);
  });

  it("rate limits repeat requests within 60 seconds", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "tech@example.com",
    });
    prismaMock.passwordResetToken.findFirst.mockResolvedValue({
      identifier: "tech@example.com",
      token: "existing",
      expires: new Date(Date.now() + 60 * 60 * 1000),
    });
    const result = await requestPasswordReset("tech@example.com");
    expect(result).toEqual({ success: true }); // still silent
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("resetPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  const validToken = {
    identifier: "tech@example.com",
    token: createHash("sha256").update("raw-token").digest("hex"),
    expires: new Date(Date.now() + 30 * 60 * 1000),
  };

  it("rejects an unknown or expired token", async () => {
    prismaMock.passwordResetToken.findFirst.mockResolvedValue(null);
    const result = await resetPassword("raw-token", "newpassword1", "newpassword1");
    expect(result).toEqual({
      error: "This link has expired. Please request a new one.",
    });
  });

  it("rejects mismatched passwords", async () => {
    const result = await resetPassword("raw-token", "newpassword1", "different1");
    expect("error" in result).toBe(true);
  });

  it("rejects passwords under 8 characters", async () => {
    const result = await resetPassword("raw-token", "short", "short");
    expect("error" in result).toBe(true);
  });

  it("hashes the new password and deletes the token (single use)", async () => {
    prismaMock.passwordResetToken.findFirst.mockResolvedValue(validToken);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "tech@example.com",
    });

    const result = await resetPassword("raw-token", "newpassword1", "newpassword1");
    expect(result).toEqual({ success: true });

    const update = prismaMock.user.update.mock.calls[0][0];
    expect(update.where).toEqual({ email: "tech@example.com" });
    expect(update.data.hashedPassword).toBeTruthy();
    expect(update.data.hashedPassword).not.toBe("newpassword1"); // bcrypt-hashed
    expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "tech@example.com" },
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run __tests__/actions/auth-password-reset.test.ts
```

Expected: FAIL — `requestPasswordReset` / `resetPassword` not exported.

- [ ] **Step 3: Implement the email template**

Create `src/lib/emails/passwordReset.ts` (mirrors `src/lib/emails/onboarding.ts` style):

```ts
import { buildEmailHtml } from "@/lib/email";

export function passwordResetEmail(resetUrl: string): {
  subject: string;
  html: string;
} {
  return {
    subject: "Reset your BookATuner password",
    html: buildEmailHtml(
      "Reset your password",
      `<p>Someone asked to reset the password for your BookATuner account. If this was you, click the button below. The link works for 1 hour.</p>
       <p style="text-align:center;margin:24px 0;">
         <a href="${resetUrl}" style="background:#1e293b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Choose a new password</a>
       </p>
       <p>If you didn't ask for this, you can ignore this email — your password won't change.</p>`
    ),
  };
}
```

- [ ] **Step 4: Add the validation schema**

In `src/lib/validations/auth.ts`, add:

```ts
export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
```

- [ ] **Step 5: Implement the actions**

Append to `src/actions/auth.ts` (file already has `"use server"`, `randomUUID`, `hash`, `prisma`, `sendEmail` imports; add `createHash` to the crypto import and import `passwordResetEmail` + `resetPasswordSchema`):

```ts
import { randomUUID, createHash } from "crypto";
import { passwordResetEmail } from "@/lib/emails/passwordReset";
import { resetPasswordSchema } from "@/lib/validations/auth";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Silent success either way — never reveal whether an account exists
  if (!user) return { success: true as const };

  // Rate limit: a token expiring >59 min from now was created <60s ago
  const rateLimitThreshold = new Date(Date.now() + 59 * 60 * 1000);
  const recentToken = await prisma.passwordResetToken.findFirst({
    where: { identifier: email, expires: { gt: rateLimitThreshold } },
  });
  if (recentToken) return { success: true as const };

  await prisma.passwordResetToken.deleteMany({ where: { identifier: email } });

  const rawToken = randomUUID();
  await prisma.passwordResetToken.create({
    data: {
      identifier: email,
      token: createHash("sha256").update(rawToken).digest("hex"),
      expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const { subject, html } = passwordResetEmail(
    `${baseUrl}/reset-password/${rawToken}`
  );
  await sendEmail({ to: email, subject, html });

  return { success: true as const };
}

export async function resetPassword(
  token: string,
  password: string,
  confirmPassword: string
) {
  const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const hashedToken = createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findFirst({
    where: { token: hashedToken, expires: { gt: new Date() } },
  });
  if (!record) {
    return { error: "This link has expired. Please request a new one." };
  }

  const hashedPassword = await hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { email: record.identifier },
    data: { hashedPassword },
  });
  // Single use: remove all reset tokens for this account
  await prisma.passwordResetToken.deleteMany({
    where: { identifier: record.identifier },
  });

  return { success: true as const };
}
```

- [ ] **Step 6: Run the tests**

```bash
npx vitest run __tests__/actions/auth-password-reset.test.ts && npx tsc --noEmit
```

Expected: PASS, clean tsc.

- [ ] **Step 7: Commit**

```bash
git add src/actions/auth.ts src/lib/emails/passwordReset.ts src/lib/validations/auth.ts __tests__/actions/auth-password-reset.test.ts
git commit -m "feat: password reset actions with hashed single-use tokens"
```

---

### Task 5: Public forgot-password and reset-password pages

**Files:**
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/reset-password/[token]/page.tsx`
- Modify: `src/app/(auth)/sign-in/page.tsx` (add "Forgot password?" link near the password field/submit)

**Interfaces:**
- Consumes: `requestPasswordReset`, `resetPassword` from Task 4.
- Produces: user-facing flow at `/forgot-password` and `/reset-password/[token]`.

- [ ] **Step 1: Create `/forgot-password`**

`src/app/(auth)/forgot-password/page.tsx` — client component matching the sign-in card style (same wrapper classes as `sign-in/page.tsx`):

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { requestPasswordReset } from "@/actions/auth";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const email = new FormData(e.currentTarget).get("email") as string;
    await requestPasswordReset(email);
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-sm border border-border">
      <h1 className="text-xl font-bold text-foreground">Forgot your password?</h1>
      {sent ? (
        <p className="mt-4 text-sm text-muted-foreground">
          If an account exists with that email, we&apos;ve sent a link to choose
          a new password. Check your inbox.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to choose a new one.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-ring">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `/reset-password/[token]`**

`src/app/(auth)/reset-password/[token]/page.tsx` (Next 16: `params` is a Promise; client page uses React's `use()` to unwrap):

```tsx
"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { resetPassword } from "@/actions/auth";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await resetPassword(
      token,
      formData.get("password") as string,
      formData.get("confirmPassword") as string
    );
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.push("/sign-in?reset=success");
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-sm border border-border">
      <h1 className="text-xl font-bold text-foreground">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}{" "}
            {error.includes("expired") && (
              <Link href="/forgot-password" className="font-medium underline">
                Request a new link
              </Link>
            )}
          </div>
        )}
        <div className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-ring">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="New password (8+ characters)"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-ring">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            name="confirmPassword"
            type="password"
            required
            placeholder="Repeat new password"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Link from the sign-in page**

In `src/app/(auth)/sign-in/page.tsx`, directly under the password input's closing `</div>` (inside the form), add:

```tsx
        <p className="text-right text-sm">
          <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground hover:underline">
            Forgot password?
          </Link>
        </p>
```

Also show a success note after a completed reset — where the `suspendedParam` logic from Task 2 lives, extend the initial state:

```ts
  const resetSuccess = searchParams.get("reset") === "success";
```

and render above the form when `resetSuccess`:

```tsx
        {resetSuccess && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Password updated. Sign in with your new password.
          </div>
        )}
```

- [ ] **Step 4: Verify in the running app**

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm run dev
```

- Visit http://localhost:3000/forgot-password, submit `tech@example.com`, confirm the neutral "if an account exists" message and a `[EMAIL] Dev mode` console log containing `/reset-password/<token>`.
- Open that link, set password `newpassword1`, confirm redirect to sign-in with the green note, sign in with the new password.
- Submit an unknown email — identical UI response.
- Reuse the same reset link — "This link has expired" message with the request-a-new-link link.
- Restore the seed password afterward: `npm run db:seed` (idempotent upsert).

- [ ] **Step 5: Run checks and commit**

```bash
npx tsc --noEmit && npm run test:run
git add "src/app/(auth)/forgot-password" "src/app/(auth)/reset-password" "src/app/(auth)/sign-in/page.tsx"
git commit -m "feat: public forgot-password and reset-password pages"
```

---

### Task 6: Admin user server actions

**Files:**
- Modify: `src/actions/admin.ts` (append; `requireAdmin`, `prisma`, `ROLES`, `ONBOARDING_STATUS`, `revalidatePath` already imported)
- Test: `__tests__/actions/admin-users.test.ts`

**Interfaces:**
- Consumes: `requireAdmin()` (existing, `src/actions/admin.ts:11`); `requestPasswordReset`/`resendVerification` from `src/actions/auth.ts`; `User.suspendedAt`.
- Produces (all return `{ error }` on failure):
  - `getUsers(filters: { q?: string; role?: "TECHNICIAN" | "CUSTOMER"; status?: "ACTIVE" | "SUSPENDED" | "PENDING" }): Promise<{ users: ... } | { error }>` — each user: `{ id, name, email, role, createdAt, suspendedAt, technician: { onboardingStatus } | null }`.
  - `getUserDetail(id: string)` — `{ user }` where user includes technician (with services, availabilitySlots), last 10 bookings (as tuner or customer), reviews (received for tuners via `booking.technicianId`, written for customers via `authorId`).
  - `suspendUser(id)` / `reactivateUser(id)` — `{ success: true }`.
  - `adminResendVerification(id)`, `adminSendPasswordReset(id)` — `{ success: true }`.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/actions/admin-users.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  buildEmailHtml: vi.fn().mockReturnValue("<html></html>"),
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getServerSession } from "next-auth";
import {
  getUsers,
  getUserDetail,
  suspendUser,
  reactivateUser,
} from "@/actions/admin";

const adminSession = {
  user: { id: "admin-1", role: "ADMIN", email: "admin@example.com" },
};

describe("admin user actions — authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-admins", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u1", role: "TECHNICIAN" },
    } as never);
    expect(await getUsers({})).toEqual({ error: "Unauthorized" });
    expect(await suspendUser("u2")).toEqual({ error: "Unauthorized" });
  });
});

describe("getUsers filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never);
    prismaMock.user.findMany.mockResolvedValue([]);
  });

  it("maps SUSPENDED status to suspendedAt not-null", async () => {
    await getUsers({ status: "SUSPENDED" });
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ suspendedAt: { not: null } }),
      })
    );
  });

  it("maps PENDING to technicians with unapproved onboarding", async () => {
    await getUsers({ status: "PENDING" });
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "TECHNICIAN",
          technician: { onboardingStatus: { not: "APPROVED" } },
        }),
      })
    );
  });

  it("never lists admins", async () => {
    await getUsers({});
    const where = prismaMock.user.findMany.mock.calls[0][0].where;
    expect(where.role).toEqual({ not: "ADMIN" });
  });
});

describe("suspendUser guard rails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never);
  });

  it("suspends a technician and revalidates search", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u2",
      role: "TECHNICIAN",
      suspendedAt: null,
    });
    const result = await suspendUser("u2");
    expect(result).toEqual({ success: true });
    const update = prismaMock.user.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: "u2" });
    expect(update.data.suspendedAt).toBeInstanceOf(Date);
  });

  it("refuses to suspend yourself", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      suspendedAt: null,
    });
    const result = await suspendUser("admin-1");
    expect("error" in result).toBe(true);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("refuses to suspend another admin", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "admin-2",
      role: "ADMIN",
      suspendedAt: null,
    });
    const result = await suspendUser("admin-2");
    expect("error" in result).toBe(true);
  });

  it("reactivate clears suspendedAt", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u2",
      role: "TECHNICIAN",
      suspendedAt: new Date(2026, 7, 1),
    });
    const result = await reactivateUser("u2");
    expect(result).toEqual({ success: true });
    expect(prismaMock.user.update.mock.calls[0][0].data).toEqual({
      suspendedAt: null,
    });
  });
});

describe("getUserDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never);
  });

  it("returns error for unknown user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect(await getUserDetail("nope")).toEqual({ error: "User not found" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run __tests__/actions/admin-users.test.ts
```

Expected: FAIL — actions not exported.

- [ ] **Step 3: Implement in `src/actions/admin.ts`**

Add imports at the top: `import { requestPasswordReset, resendVerification } from "@/actions/auth";`

Append:

```ts
type UserFilters = {
  q?: string;
  role?: "TECHNICIAN" | "CUSTOMER";
  status?: "ACTIVE" | "SUSPENDED" | "PENDING";
};

export async function getUsers(filters: UserFilters) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const where: Record<string, unknown> = { role: { not: ROLES.ADMIN } };
  if (filters.role) where.role = filters.role;
  if (filters.q) {
    // SQLite LIKE is case-insensitive for ASCII
    where.OR = [
      { name: { contains: filters.q } },
      { email: { contains: filters.q } },
    ];
  }
  if (filters.status === "SUSPENDED") where.suspendedAt = { not: null };
  if (filters.status === "ACTIVE") where.suspendedAt = null;
  if (filters.status === "PENDING") {
    where.role = ROLES.TECHNICIAN;
    where.technician = {
      onboardingStatus: { not: ONBOARDING_STATUS.APPROVED },
    };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      suspendedAt: true,
      emailVerified: true,
      technician: { select: { onboardingStatus: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200, // ponytail: flat cap, add pagination when the user base outgrows it
  });

  return { users };
}

export async function getUserDetail(id: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      technician: {
        include: {
          services: true,
          availabilitySlots: { orderBy: { dayOfWeek: "asc" } },
        },
      },
    },
  });
  if (!user) return { error: "User not found" };

  const isTechnician = user.role === ROLES.TECHNICIAN && user.technician;

  const bookings = await prisma.booking.findMany({
    where: isTechnician
      ? { technicianId: user.technician!.id }
      : { customerId: user.id },
    include: {
      payment: { select: { status: true } },
      customer: { select: { name: true, email: true } },
      technician: { include: { user: { select: { name: true } } } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 10,
  });

  const reviews = isTechnician
    ? await prisma.review.findMany({
        where: { booking: { technicianId: user.technician!.id } },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : await prisma.review.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

  const { hashedPassword: _hashedPassword, ...safeUser } = user;
  return { user: safeUser, bookings, reviews };
}

async function loadSuspendTarget(id: string, sessionUserId: string) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "User not found" as const };
  if (target.id === sessionUserId) {
    return { error: "You can't suspend your own account" as const };
  }
  if (target.role === ROLES.ADMIN) {
    return { error: "Admin accounts can't be suspended" as const };
  }
  return { target };
}

export async function suspendUser(id: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const check = await loadSuspendTarget(id, result.session.user.id);
  if ("error" in check) return { error: check.error };

  await prisma.user.update({ where: { id }, data: { suspendedAt: new Date() } });
  revalidatePath("/search");
  revalidatePath("/dashboard/admin/users");
  return { success: true as const };
}

export async function reactivateUser(id: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const check = await loadSuspendTarget(id, result.session.user.id);
  if ("error" in check) return { error: check.error };

  await prisma.user.update({ where: { id }, data: { suspendedAt: null } });
  revalidatePath("/search");
  revalidatePath("/dashboard/admin/users");
  return { success: true as const };
}

export async function adminResendVerification(id: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found" };

  return resendVerification(user.email);
}

export async function adminSendPasswordReset(id: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found" };

  return requestPasswordReset(user.email);
}
```

Note: `requireAdmin()`'s success shape is `{ session }` — `result.session.user.id` is available (see `src/actions/admin.ts:11-17`).

- [ ] **Step 4: Run the tests**

```bash
npx vitest run __tests__/actions/admin-users.test.ts && npx tsc --noEmit
```

Expected: PASS, clean tsc.

- [ ] **Step 5: Commit**

```bash
git add src/actions/admin.ts __tests__/actions/admin-users.test.ts
git commit -m "feat: admin user actions — list, detail, suspend, verification, password reset"
```

---

### Task 7: Admin users list page + sidebar link

**Files:**
- Create: `src/app/(dashboard)/dashboard/admin/users/page.tsx`
- Modify: `src/components/dashboard/sidebar-nav.tsx` (`adminLinks`, line 37-40)

**Interfaces:**
- Consumes: `getUsers` from Task 6.
- Produces: `/dashboard/admin/users?q=&role=&status=` server-rendered list linking to `/dashboard/admin/users/[id]`.

- [ ] **Step 1: Add the sidebar link**

In `src/components/dashboard/sidebar-nav.tsx` (Users icon is already imported):

```ts
const adminLinks = [
  { href: "/dashboard/admin/users", label: "Users", icon: Users },
  { href: "/dashboard/admin/submissions", label: "Submissions", icon: ClipboardCheck },
  { href: "/dashboard/admin/posts", label: "Blog Posts", icon: FileText },
];
```

- [ ] **Step 2: Create the list page**

`src/app/(dashboard)/dashboard/admin/users/page.tsx` (server component; Next 16 `searchParams` is a Promise; mirror the layout conventions of `src/app/(dashboard)/dashboard/admin/submissions/page.tsx` — read that file first and match its header/container markup):

```tsx
import Link from "next/link";
import { getUsers } from "@/actions/admin";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "PENDING", label: "Pending onboarding" },
] as const;

const ROLE_TABS = [
  { value: "", label: "Everyone" },
  { value: "TECHNICIAN", label: "Tuners" },
  { value: "CUSTOMER", label: "Customers" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const { q, role, status } = await searchParams;
  const result = await getUsers({
    q: q || undefined,
    role: (role as "TECHNICIAN" | "CUSTOMER") || undefined,
    status: (status as "ACTIVE" | "SUSPENDED" | "PENDING") || undefined,
  });

  if ("error" in result) {
    return <p className="p-6 text-sm text-muted-foreground">You don&apos;t have access to this page.</p>;
  }

  const params = (over: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { q, role, status, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">
          Look up any tuner or customer account to troubleshoot.
        </p>
      </div>

      <form className="flex gap-2" action="/dashboard/admin/users" method="get">
        {role && <input type="hidden" name="role" value={role} />}
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or email"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-sm"
        />
        <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex gap-1">
          {ROLE_TABS.map((t) => (
            <Link
              key={t.value}
              href={`/dashboard/admin/users${params({ role: t.value || undefined })}`}
              className={`rounded-lg px-3 py-1.5 ${(role ?? "") === t.value ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          {STATUS_TABS.map((t) => (
            <Link
              key={t.value}
              href={`/dashboard/admin/users${params({ status: t.value || undefined })}`}
              className={`rounded-lg px-3 py-1.5 ${(status ?? "") === t.value ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {result.users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No accounts match this search.
                </td>
              </tr>
            )}
            {result.users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/admin/users/${u.id}`} className="font-medium text-foreground hover:underline">
                    {u.name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">{u.role === "TECHNICIAN" ? "Tuner" : "Customer"}</td>
                <td className="px-4 py-3">
                  {u.suspendedAt ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Suspended</span>
                  ) : u.technician && u.technician.onboardingStatus !== "APPROVED" ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">Pending onboarding</span>
                  ) : (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in the running app**

Sign in as `admin@example.com` / `password123` → sidebar shows "Users" → list renders seeded users; search `tech` narrows; role and status tabs filter; combined filters persist in the URL.

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit
git add "src/app/(dashboard)/dashboard/admin/users/page.tsx" src/components/dashboard/sidebar-nav.tsx
git commit -m "feat: admin users list page with search and filters"
```

---

### Task 8: Admin user detail page with action buttons

**Files:**
- Create: `src/app/(dashboard)/dashboard/admin/users/[id]/page.tsx` (server component, read-only sections)
- Create: `src/components/admin/user-actions.tsx` (client component: buttons + confirm dialog + toasts)

**Interfaces:**
- Consumes: `getUserDetail`, `suspendUser`, `reactivateUser`, `adminResendVerification`, `adminSendPasswordReset` (Task 6).
- Produces: `/dashboard/admin/users/[id]` troubleshooting view.

- [ ] **Step 1: Create the actions client component**

`src/components/admin/user-actions.tsx`. Check `src/components/admin/submission-card.tsx` first and reuse its dialog/toast pattern (it already handles confirm + pending states for approve/reject). If the project has a toast util (`grep -rn "toast" src/components | head`), use it; otherwise use inline status text like submission-card does.

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  suspendUser,
  reactivateUser,
  adminResendVerification,
  adminSendPasswordReset,
} from "@/actions/admin";

export function UserActions({
  userId,
  suspended,
  emailVerified,
  isTechnician,
}: {
  userId: string;
  suspended: boolean;
  emailVerified: boolean;
  isTechnician: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  function run(action: () => Promise<{ error?: string; success?: boolean }>, okText: string) {
    startTransition(async () => {
      const result = await action();
      if (result.error) setNotice({ ok: false, text: result.error });
      else {
        setNotice({ ok: true, text: okText });
        router.refresh();
      }
      setConfirmSuspend(false);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {suspended ? (
          <button
            disabled={pending}
            onClick={() => run(() => reactivateUser(userId), "Account reactivated.")}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Reactivate account
          </button>
        ) : (
          <button
            disabled={pending}
            onClick={() => setConfirmSuspend(true)}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
          >
            Suspend account
          </button>
        )}
        {!emailVerified && (
          <button
            disabled={pending}
            onClick={() => run(() => adminResendVerification(userId), "Verification email sent.")}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Resend verification email
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => run(() => adminSendPasswordReset(userId), "Password reset email sent.")}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Send password reset
        </button>
      </div>

      {confirmSuspend && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
          <p className="text-red-700">
            {isTechnician
              ? "This tuner will disappear from search and won't be able to log in until reactivated. Their bookings and messages are kept."
              : "This customer won't be able to log in until reactivated. Their bookings and reviews are kept."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              disabled={pending}
              onClick={() => run(() => suspendUser(userId), "Account suspended.")}
              className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white disabled:opacity-50"
            >
              Yes, suspend
            </button>
            <button
              disabled={pending}
              onClick={() => setConfirmSuspend(false)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p className={`text-sm ${notice.ok ? "text-green-700" : "text-red-600"}`}>
          {notice.text}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the detail page**

`src/app/(dashboard)/dashboard/admin/users/[id]/page.tsx` (Next 16: `params` is a Promise). Sections render conditionally by role; every list is read-only. Weekday labels: `["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]`. Prices are stored in cents — render `$${(cents / 100).toFixed(2)}`.

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserDetail } from "@/actions/admin";
import { UserActions } from "@/components/admin/user-actions";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getUserDetail(id);
  if ("error" in result) {
    if (result.error === "User not found") notFound();
    return <p className="p-6 text-sm text-muted-foreground">You don&apos;t have access to this page.</p>;
  }

  const { user, bookings, reviews } = result;
  const isTechnician = user.role === "TECHNICIAN" && user.technician;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/admin/users" className="text-sm text-muted-foreground hover:underline">
          ← All users
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{user.name ?? "Unnamed account"}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-secondary px-2 py-0.5">
                {user.role === "TECHNICIAN" ? "Tuner" : "Customer"}
              </span>
              <span className={`rounded-full px-2 py-0.5 ${user.emailVerified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"}`}>
                {user.emailVerified ? "Email verified" : "Email not verified"}
              </span>
              {user.suspendedAt && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                  Suspended {new Date(user.suspendedAt).toLocaleDateString()}
                </span>
              )}
              {isTechnician && (
                <span className="rounded-full bg-secondary px-2 py-0.5">
                  Onboarding: {user.technician!.onboardingStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <UserActions
        userId={user.id}
        suspended={Boolean(user.suspendedAt)}
        emailVerified={Boolean(user.emailVerified)}
        isTechnician={Boolean(isTechnician)}
      />

      {isTechnician && (
        <>
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">Services</h2>
            {user.technician!.services.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No services set up.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {user.technician!.services.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">${(s.priceCents / 100).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">Availability</h2>
            {user.technician!.availabilitySlots.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No availability set.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {user.technician!.availabilitySlots.map((slot) => (
                  <li key={slot.id} className="flex justify-between">
                    <span>{WEEKDAYS[slot.dayOfWeek]}</span>
                    <span className="text-muted-foreground">{slot.startTime}–{slot.endTime}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Recent bookings</h2>
        {bookings.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0">
                <span>
                  {new Date(b.scheduledAt).toLocaleDateString()} ·{" "}
                  {isTechnician ? (b.customer.name ?? b.customer.email) : (b.technician.user.name ?? "Tuner")}
                </span>
                <span className="text-muted-foreground">
                  {b.status} · ${(b.totalCents / 100).toFixed(2)}
                  {b.payment ? ` · payment ${b.payment.status}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">
          {isTechnician ? "Reviews received" : "Reviews written"}
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No reviews.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-border pb-2 last:border-0">
                <span className="font-medium">{r.rating}/5</span>
                {"author" in r && r.author ? (
                  <span className="text-muted-foreground"> — {r.author.name ?? "Customer"}</span>
                ) : null}
                {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

Adjust field names against the actual Service/AvailabilitySlot models before finishing (`sed -n '/^model Service {/,/^}/p;/^model AvailabilitySlot {/,/^}/p' prisma/schema.prisma`) — e.g. if the price field is `basePriceCents` or slot times are `startMinute`, match the schema, not this listing.

- [ ] **Step 3: Verify the whole flow in the running app**

As admin: open a tuner from the list → sections render; suspend → confirmation copy shows → confirm → badge flips to Suspended; open an incognito window → suspended tuner absent from `/search`, their `/technicians/[id]` page 404s, sign-in as them shows the plain-language suspended message; reactivate → search and sign-in restored. "Send password reset" → dev console logs the email. Dark mode + reload on both new pages.

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit && npm run test:run
git add "src/app/(dashboard)/dashboard/admin/users/[id]" src/components/admin/user-actions.tsx
git commit -m "feat: admin user detail page with suspend and account actions"
```

---

### Task 9: E2E test, docs, full gate

**Files:**
- Create: `e2e/password-reset.spec.ts` (mirror setup/imports of an existing spec in `e2e/` — check `ls e2e/` first and copy the seed/login helpers pattern)
- Modify: `CHANGELOG.md`, `README.md` (if run instructions changed — they didn't; touch only if stale)
- Create: `docs/sessions/2026-08-12-admin-user-portal.md`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the e2e spec**

`e2e/password-reset.spec.ts`. The reset token is only printed to the server console in dev; in e2e, read it from the DB instead — but the token is stored **hashed**, so the raw token can't be recovered from the DB. Approach: exercise the UI flow up to the neutral confirmation, then exercise `/reset-password/[token]` with an invalid token for the expiry copy. (Full token round-trip is covered by unit tests in Task 4.)

```ts
import { test, expect } from "@playwright/test";

test.describe("password reset flow", () => {
  test("forgot-password gives a neutral response for any email", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByPlaceholder("you@example.com").fill("tech@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/if an account exists/i)).toBeVisible();

    // Unknown email: identical response — no account enumeration
    await page.goto("/forgot-password");
    await page.getByPlaceholder("you@example.com").fill("nobody@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/if an account exists/i)).toBeVisible();
  });

  test("invalid reset token shows the expired-link message", async ({ page }) => {
    await page.goto("/reset-password/not-a-real-token");
    await page.getByPlaceholder("New password (8+ characters)").fill("newpassword1");
    await page.getByPlaceholder("Repeat new password").fill("newpassword1");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText(/this link has expired/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /request a new link/i })).toBeVisible();
  });

  test("sign-in page links to forgot-password", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});
```

- [ ] **Step 2: Run it**

```bash
npm run test:e2e -- password-reset.spec.ts
```

Expected: 3 passing. If selectors mismatch the final page markup, fix the spec, not the page.

- [ ] **Step 3: Docs**

Add to `CHANGELOG.md` under a new `## 2026-08-12 — Admin user portal` heading (above the existing 2026-08-12 section):

```markdown
## 2026-08-12 — Admin user portal

- Admin → Users: searchable list of all tuner and customer accounts with role/status filters (`/dashboard/admin/users`).
- Per-user troubleshooting page: profile, services, availability, recent bookings, reviews, verification status.
- Account actions: suspend/reactivate (suspended accounts vanish from search and cannot sign in; nothing is deleted), resend verification email, send password reset.
- New public forgot-password flow: `/forgot-password` + emailed single-use, 1-hour link to `/reset-password/[token]`.
```

Create `docs/sessions/2026-08-12-admin-user-portal.md`: what was done (this plan's tasks + commits), branch `feature/admin-user-portal` + commit hashes (`git log --oneline main..HEAD`), key decisions (suspension = hide + block sign-in via two chokepoints; hashed single-use reset tokens; silent success against enumeration; 15-min JWT re-check), problems hit (fill in honestly from execution), open items (pagination beyond the 200-user cap; audit log; impersonation — all deliberately out of scope per spec).

- [ ] **Step 4: Full gate**

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm run test:all
```

Expected: lint, unit, coverage ≥90%, build, e2e all pass. Fix anything that fails before committing.

- [ ] **Step 5: Commit**

```bash
git add e2e/password-reset.spec.ts CHANGELOG.md docs/sessions/2026-08-12-admin-user-portal.md
git commit -m "test: e2e password-reset flow; docs: changelog + session summary for admin portal"
```

**Do not push** — the orchestrator/human reviews the branch and owns the push.
