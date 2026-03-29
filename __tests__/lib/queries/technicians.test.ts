import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, fixtures } from "../../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { searchTechnicians, getTechnicianById } from "@/lib/queries/technicians";

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
});
