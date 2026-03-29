import { Suspense } from "react";
import { searchTechnicians } from "@/lib/queries/technicians";
import { SearchFilters } from "@/components/search/search-filters";
import { TechnicianCard } from "@/components/search/technician-card";
import { Skeleton } from "@/components/ui/skeleton";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; state?: string }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <h1 className="text-3xl font-bold">Find a Piano Tuner</h1>
      <p className="mt-2 text-muted-foreground">
        Search for verified piano technicians in your area
      </p>

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
  filters: { q?: string; city?: string; state?: string };
}) {
  const technicians = await searchTechnicians(filters);

  if (technicians.length === 0) {
    return (
      <div className="mt-12 text-center">
        <p className="text-lg font-medium">No technicians found</p>
        <p className="mt-1 text-muted-foreground">
          Try adjusting your search filters
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4">
      {technicians.map((tech) => (
        <TechnicianCard
          key={tech.id}
          id={tech.id}
          name={tech.user.name}
          businessName={tech.businessName}
          city={tech.city}
          state={tech.state}
          avgRating={tech.avgRating}
          reviewCount={tech.reviewCount}
          minPrice={tech.minPrice}
          serviceCount={tech.services.length}
          isVerified={tech.isVerified}
        />
      ))}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="mt-8 grid gap-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="rounded-lg border p-6">
          <div className="flex gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
