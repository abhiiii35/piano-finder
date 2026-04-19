"use server";

import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { verificationEmail } from "@/lib/emails/verification";
import { signUpSchema } from "@/lib/validations/auth";

export async function signUp(formData: FormData) {
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
