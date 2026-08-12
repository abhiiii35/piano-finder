import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("bcryptjs", () => ({ compare: vi.fn().mockResolvedValue(true) }));

import { authOptions } from "@/lib/auth";
import type { CredentialsConfig } from "next-auth/providers/credentials";

// next-auth 4's CredentialsProvider() factory doesn't merge the user-supplied
// `authorize` onto the top-level provider object — it stubs it with
// `() => null` and stores the real config under `.options` (merged at
// request time by next-auth's internal parseProviders()). Reach through
// `.options` to exercise the actual authorize implementation.
const credentialsProvider = (
  authOptions.providers.find((p) => p.id === "credentials") as unknown as {
    options: CredentialsConfig;
  }
).options;

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
