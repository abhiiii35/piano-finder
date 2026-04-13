import Link from "next/link";
import { Star, MapPin, Zap } from "lucide-react";

type Props = {
  id: string;
  name: string | null;
  businessName: string | null;
  city: string | null;
  state: string | null;
  yearsExperience: number | null;
  avgRating: number;
  reviewCount: number;
  minPrice: number;
  services: { name: string }[];
  isVerified: boolean;
  distanceMiles?: number;
};

function getInitials(name: string | null, businessName: string | null): string {
  const source = name || businessName || "PT";
  return source
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  "bg-primary text-primary-foreground",
  "bg-accent/20 text-accent-foreground",
  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
];

function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function TechnicianCard({
  id,
  name,
  businessName,
  city,
  state,
  yearsExperience,
  avgRating,
  reviewCount,
  minPrice,
  services,
  isVerified,
  distanceMiles,
}: Props) {
  const initials = getInitials(name, businessName);
  const displayName = name || businessName || "Piano Technician";
  const maxTags = 3;
  const visibleServices = services.slice(0, maxTags);
  const overflow = services.length - maxTags;

  return (
    <Link href={`/technicians/${id}`} className="block">
      <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${colorFromId(id)}`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-semibold text-foreground">
                {displayName}
              </h3>
              {isVerified && (
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {city && state && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {city}, {state}
                </span>
              )}
              {yearsExperience && (
                <span>{yearsExperience}yr exp</span>
              )}
              {distanceMiles != null && (
                <span className="text-xs text-accent font-medium">
                  {distanceMiles} mi away
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating + Instant Book */}
        <div className="mt-3 flex items-center gap-3">
          {reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="text-sm font-semibold text-foreground">
                {avgRating.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">({reviewCount})</span>
            </div>
          )}
          <span className="flex items-center gap-1 text-xs font-medium text-accent">
            <Zap className="h-3 w-3" />
            Instant Book
          </span>
        </div>

        {/* Service tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleServices.map((svc) => (
            <span
              key={svc.name}
              className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {svc.name}
            </span>
          ))}
          {overflow > 0 && (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              +{overflow}
            </span>
          )}
        </div>

        {/* Price */}
        {minPrice > 0 && (
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Starting at</span>
              <p className="text-xl font-bold text-foreground">
                ${(minPrice / 100).toFixed(0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
