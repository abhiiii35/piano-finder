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
