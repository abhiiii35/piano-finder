import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, fixtures } from "../../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/technicians/[id]/route";

describe("GET /api/technicians/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns technician with services", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      user: { name: "Mike Tuner" },
      services: [fixtures.service],
    });

    const response = await GET(
      new Request("http://localhost:3000/api/technicians/tech-profile-1"),
      { params: Promise.resolve({ id: "tech-profile-1" }) }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.technician).toBeDefined();
    expect(data.technician.id).toBe("tech-profile-1");
  });

  it("returns 404 for non-existent technician", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3000/api/technicians/invalid"),
      { params: Promise.resolve({ id: "invalid" }) }
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
