import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, mockTechnicianSession, fixtures } from "../../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { GET } from "@/app/api/technician/services/route";

const mockGetSession = vi.mocked(getServerSession);

describe("GET /api/technician/services", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns services for authenticated technician", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
    prismaMock.service.findMany.mockResolvedValue([fixtures.service, fixtures.service2]);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.services).toHaveLength(2);
  });

  it("returns empty array when no profile", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();
    expect(data.services).toEqual([]);
  });

  it("returns 401 for unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });
});
