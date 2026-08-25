import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, mockTechnicianSession, fixtures } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { globalSearch } from "@/actions/search";

const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
}

function mockEmptyResults() {
  prismaMock.customerRecord.findMany.mockResolvedValue([]);
  prismaMock.contact.findMany.mockResolvedValue([]);
  prismaMock.piano.findMany.mockResolvedValue([]);
  prismaMock.serviceLocation.findMany.mockResolvedValue([]);
  prismaMock.booking.findMany.mockResolvedValue([]);
}

describe("globalSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty groups without querying the database for < 2 chars", async () => {
    setupTechSession();
    mockEmptyResults();

    const result = await globalSearch("j");

    expect(result).toEqual({
      customers: [],
      contacts: [],
      pianos: [],
      locations: [],
      bookings: [],
    });
    expect(prismaMock.customerRecord.findMany).not.toHaveBeenCalled();
  });

  it("returns empty groups for a whitespace-only query", async () => {
    setupTechSession();
    mockEmptyResults();

    const result = await globalSearch("  ");

    expect(result.customers).toEqual([]);
    expect(prismaMock.customerRecord.findMany).not.toHaveBeenCalled();
  });

  it("scopes every model query to the current technician", async () => {
    setupTechSession();
    mockEmptyResults();

    await globalSearch("jane");

    expect(prismaMock.customerRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technicianId: "tech-profile-1" }),
      })
    );
    expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerRecord: { technicianId: "tech-profile-1" },
        }),
      })
    );
    expect(prismaMock.piano.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerRecord: { technicianId: "tech-profile-1" },
        }),
      })
    );
    expect(prismaMock.serviceLocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerRecord: { technicianId: "tech-profile-1" },
        }),
      })
    );
    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technicianId: "tech-profile-1" }),
      })
    );
  });

  it("never returns another technician's data — the query itself is scoped", async () => {
    // Simulate a Prisma call that (per its where clause) can only ever return
    // rows for this technician; a customer belonging to another technician
    // would never appear here because the where clause always includes
    // technicianId: profile.id.
    setupTechSession();
    prismaMock.customerRecord.findMany.mockResolvedValue([fixtures.customerRecord]);
    prismaMock.contact.findMany.mockResolvedValue([]);
    prismaMock.piano.findMany.mockResolvedValue([]);
    prismaMock.serviceLocation.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await globalSearch("jane");

    expect(result.customers).toHaveLength(1);
    expect(result.customers[0]).toEqual({
      type: "customer",
      id: "record-1",
      title: "Jane Doe",
      subtitle: "jane@example.com",
      href: "/dashboard/technician/customers/record-1",
    });
    // Confirms the guard rail: the where clause used to fetch it was scoped.
    expect(prismaMock.customerRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technicianId: "tech-profile-1" }),
      })
    );
  });

  it("caps each group at 5 results", async () => {
    setupTechSession();
    mockEmptyResults();

    await globalSearch("jane");

    expect(prismaMock.customerRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });

  it("rejects non-technician", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u-1", role: "CUSTOMER", name: "Jane", email: "j@e.com" },
    });
    await expect(globalSearch("jane")).rejects.toThrow("Unauthorized");
  });
});
