import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockAdminSession,
  mockTechnicianSession,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn((heading: string, body: string) => `<html>${heading}${body}</html>`),
}));

import { getServerSession } from "next-auth";
import { sendEmail } from "@/lib/email";
import { approveSubmission, rejectSubmission, getPendingSubmissions } from "@/actions/admin";

const mockGetSession = vi.mocked(getServerSession);
const mockSendEmail = vi.mocked(sendEmail);

describe("approveSubmission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets isActive=true, isVerified=true, onboardingStatus=APPROVED and sends email", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "SUBMITTED",
      user: { name: "Mike Tuner", email: "tech@example.com" },
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});

    const result = await approveSubmission("tech-profile-1");

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: {
        isActive: true,
        isVerified: true,
        onboardingStatus: "APPROVED",
      },
    });
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail.mock.calls[0][0].to).toBe("tech@example.com");
  });

  it("rejects non-admin user", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    const result = await approveSubmission("tech-profile-1");
    expect(result.error).toContain("Unauthorized");
  });

  it("rejects if profile is not SUBMITTED", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      onboardingStatus: "APPROVED",
    });

    const result = await approveSubmission("tech-profile-1");
    expect(result.error).toBeDefined();
  });
});

describe("rejectSubmission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets onboardingStatus=REJECTED with reason and sends email", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      id: "tech-profile-1",
      userId: "tech-user-1",
      onboardingStatus: "SUBMITTED",
      user: { name: "Mike Tuner", email: "tech@example.com" },
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});

    const result = await rejectSubmission("tech-profile-1", "Please add a more detailed bio.");

    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: {
        onboardingStatus: "REJECTED",
        rejectionReason: "Please add a more detailed bio.",
      },
    });
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it("rejects empty reason", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    const result = await rejectSubmission("tech-profile-1", "");
    expect(result.error).toContain("reason");
  });
});

describe("getPendingSubmissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all SUBMITTED profiles", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.technicianProfile.findMany.mockResolvedValue([
      { id: "p1", onboardingStatus: "SUBMITTED", user: { name: "A", email: "a@test.com" } },
    ]);

    const result = await getPendingSubmissions();
    expect(result.submissions).toHaveLength(1);
    expect(prismaMock.technicianProfile.findMany).toHaveBeenCalledWith({
      where: { onboardingStatus: "SUBMITTED" },
      include: { user: { select: { name: true, email: true } }, services: true },
      orderBy: { updatedAt: "asc" },
    });
  });

  it("rejects non-admin user", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    const result = await getPendingSubmissions();
    expect(result.error).toBeDefined();
  });
});
