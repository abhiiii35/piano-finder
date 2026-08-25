import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";
import { prismaMock } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  buildEmailHtml: vi.fn((heading: string, bodyHtml: string) => `<html>${heading}${bodyHtml}</html>`),
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
