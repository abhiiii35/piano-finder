import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, fixtures } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  buildEmailHtml: vi.fn().mockReturnValue("<html></html>"),
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/actions/auth", () => ({
  resendVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { resendVerification, requestPasswordReset } from "@/actions/auth";
import {
  getUsers,
  getUserDetail,
  suspendUser,
  reactivateUser,
  adminResendVerification,
  adminSendPasswordReset,
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

  it("strips hashedPassword from the returned user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...fixtures.user });
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.review.findMany.mockResolvedValue([]);

    const result = await getUserDetail(fixtures.user.id);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect("hashedPassword" in result.user).toBe(false);
  });
});

describe("adminResendVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never);
  });

  it("rejects non-admins", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u1", role: "TECHNICIAN" },
    } as never);
    expect(await adminResendVerification("u2")).toEqual({ error: "Unauthorized" });
  });

  it("returns error for unknown user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect(await adminResendVerification("nope")).toEqual({ error: "User not found" });
  });

  it("delegates to resendVerification with the user's email", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...fixtures.user, id: "u2" });
    vi.mocked(resendVerification).mockResolvedValue({ success: true });

    const result = await adminResendVerification("u2");
    expect(resendVerification).toHaveBeenCalledWith(fixtures.user.email);
    expect(result).toEqual({ success: true });
  });
});

describe("adminSendPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never);
  });

  it("rejects non-admins", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u1", role: "TECHNICIAN" },
    } as never);
    expect(await adminSendPasswordReset("u2")).toEqual({ error: "Unauthorized" });
  });

  it("returns error for unknown user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect(await adminSendPasswordReset("nope")).toEqual({ error: "User not found" });
  });

  it("delegates to requestPasswordReset with the user's email", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...fixtures.user, id: "u2" });
    vi.mocked(requestPasswordReset).mockResolvedValue({ success: true });

    const result = await adminSendPasswordReset("u2");
    expect(requestPasswordReset).toHaveBeenCalledWith(fixtures.user.email);
    expect(result).toEqual({ success: true });
  });
});
