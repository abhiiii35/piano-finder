"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
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

  return { success: true };
}
