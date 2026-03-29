# Location-Based Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable customers to search for piano technicians by location, with results sorted by distance and filtered by radius.

**Architecture:** A geocoding module converts location input to coordinates via OpenStreetMap Nominatim (swappable). Technician coordinates are stored on profile save. Search computes Haversine distances in JS and filters/sorts by proximity.

**Tech Stack:** Next.js 16, Prisma 7 (SQLite), Vitest, OpenStreetMap Nominatim API

---

### Task 1: Geocoding module with Haversine distance

**Files:**
- Create: `src/lib/geocoding.ts`
- Create: `__tests__/lib/geocoding.test.ts`

- [ ] **Step 1: Write failing tests for haversineDistance**

```typescript
// __tests__/lib/geocoding.test.ts
import { describe, it, expect, vi } from "vitest";
import { haversineDistance } from "@/lib/geocoding";

describe("haversineDistance", () => {
  it("returns 0 for same point", () => {
    expect(haversineDistance(42.36, -71.06, 42.36, -71.06)).toBe(0);
  });

  it("computes Boston to New York (~190 miles)", () => {
    const d = haversineDistance(42.3601, -71.0589, 40.7128, -74.006);
    expect(d).toBeGreaterThan(180);
    expect(d).toBeLessThan(200);
  });

  it("computes Boston to Cambridge (~3 miles)", () => {
    const d = haversineDistance(42.3601, -71.0589, 42.3736, -71.1097);
    expect(d).toBeGreaterThan(2);
    expect(d).toBeLessThan(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/geocoding.test.ts`
Expected: FAIL — `haversineDistance` not found

- [ ] **Step 3: Implement haversineDistance and geocode**

```typescript
// src/lib/geocoding.ts

export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Haversine formula — distance in miles between two lat/lng points.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Geocode a location string (city, zip, address) to coordinates.
 * Default provider: OpenStreetMap Nominatim.
 * Swap implementation here to use Google Maps or Mapbox.
 */
export async function geocode(query: string): Promise<GeoResult | null> {
  if (!query.trim()) return null;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "us");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "PianoTune/1.0" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.length) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Add geocode tests with mocked fetch**

Add to `__tests__/lib/geocoding.test.ts`:

```typescript
import { geocode } from "@/lib/geocoding";

describe("geocode", () => {
  it("returns coordinates for valid location", async () => {
    const mockResponse = [
      { lat: "42.3601", lon: "-71.0589", display_name: "Boston, MA, USA" },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await geocode("Boston, MA");
    expect(result).toEqual({
      lat: 42.3601,
      lng: -71.0589,
      displayName: "Boston, MA, USA",
    });
  });

  it("returns null for empty query", async () => {
    const result = await geocode("");
    expect(result).toBeNull();
  });

  it("returns null when API returns no results", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    const result = await geocode("xyznonexistent");
    expect(result).toBeNull();
  });

  it("returns null on fetch error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const result = await geocode("Boston");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 5: Run all tests to verify they pass**

Run: `npx vitest run __tests__/lib/geocoding.test.ts`
Expected: 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/geocoding.ts __tests__/lib/geocoding.test.ts
git commit -m "feat: add geocoding module with Haversine distance calculation"
```

---

### Task 2: Update searchTechnicians with distance filtering

**Files:**
- Modify: `src/lib/queries/technicians.ts`
- Modify: `__tests__/lib/queries/technicians.test.ts`

- [ ] **Step 1: Write failing tests for distance-based search**

Add to `__tests__/lib/queries/technicians.test.ts`:

```typescript
describe("searchTechnicians with location", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by radius and sorts by distance", async () => {
    prismaMock.technicianProfile.findMany.mockResolvedValue([
      {
        ...fixtures.technicianProfile,
        id: "near",
        latitude: 42.37, // ~1 mile from search point
        longitude: -71.07,
        user: { name: "Near Tech", image: null },
        services: [fixtures.service],
      },
      {
        ...fixtures.technicianProfile,
        id: "far",
        latitude: 40.71, // ~190 miles away (NYC)
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/queries/technicians.test.ts`
Expected: FAIL — `distanceMiles` not in return type, `lat`/`lng`/`radiusMiles` not accepted

- [ ] **Step 3: Update searchTechnicians to accept location params**

Replace the function in `src/lib/queries/technicians.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geocoding";

export async function searchTechnicians(filters: {
  q?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
}) {
  const profiles = await prisma.technicianProfile.findMany({
    where: {
      isActive: true,
      ...(filters.city && { city: filters.city }),
      ...(filters.state && { state: filters.state }),
      ...(filters.q
        ? {
            OR: [
              { businessName: { contains: filters.q } },
              { bio: { contains: filters.q } },
              { city: { contains: filters.q } },
              { user: { name: { contains: filters.q } } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { name: true, image: true } },
      services: { where: { isActive: true } },
    },
  });

  const profilesWithRatings = await Promise.all(
    profiles.map(async (profile) => {
      const reviews = await prisma.review.findMany({
        where: { booking: { technicianId: profile.id } },
        select: { rating: true },
      });
      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;
      const minPrice =
        profile.services.length > 0
          ? Math.min(...profile.services.map((s) => s.priceCents))
          : 0;

      let distanceMiles: number | undefined;
      if (
        filters.lat != null &&
        filters.lng != null &&
        profile.latitude != null &&
        profile.longitude != null
      ) {
        distanceMiles = Math.round(
          haversineDistance(
            filters.lat,
            filters.lng,
            profile.latitude,
            profile.longitude
          )
        );
      }

      return {
        ...profile,
        avgRating,
        reviewCount: reviews.length,
        minPrice,
        distanceMiles,
      };
    })
  );

  // If location search, filter by radius and sort by distance
  if (filters.lat != null && filters.lng != null) {
    const radius = filters.radiusMiles ?? 25;
    return profilesWithRatings
      .filter((p) => p.distanceMiles != null && p.distanceMiles <= radius)
      .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
  }

  return profilesWithRatings;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/queries/technicians.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/technicians.ts __tests__/lib/queries/technicians.test.ts
git commit -m "feat: add distance filtering and sorting to technician search"
```

---

### Task 3: Geocode on technician profile save and signup

**Files:**
- Modify: `src/actions/technician.ts`
- Modify: `src/actions/technician-signup.ts`
- Modify: `__tests__/actions/technician.test.ts`

- [ ] **Step 1: Write failing test for geocoding on profile update**

Add to `__tests__/actions/technician.test.ts`:

```typescript
import { geocode } from "@/lib/geocoding";

vi.mock("@/lib/geocoding", () => ({
  geocode: vi.fn(),
}));

// Add inside "updateProfile" describe block:
it("geocodes city/state and stores coordinates", async () => {
  setupTechSession();
  prismaMock.technicianProfile.update.mockResolvedValue({});
  prismaMock.user.update.mockResolvedValue({});
  vi.mocked(geocode).mockResolvedValue({
    lat: 42.36,
    lng: -71.06,
    displayName: "Boston, MA",
  });

  const fd = makeFormData({ city: "Boston", state: "MA" });
  const result = await updateProfile(fd);

  expect(result.success).toBe(true);
  const updateCall = prismaMock.technicianProfile.update.mock.calls[0][0];
  expect(updateCall.data.latitude).toBe(42.36);
  expect(updateCall.data.longitude).toBe(-71.06);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/actions/technician.test.ts`
Expected: FAIL — latitude/longitude not in update data

- [ ] **Step 3: Add geocoding to updateProfile**

In `src/actions/technician.ts`, add import and geocoding call:

```typescript
import { geocode } from "@/lib/geocoding";
```

Inside `updateProfile`, after parsing data, before the prisma update:

```typescript
let latitude: number | null = null;
let longitude: number | null = null;
if (data.city && data.state) {
  const geo = await geocode(`${data.city}, ${data.state} ${data.zipCode ?? ""}`);
  if (geo) {
    latitude = geo.lat;
    longitude = geo.lng;
  }
}
```

Add to the `prisma.technicianProfile.update` data object:

```typescript
latitude,
longitude,
```

- [ ] **Step 4: Add geocoding to createTechnicianProfile**

In `src/actions/technician-signup.ts`, add import:

```typescript
import { geocode } from "@/lib/geocoding";
```

Before `prisma.technicianProfile.create`, add:

```typescript
let latitude: number | null = null;
let longitude: number | null = null;
const geo = await geocode(`${data.city}, ${data.state} ${data.zipCode || ""}`);
if (geo) {
  latitude = geo.lat;
  longitude = geo.lng;
}
```

Add `latitude` and `longitude` to the create data object.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/actions/technician.ts src/actions/technician-signup.ts __tests__/actions/technician.test.ts
git commit -m "feat: geocode technician location on profile save and signup"
```

---

### Task 4: Update search page to geocode input and pass location params

**Files:**
- Modify: `src/app/(public)/search/page.tsx`

- [ ] **Step 1: Update SearchResults to geocode and pass location**

```typescript
import { geocode } from "@/lib/geocoding";

// Update the filters type:
async function SearchResults({
  filters,
}: {
  filters: { q?: string; radius?: string; sort?: string };
}) {
  // Geocode the search query
  let lat: number | undefined;
  let lng: number | undefined;
  if (filters.q) {
    const geo = await geocode(filters.q);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

  const radiusMiles = filters.radius ? parseInt(filters.radius) : undefined;
  const technicians = await searchTechnicians({
    q: filters.q,
    lat,
    lng,
    radiusMiles,
  });
```

Update the `searchParams` type to include `radius`:

```typescript
searchParams: Promise<{ q?: string; radius?: string; sort?: string }>;
```

Pass `distanceMiles` to `TechnicianCard`:

```typescript
<TechnicianCard
  key={tech.id}
  // ... existing props ...
  distanceMiles={tech.distanceMiles}
/>
```

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds (TypeScript may warn about missing prop — we add it in Task 5)

- [ ] **Step 3: Commit**

```bash
git add src/app/(public)/search/page.tsx
git commit -m "feat: geocode search input and pass location to query"
```

---

### Task 5: Update search filters UI and technician card

**Files:**
- Modify: `src/components/search/search-filters.tsx`
- Modify: `src/components/search/technician-card.tsx`

- [ ] **Step 1: Add radius dropdown to SearchFilters**

Add to `src/components/search/search-filters.tsx`, import `FilterSelect`:

```typescript
import { FilterSelect } from "@/components/ui/filter-select";
```

Add radius state and include in URL params:

```typescript
const [radius, setRadius] = useState(searchParams.get("radius") ?? "25");
```

Add radius to `handleSearch` params builder:

```typescript
if (radius) params.set("radius", radius);
```

Add the FilterSelect after the existing sort dropdown:

```typescript
<FilterSelect
  value={radius}
  onChange={(v) => {
    setRadius(v || "25");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    params.set("radius", v || "25");
    router.push(`/search?${params.toString()}`);
  }}
  options={[
    { value: "10", label: "Within 10 mi" },
    { value: "25", label: "Within 25 mi" },
    { value: "50", label: "Within 50 mi" },
    { value: "100", label: "Within 100 mi" },
  ]}
  placeholder="Within 25 mi"
/>
```

- [ ] **Step 2: Add distanceMiles to TechnicianCard props**

In `src/components/search/technician-card.tsx`, add to Props type:

```typescript
distanceMiles?: number;
```

Add to the destructured props in the function signature.

Display distance below the location line:

```typescript
{distanceMiles != null && (
  <span className="text-xs text-amber-600 font-medium">
    {distanceMiles} mi away
  </span>
)}
```

Add this inside the location/experience `<div>`, after the years experience span.

- [ ] **Step 3: Build and run all tests**

Run: `npx next build && npx vitest run`
Expected: Build succeeds, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/search/search-filters.tsx src/components/search/technician-card.tsx
git commit -m "feat: add radius filter and distance display to search UI"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full unit test suite**

Run: `npx vitest run`
Expected: All tests pass (existing + new)

- [ ] **Step 2: Run build**

Run: `npx next build`
Expected: Build succeeds with no type errors

- [ ] **Step 3: Run e2e tests**

Run: `npx tsx e2e/seed-test-db.ts && npx playwright test`
Expected: All e2e tests pass (seed data has coordinates set for the test technician)

- [ ] **Step 4: Update seed data with coordinates**

In `e2e/seed-test-db.ts`, add coordinates to the test technician profile:

```typescript
latitude: 42.3601,
longitude: -71.0589,
```

In `prisma/seed.ts`, ensure the existing seed technician also has coordinates set.

- [ ] **Step 5: Final commit**

```bash
git add e2e/seed-test-db.ts prisma/seed.ts
git commit -m "chore: add coordinates to seed data for location search"
```
