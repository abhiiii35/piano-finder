import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockTechnicianSession,
  fixtures,
  makeFormData,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  updateProfile,
  createService,
  updateService,
  deleteService,
  upsertAvailability,
} from "@/actions/technician";

const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
}

describe("updateProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates profile successfully", async () => {
    setupTechSession();
    prismaMock.technicianProfile.update.mockResolvedValue({});
    prismaMock.user.update.mockResolvedValue({});

    const fd = makeFormData({
      bio: "Updated bio",
      businessName: "New Name",
      city: "Cambridge",
      state: "MA",
      phone: "617-555-9999",
    });

    const result = await updateProfile(fd);
    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledOnce();
    expect(prismaMock.user.update).toHaveBeenCalledOnce();
  });

  it("rejects non-technician", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u-1", role: "CUSTOMER", name: "Jane", email: "j@e.com" },
    });

    const fd = makeFormData({ bio: "test" });
    await expect(updateProfile(fd)).rejects.toThrow("Unauthorized");
  });
});

describe("createService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a service with price in cents", async () => {
    setupTechSession();
    prismaMock.service.create.mockResolvedValue({});

    const fd = makeFormData({
      name: "Standard Tuning",
      description: "Full tuning",
      price: "175.50",
      durationMin: "90",
    });

    const result = await createService(fd);
    expect(result.success).toBe(true);
    const call = prismaMock.service.create.mock.calls[0][0];
    expect(call.data.priceCents).toBe(17550);
    expect(call.data.durationMin).toBe(90);
  });

  it("rejects invalid service data", async () => {
    setupTechSession();

    const fd = makeFormData({ name: "", price: "0", durationMin: "5" });
    const result = await createService(fd);
    expect(result.error).toBeDefined();
  });
});

describe("updateService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates an existing service", async () => {
    setupTechSession();
    prismaMock.service.findFirst.mockResolvedValue(fixtures.service);
    prismaMock.service.update.mockResolvedValue({});

    const fd = makeFormData({ name: "Updated Tuning", price: "200", durationMin: "120" });
    const result = await updateService("service-1", fd);
    expect(result.success).toBe(true);
  });

  it("rejects update for non-existent service", async () => {
    setupTechSession();
    prismaMock.service.findFirst.mockResolvedValue(null);

    const fd = makeFormData({ name: "Test", price: "100", durationMin: "60" });
    const result = await updateService("nonexistent", fd);
    expect(result.error).toContain("not found");
  });
});

describe("deleteService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a service", async () => {
    setupTechSession();
    prismaMock.service.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteService("service-1");
    expect(result.success).toBe(true);
    expect(prismaMock.service.deleteMany).toHaveBeenCalledWith({
      where: { id: "service-1", technicianId: "tech-profile-1" },
    });
  });
});

describe("upsertAvailability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates slot when enabled", async () => {
    setupTechSession();
    prismaMock.availabilitySlot.deleteMany.mockResolvedValue({});
    prismaMock.availabilitySlot.create.mockResolvedValue({});

    const fd = makeFormData({
      dayOfWeek: "1",
      startTime: "09:00",
      endTime: "17:00",
      enabled: "true",
    });

    const result = await upsertAvailability(fd);
    expect(result.success).toBe(true);
    expect(prismaMock.availabilitySlot.create).toHaveBeenCalledOnce();
  });

  it("only deletes when disabled (empty string = false)", async () => {
    setupTechSession();
    prismaMock.availabilitySlot.deleteMany.mockResolvedValue({});

    // z.coerce.boolean() treats empty string as false, non-empty as true
    const fd = makeFormData({
      dayOfWeek: "1",
      startTime: "09:00",
      endTime: "17:00",
      enabled: "",
    });

    const result = await upsertAvailability(fd);
    expect(result.success).toBe(true);
    expect(prismaMock.availabilitySlot.deleteMany).toHaveBeenCalledOnce();
    expect(prismaMock.availabilitySlot.create).not.toHaveBeenCalled();
  });
});
