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
  "bg-slate-800 text-white",
  "bg-amber-100 text-amber-800",
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-purple-100 text-purple-800",
  "bg-rose-100 text-rose-800",
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
      <div className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${colorFromId(id)}`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-semibold text-slate-900">
                {displayName}
              </h3>
              {isVerified && (
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
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
                <span className="text-xs text-amber-600 font-medium">
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
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-slate-900">
                {avgRating.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">({reviewCount})</span>
            </div>
          )}
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
            <Zap className="h-3 w-3" />
            Instant Book
          </span>
        </div>

        {/* Service tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleServices.map((svc) => (
            <span
              key={svc.name}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
            >
              {svc.name}
            </span>
          ))}
          {overflow > 0 && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
              +{overflow}
            </span>
          )}
        </div>

        {/* Price */}
        {minPrice > 0 && (
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400">Starting at</span>
              <p className="text-xl font-bold text-slate-900">
                ${(minPrice / 100).toFixed(0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
