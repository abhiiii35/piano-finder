# Location-Based Search Design

## Problem

Search is currently text-match on city/name/bio. A customer searching for "piano tuner" gets no results unless a technician's profile contains that exact string. There's no way to find nearby technicians or sort by distance.

## Solution

Add geocoding to convert location input (city name or zip code) to coordinates, compute distances using the Haversine formula, and filter/sort results by proximity.

## Architecture

### Geocoding Provider

A swappable provider abstraction in `src/lib/geocoding.ts`:

```typescript
export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocode(query: string): Promise<GeoResult | null>
```

Default implementation: OpenStreetMap Nominatim (free, no API key).
Swap to Google Maps or Mapbox by changing the implementation — the interface stays the same.

Nominatim constraints: 1 req/sec rate limit, User-Agent header required. Acceptable for search-on-submit (not autocomplete).

### Technician Coordinates

The `latitude` and `longitude` fields already exist on `TechnicianProfile` but are never populated.

- **On profile save** (`updateProfile` action): geocode the technician's city/state/zip and store lat/lng.
- **On technician signup** (`createTechnicianProfile` action): same — geocode city/state and store.
- If geocoding fails, leave coordinates null. Technician still appears in text search but not distance-sorted results.

### Search Query

`searchTechnicians()` accepts new params: `lat?: number`, `lng?: number`, `radiusMiles?: number`.

When lat/lng are provided:
1. Fetch all active technicians with non-null coordinates
2. Compute Haversine distance in JS (SQLite has no spatial functions)
3. Filter to those within `radiusMiles` (default 25)
4. Sort by distance ascending
5. Attach `distanceMiles` to each result

When lat/lng are NOT provided (no location entered or geocoding failed):
- Fall back to current text-match behavior, no distance filtering

### Distance Calculation

Haversine formula in a utility function `haversineDistance(lat1, lng1, lat2, lng2): number` returning miles. Located in `src/lib/geocoding.ts` alongside the geocode function.

### Search Filters UI

- City/zip input stays the same — value is geocoded server-side
- New radius dropdown: 10mi / 25mi / 50mi / 100mi (default 25mi)
- Sort dropdown: add "Nearest" option, make it the default when location is entered
- URL params: `?q=Boston&radius=25&sort=distance`

### Technician Card

- When distance is available, show "X mi away" below the location line
- When not available (no location search or technician has no coordinates), show nothing

## Files

| File | Change |
|------|--------|
| `src/lib/geocoding.ts` | New — geocode function, haversine distance, provider abstraction |
| `src/lib/queries/technicians.ts` | Modify — accept lat/lng/radius, compute distances, filter/sort |
| `src/components/search/search-filters.tsx` | Modify — add radius dropdown |
| `src/components/search/technician-card.tsx` | Modify — show distance |
| `src/app/(public)/search/page.tsx` | Modify — geocode search input, pass lat/lng/radius to query |
| `src/actions/technician.ts` | Modify — geocode on profile save |
| `src/actions/technician-signup.ts` | Modify — geocode on signup |
| `__tests__/lib/geocoding.test.ts` | New — geocode mock, haversine tests |
| `__tests__/lib/queries/technicians.test.ts` | Modify — test distance filtering |
| `__tests__/actions/technician.test.ts` | Modify — test geocoding on save |

## Edge Cases

- **Geocoding fails**: fall back to text search, no error shown to user
- **Technician has no coordinates**: excluded from distance results, still appears in text search
- **Ambiguous location input**: Nominatim returns best match; good enough for MVP
- **Same city, different states**: geocoding handles this (returns coordinates, not string match)

## Testing

- Unit test haversine formula with known city pairs
- Unit test geocode function with mocked HTTP response
- Unit test searchTechnicians with distance filtering (mock coordinates on profiles)
- E2e test: search with location shows "X mi away" on cards
- Verify build passes, all existing tests still pass
