import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, makeFormData } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("bcryptjs", () => ({ hash: vi.fn().mockResolvedValue("hashed_pw") }));

import { signUp } from "@/actions/auth";

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
});
