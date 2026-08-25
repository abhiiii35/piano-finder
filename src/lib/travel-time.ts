import { haversineDistance } from "@/lib/geocoding";
import { AVG_TRAVEL_SPEED_MPH } from "@/lib/constants";

export interface LatLng {
  lat: number;
  lng: number;
}

// Single interface for drive-time estimation. Swapping implementations must
// not change the booking UI or the availability action signature.
export interface TravelTimeProvider {
  travelMinutes(from: LatLng, to: LatLng): Promise<number>;
}

// Free provider: straight-line distance at an assumed average local speed.
export const haversineProvider: TravelTimeProvider = {
  async travelMinutes(from, to) {
    const miles = haversineDistance(from.lat, from.lng, to.lat, to.lng);
    return Math.ceil((miles / AVG_TRAVEL_SPEED_MPH) * 60);
  },
};

// Paid provider: Google Distance Matrix. Only ever selected when
// GOOGLE_MAPS_BILLING_ENABLED=true (see getTravelTimeProvider).
export const googleProvider: TravelTimeProvider = {
  async travelMinutes(from, to) {
    try {
      const url = new URL(
        "https://maps.googleapis.com/maps/api/distancematrix/json"
      );
      url.searchParams.set("origins", `${from.lat},${from.lng}`);
      url.searchParams.set("destinations", `${to.lat},${to.lng}`);
      url.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY ?? "");

      const res = await fetch(url.toString());
      if (!res.ok) return haversineProvider.travelMinutes(from, to);

      const data = await res.json();
      const seconds = data?.rows?.[0]?.elements?.[0]?.duration?.value;
      if (typeof seconds !== "number") {
        return haversineProvider.travelMinutes(from, to);
      }
      return Math.ceil(seconds / 60);
    } catch {
      return haversineProvider.travelMinutes(from, to);
    }
  },
};

export function getTravelTimeProvider(): TravelTimeProvider {
  return process.env.GOOGLE_MAPS_BILLING_ENABLED === "true"
    ? googleProvider
    : haversineProvider;
}
