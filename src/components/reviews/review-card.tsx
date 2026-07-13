"use client";

import { useState } from "react";
import { StarRating } from "./star-rating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PhotoLightbox } from "@/components/ui/photo-lightbox";
import { formatDistanceToNow } from "date-fns";

function cloudinaryTransform(url: string, transform: string): string {
  // Insert transform after /upload/ in Cloudinary URL
  return url.replace("/upload/", `/upload/${transform}/`);
}

export function ReviewCard({
  review,
}: {
  review: {
    rating: number;
    comment: string | null;
    photos?: string;
    createdAt: Date;
    author: { name: string | null; image: string | null };
  };
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  let photos: string[] = [];
  try {
    if (review.photos) {
      photos = JSON.parse(review.photos);
    }
  } catch {
    // invalid JSON, ignore
  }

  const thumbnailPhotos = photos.slice(0, 3);
  const extraCount = photos.length - 3;

  const fullSizePhotos = photos.map((url) =>
    cloudinaryTransform(url, "w_1200,c_limit,f_auto")
  );

  return (
    <div className="flex gap-4 py-4">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback>
          {review.author.name?.[0]?.toUpperCase() ?? "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {review.author.name ?? "Anonymous"}
          </span>
          <Badge variant="secondary" className="text-xs">
            Verified booking
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(review.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <StarRating rating={review.rating} />
        {review.comment && (
          <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
        )}
        {photos.length > 0 && (
          <div className="mt-3 flex gap-2">
            {thumbnailPhotos.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className="relative overflow-hidden rounded-md"
              >
                <img
                  src={cloudinaryTransform(url, "w_400,h_400,c_fill,f_auto")}
                  alt={`Review photo ${i + 1}`}
                  className="h-20 w-20 object-cover"
                />
                {i === 2 && extraCount > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-semibold text-sm">
                    +{extraCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

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
