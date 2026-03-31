import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockTechnicianSession,
  makeFormData,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { completeWizard, submitForReview } from "@/actions/onboarding";

const mockGetSession = vi.mocked(getServerSession);

describe("completeWizard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates profile and sets status to CHECKLIST_PENDING", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "WIZARD_PENDING",
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});

    const fd = makeFormData({
      bio: "I have been tuning pianos for over 10 years.",
      businessName: "Mike's Piano Service",
      yearsExperience: "15",
    });
    const result = await completeWizard(fd);

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: {
        bio: "I have been tuning pianos for over 10 years.",
        businessName: "Mike's Piano Service",
        yearsExperience: 15,
        onboardingStatus: "CHECKLIST_PENDING",
      },
    });
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const fd = makeFormData({ bio: "Test", yearsExperience: "5" });
    const result = await completeWizard(fd);
    expect(result.error).toBeDefined();
  });

  it("rejects if profile is not in WIZARD_PENDING status", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "APPROVED",
    });

    const fd = makeFormData({ bio: "Test bio text here", yearsExperience: "5" });
    const result = await completeWizard(fd);
    expect(result.error).toContain("already completed");
  });

  it("rejects invalid data", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "WIZARD_PENDING",
    });

    const fd = makeFormData({ bio: "short", yearsExperience: "5" });
    const result = await completeWizard(fd);
    expect(result.error).toBeDefined();
  });
});

describe("submitForReview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets status to SUBMITTED", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "CHECKLIST_PENDING",
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});

    const result = await submitForReview();

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: { onboardingStatus: "SUBMITTED" },
    });
  });

  it("allows resubmission from REJECTED status", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "REJECTED",
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});

    const result = await submitForReview();

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: { onboardingStatus: "SUBMITTED", rejectionReason: null },
    });
  });

  it("rejects if not in CHECKLIST_PENDING or REJECTED status", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "APPROVED",
    });

    const result = await submitForReview();
    expect(result.error).toBeDefined();
  });
});
