import { Suspense } from "react";
import { searchTechnicians } from "@/lib/queries/technicians";
import { geocode } from "@/lib/geocoding";
import { SearchFilters } from "@/components/search/search-filters";
import { TechnicianCard } from "@/components/search/technician-card";
import { Skeleton } from "@/components/ui/skeleton";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    radius?: string;
    sort?: string;
    availability?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Find Piano Tuners</h1>

      <div className="mt-6">
        <Suspense fallback={null}>
          <SearchFilters />
        </Suspense>
      </div>

      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults filters={params} />
      </Suspense>
    </div>
  );
}

async function SearchResults({
  filters,
}: {
  filters: {
    q?: string;
    radius?: string;
    sort?: string;
    availability?: string;
  };
}) {
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
  const availabilityWindow = filters.availability as
    | "today"
    | "this-week"
    | "this-weekend"
    | "next-2-weeks"
    | undefined;

  const technicians = await searchTechnicians({
    q: filters.q,
    lat,
    lng,
    radiusMiles,
    availabilityWindow,
  });

  // Filter to only available technicians if availability window is active
  const displayTechnicians =
    availabilityWindow && technicians.length > 0
      ? technicians.filter((t) => "nextAvailableAt" in t && t.nextAvailableAt)
      : technicians;

  const emptyMessage =
    availabilityWindow && technicians.length > 0 && displayTechnicians.length === 0
      ? `No tuners free ${availabilityWindow.replace("-", " ")} — showing next available`
      : "No technicians found";

  const messageTechnicians =
    availabilityWindow && technicians.length > 0 && displayTechnicians.length === 0
      ? technicians
      : displayTechnicians;

  if (messageTechnicians.length === 0) {
    return (
      <div className="mt-16 text-center">
        <p className="text-lg font-medium text-foreground">{emptyMessage}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search filters or broadening your location
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mt-4 text-sm text-muted-foreground">
        {messageTechnicians.length} technician{messageTechnicians.length !== 1 ? "s" : ""}{" "}
        {availabilityWindow ? "available" : "found"}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {messageTechnicians.map((tech) => (
          <TechnicianCard
            key={tech.id}
            id={tech.id}
            name={tech.user.name}
            businessName={tech.businessName}
            city={tech.city}
            state={tech.state}
            yearsExperience={tech.yearsExperience}
            avgRating={tech.avgRating}
            reviewCount={tech.reviewCount}
            minPrice={tech.minPrice}
            services={tech.services.map((s) => ({ name: s.name }))}
            isVerified={tech.isVerified}
            distanceMiles={tech.distanceMiles}
            nextAvailableAt={"nextAvailableAt" in tech ? tech.nextAvailableAt : undefined}
          />
        ))}
      </div>
    </>
  );
}

function SearchSkeleton() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-xl border border-border p-5">
          <div className="flex gap-3">
            <Skeleton className="h-11 w-11 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
            <Skeleton className="mt-2 h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
