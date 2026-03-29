import { describe, it, expect } from "vitest";
import { signUpSchema, signInSchema } from "@/lib/validations/auth";

describe("signUpSchema", () => {
  const valid = {
    name: "Jane Doe",
    email: "jane@example.com",
    password: "password123",
    confirmPassword: "password123",
    role: "CUSTOMER" as const,
  };

  it("accepts valid customer input", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts valid technician input", () => {
    expect(signUpSchema.safeParse({ ...valid, role: "TECHNICIAN" }).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = signUpSchema.safeParse({ ...valid, confirmPassword: "different" });
    expect(result.success).toBe(false);
  });

  it("rejects short passwords", () => {
    const result = signUpSchema.safeParse({ ...valid, password: "short", confirmPassword: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = signUpSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects short name", () => {
    const result = signUpSchema.safeParse({ ...valid, name: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = signUpSchema.safeParse({ ...valid, role: "ADMIN" });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts valid input", () => {
    const result = signInSchema.safeParse({ email: "jane@example.com", password: "pass" });
    expect(result.success).toBe(true);
  });

  it("rejects empty password", () => {
    const result = signInSchema.safeParse({ email: "jane@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = signInSchema.safeParse({ email: "bad", password: "pass" });
    expect(result.success).toBe(false);
  });
});
