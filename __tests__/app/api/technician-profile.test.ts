import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, mockTechnicianSession, fixtures } from "../../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { GET } from "@/app/api/technician/profile/route";

const mockGetSession = vi.mocked(getServerSession);

describe("GET /api/technician/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns technician profile", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
    prismaMock.user.findUnique.mockResolvedValue({ phone: "617-555-0200" });

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.profile).toBeDefined();
    expect(data.profile.phone).toBe("617-555-0200");
  });

  it("returns 401 for non-technician", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u-1", role: "CUSTOMER", name: "Jane", email: "j@e.com" },
    });

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 401 for unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });
});
