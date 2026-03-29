import { Suspense } from "react";
import { searchTechnicians } from "@/lib/queries/technicians";
import { SearchFilters } from "@/components/search/search-filters";
import { TechnicianCard } from "@/components/search/technician-card";
import { Skeleton } from "@/components/ui/skeleton";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; state?: string; sort?: string }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Find Piano Tuners</h1>

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
  filters: { q?: string; city?: string; state?: string; sort?: string };
}) {
  const technicians = await searchTechnicians(filters);

  if (technicians.length === 0) {
    return (
      <div className="mt-16 text-center">
        <p className="text-lg font-medium text-slate-900">
          No technicians found
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Try adjusting your search filters or broadening your location
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mt-4 text-sm text-slate-500">
        {technicians.length} technician{technicians.length !== 1 ? "s" : ""}{" "}
        available
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {technicians.map((tech) => (
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
        <div key={i} className="rounded-xl border border-slate-200 p-5">
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
