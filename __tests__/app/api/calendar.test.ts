import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, fixtures } from "../../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/calendar/[token]/route";

function request() {
  return new Request("http://localhost/api/calendar/x");
}

function ctx(token: string) {
  return { params: Promise.resolve({ token }) };
}

describe("GET /api/calendar/[token]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404s for an unknown token (no auth beyond the token itself)", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);
    const response = await GET(request(), ctx("unknown-token"));
    expect(response.status).toBe(404);
    expect(prismaMock.technicianProfile.findUnique).toHaveBeenCalledWith({
      where: { calendarToken: "unknown-token" },
    });
  });

  it("returns a text/calendar feed with a VEVENT per non-cancelled booking", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      calendarToken: "abc123",
    });
    prismaMock.booking.findMany.mockResolvedValue([
      {
        ...fixtures.booking,
        id: "booking-1",
        scheduledAt: new Date("2026-04-15T14:00:00Z"),
        durationMin: 90,
        customer: { name: "Jane Doe" },
        services: [{ service: { name: "Standard Tuning" } }],
      },
    ]);

    const response = await GET(request(), ctx("abc123"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/calendar");

    const text = await response.text();
    expect(text).toContain("BEGIN:VEVENT");
    expect(text).toContain("UID:booking-1@bookatuner");
    expect(text).toContain("DTSTART:20260415T140000Z");
    expect(text).toContain("SUMMARY:Piano service — Jane Doe");

    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          technicianId: fixtures.technicianProfile.id,
          status: { not: "CANCELLED" },
        }),
      })
    );
  });

  it("regenerating the token invalidates the old one (old token no longer resolves)", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);
    const response = await GET(request(), ctx("old-token"));
    expect(response.status).toBe(404);
  });
});
