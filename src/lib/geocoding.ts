import { boundedSet } from "@/lib/bounded-map";

export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

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

// In-memory cache of geocoded addresses — street/city addresses don't move,
// and this is the single lowest-effort fix for Nominatim's ~1req/sec usage
// policy: it benefits every caller (search, booking, technician signup) at
// once. ponytail: process-local Map with no eviction beyond TTL-on-read;
// fine at this app's traffic, move to Redis/DB if it grows unbounded.
const geocodeCache = new Map<string, { result: GeoResult | null; expiresAt: number }>();
const GEOCODE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — resolved addresses don't move
const GEOCODE_MISS_TTL_MS = 5 * 60 * 1000; // 5 min — don't let a transient Nominatim error/outage poison the cache for a week
const GEOCODE_CACHE_MAX_ENTRIES = 20_000; // bound Map growth against an attacker varying query strings

export async function geocode(query: string): Promise<GeoResult | null> {
  if (!query.trim()) return null;

  const key = query.trim().toLowerCase();
  const cached = geocodeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const result = await fetchGeocode(query);
  const ttl = result ? GEOCODE_CACHE_TTL_MS : GEOCODE_MISS_TTL_MS;
  boundedSet(geocodeCache, key, { result, expiresAt: Date.now() + ttl }, GEOCODE_CACHE_MAX_ENTRIES);
  return result;
}

async function fetchGeocode(query: string): Promise<GeoResult | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "us");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "PianoTuner/1.0" },
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
