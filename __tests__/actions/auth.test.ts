import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, makeFormData } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("bcryptjs", () => ({ hash: vi.fn().mockResolvedValue("hashed_pw") }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/emails/verification", () => ({
  verificationEmail: vi.fn().mockReturnValue({
    subject: "Verify your email",
    html: "<p>Verify</p>",
  }),
}));

import { signUp, resendVerification } from "@/actions/auth";
import { sendEmail } from "@/lib/email";

describe("signUp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a customer successfully", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "new-user", role: "CUSTOMER" });

    const fd = makeFormData({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      confirmPassword: "password123",
      role: "CUSTOMER",
    });

    const result = await signUp(fd);
    expect(result).toEqual({ success: true });
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
    expect(prismaMock.technicianProfile.create).not.toHaveBeenCalled();
  });

  it("creates a technician with profile", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "new-tech", role: "TECHNICIAN" });
    prismaMock.technicianProfile.create.mockResolvedValue({});

    const fd = makeFormData({
      name: "Mike Tuner",
      email: "mike@example.com",
      password: "password123",
      confirmPassword: "password123",
      role: "TECHNICIAN",
    });

    const result = await signUp(fd);
    expect(result).toEqual({ success: true });
    expect(prismaMock.technicianProfile.create).toHaveBeenCalledWith({
      data: { userId: "new-tech" },
    });
  });

  it("rejects duplicate email", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing" });

    const fd = makeFormData({
      name: "Jane",
      email: "existing@example.com",
      password: "password123",
      confirmPassword: "password123",
      role: "CUSTOMER",
    });

    const result = await signUp(fd);
    expect(result.error).toContain("already exists");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("returns validation error for short password", async () => {
    const fd = makeFormData({
      name: "Jane",
      email: "jane@example.com",
      password: "short",
      confirmPassword: "short",
      role: "CUSTOMER",
    });

    const result = await signUp(fd);
    expect(result.error).toBeDefined();
  });

  it("returns validation error for mismatched passwords", async () => {
    const fd = makeFormData({
      name: "Jane",
      email: "jane@example.com",
      password: "password123",
      confirmPassword: "different123",
      role: "CUSTOMER",
    });

    const result = await signUp(fd);
    expect(result.error).toBeDefined();
  });

  it("creates a verification token and sends email after user creation", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "new-user", role: "CUSTOMER" });
    prismaMock.verificationToken.create.mockResolvedValue({});

    const fd = makeFormData({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      confirmPassword: "password123",
      role: "CUSTOMER",
    });

    const result = await signUp(fd);
    expect(result).toEqual({ success: true });
    expect(prismaMock.verificationToken.create).toHaveBeenCalledOnce();
    expect(prismaMock.verificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        identifier: "jane@example.com",
        token: expect.any(String),
        expires: expect.any(Date),
      }),
    });
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledWith({
      to: "jane@example.com",
      subject: "Verify your email",
      html: "<p>Verify</p>",
    });
  });
});

describe("resendVerification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends a new verification email (happy path)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "jane@example.com",
      emailVerified: null,
    });
    prismaMock.verificationToken.findFirst.mockResolvedValue(null);
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({});

    const result = await resendVerification("jane@example.com");
    expect(result).toEqual({ success: true });
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "jane@example.com" },
    });
    expect(prismaMock.verificationToken.create).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledWith({
      to: "jane@example.com",
      subject: "Verify your email",
      html: "<p>Verify</p>",
    });
  });

  it("returns error when user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await resendVerification("nobody@example.com");
    expect(result).toEqual({ error: "No account found with this email" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns error when email is already verified", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "jane@example.com",
      emailVerified: new Date(),
    });

    const result = await resendVerification("jane@example.com");
    expect(result).toEqual({ error: "Email is already verified" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns error when rate limited (recent token exists)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "jane@example.com",
      emailVerified: null,
    });
    prismaMock.verificationToken.findFirst.mockResolvedValue({
      identifier: "jane@example.com",
      token: "recent-token",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const result = await resendVerification("jane@example.com");
    expect(result).toEqual({ error: "Please wait before requesting another verification email" });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
