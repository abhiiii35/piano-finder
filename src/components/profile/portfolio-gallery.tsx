"use client";

import { useState } from "react";
import { PhotoLightbox } from "@/components/ui/photo-lightbox";
import { Button } from "@/components/ui/button";

function cloudinaryTransform(url: string, transform: string): string {
  return url.replace("/upload/", `/upload/${transform}/`);
}

function extractUrl(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object" && "url" in item) {
    return (item as { url: string }).url;
  }
  return "";
}

export function PortfolioGallery({ photos }: { photos: string }) {
  const [showAll, setShowAll] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  let parsed: string[] = [];
  try {
    const raw = JSON.parse(photos);
    if (Array.isArray(raw)) {
      parsed = raw.map(extractUrl).filter(Boolean);
    }
  } catch {
    return null;
  }

  if (parsed.length === 0) return null;

  const displayPhotos = showAll ? parsed : parsed.slice(0, 6);

  const fullSizePhotos = parsed.map((url) =>
    cloudinaryTransform(url, "w_1200,c_limit,f_auto")
  );

  return (
    <div>
      <h2 className="text-lg font-semibold">Portfolio</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {displayPhotos.map((url, i) => (
          <button
            key={i}
            onClick={() => setLightboxIndex(i)}
            className="overflow-hidden rounded-lg aspect-square"
          >
            <img
              src={cloudinaryTransform(url, "w_400,h_400,c_fill,f_auto")}
              alt={`Portfolio photo ${i + 1}`}
              className="h-full w-full object-cover hover:scale-105 transition-transform duration-200"
            />
          </button>
        ))}
      </div>
      {!showAll && parsed.length > 6 && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setShowAll(true)}
        >
          View all {parsed.length} photos
        </Button>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={fullSizePhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
