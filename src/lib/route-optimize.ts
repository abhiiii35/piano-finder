import { haversineDistance } from "@/lib/geocoding";
import { AVG_TRAVEL_SPEED_MPH } from "@/lib/constants";

export interface Stop {
  id: string;
  lat: number | null;
  lng: number | null;
}

export interface OptimizedRoute {
  order: string[]; // ordered stop IDs
  legs: Array<{
    fromId: string | null; // null for first leg from home
    toId: string;
    miles: number;
  }>;
  totalMiles: number;
  totalMinutes: number;
  unrouted: string[]; // stops with missing coordinates
}

/**
 * Optimizes a route using nearest-neighbor algorithm.
 * Starts and ends at home base, visiting all stops in between.
 * Missing coordinates are appended at the end and flagged as unrouted.
 *
 * Distance calculated as haversine miles × 1.3 road factor.
 * Time calculated as miles / 30 mph × 60 minutes.
 */
export function optimizeRoute(
  home: { lat: number; lng: number },
  stops: Stop[]
): OptimizedRoute {
  // Separate routed (with coords) from unrouted (missing coords)
  const routed = stops.filter((s) => s.lat !== null && s.lng !== null);
  const unrouted = stops.filter((s) => s.lat === null || s.lng === null).map((s) => s.id);

  // Nearest-neighbor: start from home, pick closest unvisited stop, repeat
  const order: string[] = [];
  let current = home;
  const visited = new Set<string>();

  while (order.length < routed.length) {
    let nearestId = "";
    let nearestDist = Infinity;

    for (const stop of routed) {
      if (visited.has(stop.id)) continue;
      const dist = haversineDistance(current.lat, current.lng, stop.lat!, stop.lng!);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = stop.id;
      }
    }

    if (nearestId) {
      order.push(nearestId);
      visited.add(nearestId);
      const stop = routed.find((s) => s.id === nearestId)!;
      current = { lat: stop.lat!, lng: stop.lng! };
    }
  }

  // Build legs: home -> first stop -> ... -> last stop -> home
  const legs: OptimizedRoute["legs"] = [];
  let totalMiles = 0;

  // Home to first stop
  if (order.length > 0) {
    const firstStop = routed.find((s) => s.id === order[0])!;
    const miles = haversineDistance(home.lat, home.lng, firstStop.lat!, firstStop.lng!) * 1.3;
    const roundedMiles = Math.round(miles * 10) / 10;
    legs.push({ fromId: null, toId: order[0], miles: roundedMiles });
    totalMiles += roundedMiles;
  }

  // Stop to stop
  for (let i = 0; i < order.length - 1; i++) {
    const fromStop = routed.find((s) => s.id === order[i])!;
    const toStop = routed.find((s) => s.id === order[i + 1])!;
    const miles =
      haversineDistance(fromStop.lat!, fromStop.lng!, toStop.lat!, toStop.lng!) * 1.3;
    const roundedMiles = Math.round(miles * 10) / 10;
    legs.push({ fromId: order[i], toId: order[i + 1], miles: roundedMiles });
    totalMiles += roundedMiles;
  }

  // Last stop back to home
  if (order.length > 0) {
    const lastStop = routed.find((s) => s.id === order[order.length - 1])!;
    const miles = haversineDistance(lastStop.lat!, lastStop.lng!, home.lat, home.lng) * 1.3;
    const roundedMiles = Math.round(miles * 10) / 10;
    legs.push({ fromId: order[order.length - 1], toId: "home", miles: roundedMiles });
    totalMiles += roundedMiles;
  }

  const totalMinutes = Math.round((totalMiles / AVG_TRAVEL_SPEED_MPH) * 60);

  return {
    order,
    legs,
    totalMiles: Math.round(totalMiles * 10) / 10,
    totalMinutes,
    unrouted,
  };
}
