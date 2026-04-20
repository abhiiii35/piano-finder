"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface ServiceAreaMapProps {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  city: string;
  state: string;
}

export function ServiceAreaMap({
  latitude,
  longitude,
  radiusMiles,
  city,
  state,
}: ServiceAreaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    let cancelled = false;

    async function initMap() {
      try {
        const { Loader } = await import("@googlemaps/js-api-loader");
        const loader = new Loader({
          apiKey: apiKey!,
          version: "weekly",
        });

        const mapsLib = await loader.importLibrary("maps");
        if (cancelled || !mapRef.current) return;

        const center = { lat: latitude, lng: longitude };

        const map = new mapsLib.Map(mapRef.current, {
          center,
          zoom: 10,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          styles: [
            {
              featureType: "poi",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "transit",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        new mapsLib.Circle({
          map,
          center,
          radius: radiusMiles * 1609.34,
          fillColor: "#d4a84b",
          fillOpacity: 0.1,
          strokeColor: "#d4a84b",
          strokeWeight: 2,
        });

        setMapLoaded(true);
      } catch {
        if (!cancelled) setMapError(true);
      }
    }

    initMap();

    return () => {
      cancelled = true;
    };
  }, [apiKey, latitude, longitude, radiusMiles]);

  // Fallback: no API key or error
  if (!apiKey || mapError) {
    return (
      <div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-5 w-5" />
          <span className="text-sm">
            {city && state ? `${city}, ${state}` : "Service area"}
          </span>
        </div>
        {radiusMiles > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            Serves within {radiusMiles} miles
            {city && state ? ` of ${city}, ${state}` : ""}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        ref={mapRef}
        className="h-[250px] w-full rounded-lg"
        style={{ minHeight: "250px" }}
      />
      {!mapLoaded && (
        <div className="h-[250px] w-full rounded-lg bg-muted flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      )}
      <p className="mt-2 text-sm text-muted-foreground">
        Serves within {radiusMiles} miles
        {city && state ? ` of ${city}, ${state}` : ""}
      </p>
    </div>
  );
}
