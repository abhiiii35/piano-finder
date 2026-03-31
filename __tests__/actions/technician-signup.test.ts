import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockCustomerSession,
  makeFormData,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { createTechnicianProfile } from "@/actions/technician-signup";

const mockGetSession = vi.mocked(getServerSession);

describe("createTechnicianProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  const validForm = {
    firstName: "Mike",
    lastName: "Tuner",
    phone: "617-555-0200",
    yearsExperience: "15",
    bio: "Experienced tuner",
    city: "Boston",
    state: "MA",
    zipCode: "02108",
    serviceRadius: "30",
    services: "Tuning,Repair",
    pianoTypes: "Grand,Upright",
    baseTuningPrice: "175",
    travelFee: "25",
    pitchRaiseFee: "50",
    ptgMember: "true",
  };

  it("creates a technician profile and upgrades user role", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.technicianProfile.create.mockResolvedValue({ id: "new-profile" });
    prismaMock.service.createMany.mockResolvedValue({ count: 3 });

    const fd = makeFormData(validForm);
    const result = await createTechnicianProfile(fd);

    expect(result.success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: {
        name: "Mike Tuner",
        role: "TECHNICIAN",
        phone: "617-555-0200",
      },
    });
    expect(prismaMock.technicianProfile.create).toHaveBeenCalledOnce();
    const profileData = prismaMock.technicianProfile.create.mock.calls[0][0].data;
    expect(profileData.city).toBe("Boston");
    expect(profileData.ptgMember).toBe(true);
    expect(profileData.travelFeeCents).toBe(2500);
    expect(JSON.parse(profileData.pianoTypes)).toEqual(["Grand", "Upright"]);
  });

  it("creates services from pricing and service selection via createMany", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.technicianProfile.create.mockResolvedValue({ id: "new-profile" });
    prismaMock.service.createMany.mockResolvedValue({ count: 3 });

    const fd = makeFormData(validForm);
    await createTechnicianProfile(fd);

    expect(prismaMock.service.createMany).toHaveBeenCalledOnce();
    const serviceData = prismaMock.service.createMany.mock.calls[0][0].data;
    const serviceNames = serviceData.map((s: { name: string }) => s.name);
    expect(serviceNames).toContain("Standard Tuning");
    expect(serviceNames).toContain("Pitch Raise");
    expect(serviceNames).toContain("Repair");
    expect(serviceNames).toHaveLength(3);
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const fd = makeFormData(validForm);
    const result = await createTechnicianProfile(fd);
    expect(result.error).toContain("sign in");
  });

  it("rejects if already a technician", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({ id: "existing" });

    const fd = makeFormData(validForm);
    const result = await createTechnicianProfile(fd);
    expect(result.error).toContain("already have");
  });

  it("rejects missing required fields", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);

    const fd = makeFormData({ firstName: "Mike", lastName: "", city: "", state: "" });
    const result = await createTechnicianProfile(fd);
    expect(result.error).toBeDefined();
  });

  it("creates profile with WIZARD_PENDING status and isActive=false", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.technicianProfile.create.mockResolvedValue({ id: "new-profile" });
    prismaMock.service.createMany.mockResolvedValue({ count: 3 });

    const fd = makeFormData(validForm);
    const result = await createTechnicianProfile(fd);

    expect(result.success).toBe(true);
    const profileData = prismaMock.technicianProfile.create.mock.calls[0][0].data;
    expect(profileData.isActive).toBe(false);
    expect(profileData.onboardingStatus).toBe("WIZARD_PENDING");
  });

  it("handles form with no optional fields", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.technicianProfile.create.mockResolvedValue({ id: "p-1" });

    const fd = makeFormData({
      firstName: "Jane",
      lastName: "Smith",
      city: "Boston",
      state: "MA",
      services: "",
      pianoTypes: "",
      ptgMember: "false",
    });

    const result = await createTechnicianProfile(fd);
    expect(result.success).toBe(true);
    expect(prismaMock.service.createMany).not.toHaveBeenCalled();
  });
});
