"use server";

import { randomUUID, createHash } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { verificationEmail } from "@/lib/emails/verification";
import { passwordResetEmail } from "@/lib/emails/passwordReset";
import { signUpSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function signUp(formData: FormData) {
  // Unauthenticated by definition — bound account-creation spam / verification
  // email-bombing of arbitrary addresses.
  const ip = await getClientIp();
  const limit = rateLimit(`sign-up:${ip}`, 5, 60 * 60_000);
  if (!limit.ok) {
    return { error: "Too many sign-up attempts from this connection. Please try again later." };
  }

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    role: formData.get("role") as string,
  };

  const result = signUpSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { name, email, password, role } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      hashedPassword,
      role,
    },
  });

  if (role === "TECHNICIAN") {
    await prisma.technicianProfile.create({
      data: { userId: user.id },
    });
  }

  // Send verification email
  try {
    const token = randomUUID();
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    const { subject, html } = verificationEmail(verifyUrl);
    await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error("[EMAIL] Failed to send verification email:", error);
  }

  return { success: true };
}

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "No account found with this email" };
  }

  if (user.emailVerified) {
    return { error: "Email is already verified" };
  }

  // Rate limit: reject if a token was created in the last 60 seconds
  // A token with expires > 23hrs from now was created less than 60 seconds ago
  const rateLimitThreshold = new Date(Date.now() + 23 * 60 * 60 * 1000);
  const recentToken = await prisma.verificationToken.findFirst({
    where: {
      identifier: email,
      expires: { gt: rateLimitThreshold },
    },
  });

  if (recentToken) {
    return { error: "Please wait before requesting another verification email" };
  }

  // Delete old tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  // Create new token and send email
  const token = randomUUID();
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  const { subject, html } = verificationEmail(verifyUrl);
  await sendEmail({ to: email, subject, html });

  return { success: true };
}

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
