import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockTechnicianSession,
  mockCustomerSession,
  fixtures,
} from "../../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { GET } from "@/app/api/export/route";

const mockGetSession = vi.mocked(getServerSession);

function request(type: string) {
  return new Request(`http://localhost/api/export?type=${type}`);
}

describe("GET /api/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
  });

  it("returns 401 for non-technicians", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const response = await GET(request("customers"));
    expect(response.status).toBe(401);
  });

  it("rejects unknown export types", async () => {
    const response = await GET(request("secrets"));
    expect(response.status).toBe(400);
  });

  it("scopes the customers export to the signed-in technician", async () => {
    prismaMock.customerRecord.findMany.mockResolvedValue([fixtures.customerRecord]);
    const response = await GET(request("customers"));
    expect(response.status).toBe(200);
    expect(prismaMock.customerRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technicianId: "tech-profile-1" } })
    );
    const text = await response.text();
    expect(text.split("\r\n")[0]).toBe(
      "ID,Customer Name,Email,Phone,Notes,Billing Address Line 1,Billing City,Billing State,Billing Zip,Legacy Piano Make,Legacy Piano Model,Legacy Serial Number,Legacy Piano Location,Created At"
    );
  });

  it("scopes pianos through the owning technician's customer records", async () => {
    prismaMock.piano.findMany.mockResolvedValue([fixtures.piano]);
    const response = await GET(request("pianos"));
    expect(response.status).toBe(200);
    expect(prismaMock.piano.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerRecord: { technicianId: "tech-profile-1" } },
      })
    );
  });

  it("scopes service history directly by technicianId", async () => {
    prismaMock.serviceRecord.findMany.mockResolvedValue([fixtures.serviceRecord]);
    const response = await GET(request("service-history"));
    expect(response.status).toBe(200);
    expect(prismaMock.serviceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technicianId: "tech-profile-1" } })
    );
  });

  it("bookings export includes the joined customer name and service names", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      {
        ...fixtures.booking,
        customer: { name: "Jane Doe", email: "jane@example.com" },
        services: [{ service: { name: "Standard Tuning" } }],
      },
    ]);
    const response = await GET(request("bookings"));
    const rows = (await response.text()).trimEnd().split("\r\n");
    expect(rows[1]).toContain("Jane Doe");
    expect(rows[1]).toContain("Standard Tuning");
  });

  it("sets a csv content type and attachment filename", async () => {
    prismaMock.customerRecord.findMany.mockResolvedValue([]);
    const response = await GET(request("customers"));
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("customers.csv");
  });
});
