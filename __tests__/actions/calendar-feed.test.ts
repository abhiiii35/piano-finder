import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockTechnicianSession,
  mockCustomerSession,
  fixtures,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  enableCalendarFeed,
  regenerateCalendarFeed,
  disableCalendarFeed,
  getCalendarFeedStatus,
} from "@/actions/calendar-feed";

const mockGetSession = vi.mocked(getServerSession);

describe("calendar-feed actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
  });

  it("rejects non-technicians", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const result = await enableCalendarFeed();
    expect(result.error).toBeDefined();
  });

  it("rejects a technician with no profile", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);
    const result = await enableCalendarFeed();
    expect(result.error).toBeDefined();
  });

  it("enables the feed by generating an unguessable token", async () => {
    prismaMock.technicianProfile.update.mockResolvedValue({});
    const result = await enableCalendarFeed();
    expect(result.calendarToken).toMatch(/^[0-9a-f]{48}$/);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: { calendarToken: result.calendarToken },
    });
  });

  it("enabling an already-enabled feed returns the existing token without regenerating", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      calendarToken: "existing-token",
    });
    const result = await enableCalendarFeed();
    expect(result.calendarToken).toBe("existing-token");
    expect(prismaMock.technicianProfile.update).not.toHaveBeenCalled();
  });

  it("regenerate issues a new token, invalidating the old one", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      calendarToken: "old-token",
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});
    const result = await regenerateCalendarFeed();
    expect(result.calendarToken).not.toBe("old-token");
    expect(result.calendarToken).toMatch(/^[0-9a-f]{48}$/);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: { calendarToken: result.calendarToken },
    });
  });

  it("disable clears the token", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      calendarToken: "some-token",
    });
    prismaMock.technicianProfile.update.mockResolvedValue({});
    const result = await disableCalendarFeed();
    expect(result.success).toBe(true);
    expect(prismaMock.technicianProfile.update).toHaveBeenCalledWith({
      where: { id: "tech-profile-1" },
      data: { calendarToken: null },
    });
  });

  it("getCalendarFeedStatus returns the current token", async () => {
    const result = await getCalendarFeedStatus();
    expect(result.calendarToken).toBe(fixtures.technicianProfile.calendarToken);
  });
});
