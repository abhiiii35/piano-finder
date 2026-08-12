import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prismaMock, fixtures } from "../../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  searchTechnicians,
  getTechnicianById,
  getNextAvailableSlot,
} from "@/lib/queries/technicians";

describe("searchTechnicians", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns technicians with computed ratings", async () => {
    prismaMock.technicianProfile.findMany.mockResolvedValue([
      {
        ...fixtures.technicianProfile,
        user: { name: "Mike Tuner", image: null },
        services: [fixtures.service],
      },
    ]);
    prismaMock.review.findMany.mockResolvedValue([
      { rating: 5 },
      { rating: 4 },
    ]);

    const results = await searchTechnicians({});
    expect(results).toHaveLength(1);
    expect(results[0].avgRating).toBe(4.5);
    expect(results[0].reviewCount).toBe(2);
    expect(results[0].minPrice).toBe(17500);
  });

  it("returns empty array when no technicians match", async () => {
    prismaMock.technicianProfile.findMany.mockResolvedValue([]);
    const results = await searchTechnicians({ city: "Nowhere" });
    expect(results).toEqual([]);
  });

  it("handles technician with no reviews", async () => {
    prismaMock.technicianProfile.findMany.mockResolvedValue([
      {
        ...fixtures.technicianProfile,
        user: { name: "New Tech", image: null },
        services: [fixtures.service],
      },
    ]);
    prismaMock.review.findMany.mockResolvedValue([]);

    const results = await searchTechnicians({});
    expect(results[0].avgRating).toBe(0);
    expect(results[0].reviewCount).toBe(0);
  });

  it("handles technician with no services", async () => {
    prismaMock.technicianProfile.findMany.mockResolvedValue([
      {
        ...fixtures.technicianProfile,
        user: { name: "No Services", image: null },
        services: [],
      },
    ]);
    prismaMock.review.findMany.mockResolvedValue([]);

    const results = await searchTechnicians({});
    expect(results[0].minPrice).toBe(0);
  });

  it("excludes suspended technicians via the where clause", async () => {
    prismaMock.technicianProfile.findMany.mockResolvedValue([]);
    await searchTechnicians({});
    expect(prismaMock.technicianProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: expect.objectContaining({ suspendedAt: null }),
        }),
      })
    );
  });
});

describe("searchTechnicians with location", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by radius and sorts by distance", async () => {
    prismaMock.technicianProfile.findMany.mockResolvedValue([
      {
        ...fixtures.technicianProfile,
        id: "near",
        latitude: 42.37,
        longitude: -71.07,
        user: { name: "Near Tech", image: null },
        services: [fixtures.service],
      },
      {
        ...fixtures.technicianProfile,
        id: "far",
        latitude: 40.71,
        longitude: -74.01,
        user: { name: "Far Tech", image: null },
        services: [fixtures.service],
      },
    ]);
    prismaMock.review.findMany.mockResolvedValue([]);

    const results = await searchTechnicians({
      lat: 42.36,
      lng: -71.06,
      radiusMiles: 25,
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("near");
    expect(results[0].distanceMiles).toBeDefined();
    expect(results[0].distanceMiles).toBeLessThan(5);
  });

  it("returns all when no location provided", async () => {
    prismaMock.technicianProfile.findMany.mockResolvedValue([
      {
        ...fixtures.technicianProfile,
        user: { name: "Tech", image: null },
        services: [fixtures.service],
      },
    ]);
    prismaMock.review.findMany.mockResolvedValue([]);

    const results = await searchTechnicians({});
    expect(results).toHaveLength(1);
    expect(results[0].distanceMiles).toBeUndefined();
  });
});

describe("getTechnicianById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns full technician profile with reviews", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      user: { name: "Mike", image: null, email: "mike@example.com" },
      services: [fixtures.service],
      availabilitySlots: [fixtures.availabilitySlot],
    });
    prismaMock.review.findMany.mockResolvedValue([
      {
        ...fixtures.review,
        author: { name: "Jane", image: null },
      },
    ]);

    const result = await getTechnicianById("tech-profile-1");
    expect(result).not.toBeNull();
    expect(result!.avgRating).toBe(5);
    expect(result!.reviewCount).toBe(1);
    expect(result!.reviews).toHaveLength(1);
    expect(result!.services).toHaveLength(1);
    expect(result!.availabilitySlots).toHaveLength(1);
  });

  it("returns null for non-existent technician", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue(null);
    const result = await getTechnicianById("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null for a suspended technician", async () => {
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      user: {
        name: "Suspended Tech",
        image: null,
        email: "s@example.com",
        suspendedAt: new Date(2026, 7, 1),
      },
      services: [],
      availabilitySlots: [],
    });
    const result = await getTechnicianById("tech-profile-1");
    expect(result).toBeNull();
  });
});

describe("getNextAvailableSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pin the clock so every test in this block is deterministic:
    // Wednesday, July 15, 2026 at 9:00 AM local time.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("returns null when technician has no availability slots", async () => {
    prismaMock.availabilitySlot.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await getNextAvailableSlot("tech-profile-1");
    expect(result).toBeNull();
  });

  it("returns first available date when no bookings conflict", async () => {
    // Monday availability slot
    prismaMock.availabilitySlot.findMany.mockResolvedValue([
      { ...fixtures.availabilitySlot, dayOfWeek: 1 },
    ]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await getNextAvailableSlot("tech-profile-1");

    // Result should be within a few days (next Monday)
    expect(result).not.toBeNull();
    expect(result?.getDay()).toBe(1); // Monday
  });

  it("skips days without availability slots", async () => {
    // Only Friday (5) has availability
    prismaMock.availabilitySlot.findMany.mockResolvedValue([
      { ...fixtures.availabilitySlot, dayOfWeek: 5 },
    ]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await getNextAvailableSlot("tech-profile-1");

    expect(result).not.toBeNull();
    expect(result?.getDay()).toBe(5); // Friday
  });

  it("returns null when technician is fully booked within window", async () => {
    // Today is a Monday; Monday is available
    const today = new Date();
    const dayOfWeek = today.getDay();

    prismaMock.availabilitySlot.findMany.mockResolvedValue([
      { ...fixtures.availabilitySlot, dayOfWeek },
    ]);
    // Booking on today (covers the whole window)
    prismaMock.booking.findMany.mockResolvedValue([
      {
        ...fixtures.booking,
        scheduledAt: today,
        status: "CONFIRMED",
      },
    ]);

    const result = await getNextAvailableSlot("tech-profile-1", "today");

    // No availability today because it's booked
    expect(result).toBeNull();
  });

  it("respects availability window: today", async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    prismaMock.availabilitySlot.findMany.mockResolvedValue([
      { ...fixtures.availabilitySlot, dayOfWeek },
    ]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await getNextAvailableSlot("tech-profile-1", "today");

    expect(result).not.toBeNull();
    const resultDateOnly = new Date(result!);
    resultDateOnly.setHours(0, 0, 0, 0);
    const todayOnly = new Date(today);
    todayOnly.setHours(0, 0, 0, 0);
    expect(resultDateOnly.getTime()).toBe(todayOnly.getTime());
  });

  it("respects availability window: this-week (ends Saturday)", async () => {
    // Friday availability falls inside the window (Wed Jul 15 → Sat Jul 18)
    prismaMock.availabilitySlot.findMany.mockResolvedValue([
      { ...fixtures.availabilitySlot, dayOfWeek: 5 }, // Friday
    ]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await getNextAvailableSlot("tech-profile-1", "this-week");

    expect(result).not.toBeNull();
    // Should be Friday, July 17, 2026
    expect(result?.getFullYear()).toBe(2026);
    expect(result?.getMonth()).toBe(6); // July (0-indexed)
    expect(result?.getDate()).toBe(17);
    expect(result?.getDay()).toBe(5); // Friday
  });

  it("includes Saturday, the final day of the this-week window", async () => {
    prismaMock.availabilitySlot.findMany.mockResolvedValue([
      { ...fixtures.availabilitySlot, dayOfWeek: 6 }, // Saturday
    ]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await getNextAvailableSlot("tech-profile-1", "this-week");

    // Saturday, July 18, 2026 — the window's inclusive end (d <= endDate)
    expect(result).not.toBeNull();
    expect(result?.getDate()).toBe(18);
    expect(result?.getDay()).toBe(6); // Saturday
  });

  it("returns null when the only slot falls after the this-week window", async () => {
    // Sunday is only 4 days away but past Saturday, the end of the calendar week
    prismaMock.availabilitySlot.findMany.mockResolvedValue([
      { ...fixtures.availabilitySlot, dayOfWeek: 0 }, // Sunday
    ]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await getNextAvailableSlot("tech-profile-1", "this-week");

    expect(result).toBeNull();
  });

  it("returns earliest available when multiple days have slots", async () => {
    // Both Monday and Friday available; from Wednesday, Friday is the earliest calendar date
    prismaMock.availabilitySlot.findMany.mockResolvedValue([
      { ...fixtures.availabilitySlot, dayOfWeek: 1 }, // Monday
      { ...fixtures.availabilitySlot, dayOfWeek: 5 }, // Friday
    ]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await getNextAvailableSlot("tech-profile-1");

    expect(result).not.toBeNull();
    // From Wednesday, Friday is the next available (this Friday, July 17)
    // Monday is 2026-07-20, which is later
    expect(result?.getFullYear()).toBe(2026);
    expect(result?.getMonth()).toBe(6); // July (0-indexed)
    expect(result?.getDate()).toBe(17);
    expect(result?.getDay()).toBe(5); // Friday
  });

  it("picks the lower dayOfWeek when it is the nearest calendar date", async () => {
    // From Sunday, Monday (dayOfWeek 1) is nearer than Friday (dayOfWeek 5)
    vi.setSystemTime(new Date(2026, 6, 19, 9, 0)); // Sunday, July 19, 2026

    prismaMock.availabilitySlot.findMany.mockResolvedValue([
      { ...fixtures.availabilitySlot, dayOfWeek: 1 }, // Monday
      { ...fixtures.availabilitySlot, dayOfWeek: 5 }, // Friday
    ]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await getNextAvailableSlot("tech-profile-1");

    expect(result).not.toBeNull();
    // Monday, July 20, 2026 — not Friday, July 24
    expect(result?.getDate()).toBe(20);
    expect(result?.getDay()).toBe(1); // Monday
  });

  it("skips booked days and finds next available", async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Today is available but has a booking
    prismaMock.availabilitySlot.findMany.mockResolvedValue([
      { ...fixtures.availabilitySlot, dayOfWeek },
      { ...fixtures.availabilitySlot, dayOfWeek: (dayOfWeek + 1) % 7 },
    ]);

    // Booking today
    prismaMock.booking.findMany.mockResolvedValue([
      {
        ...fixtures.booking,
        scheduledAt: today,
        status: "PENDING",
      },
    ]);

    const result = await getNextAvailableSlot("tech-profile-1");

    expect(result).not.toBeNull();
    // Should skip today and return tomorrow (which is also available)
    const resultDateOnly = new Date(result!);
    resultDateOnly.setHours(0, 0, 0, 0);
    const tomorrowOnly = new Date(today);
    tomorrowOnly.setDate(tomorrowOnly.getDate() + 1);
    tomorrowOnly.setHours(0, 0, 0, 0);
    expect(resultDateOnly.getTime()).toBe(tomorrowOnly.getTime());
  });
});
