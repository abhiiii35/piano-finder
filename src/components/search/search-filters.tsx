"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "rating");
  const [radius, setRadius] = useState(searchParams.get("radius") ?? "25");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    if (radius) params.set("radius", radius);
    router.push(`/search?${params.toString()}`);
  }

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSort(e.target.value);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("sort", e.target.value);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSearch}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 focus-within:border-border focus-within:ring-1 focus-within:ring-ring">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          placeholder="City or zip code"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <div className="relative">
        <select
          className="appearance-none rounded-lg border border-border bg-card py-2.5 pl-3 pr-8 text-sm text-foreground focus:border-border focus:outline-none focus:ring-1 focus:ring-ring"
          defaultValue=""
        >
          <option value="">All Services</option>
          <option value="tuning">Tuning</option>
          <option value="repair">Repair</option>
          <option value="regulation">Regulation</option>
          <option value="voicing">Voicing</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      <div className="relative">
        <select
          value={sort}
          onChange={handleSortChange}
          className="appearance-none rounded-lg border border-border bg-card py-2.5 pl-3 pr-8 text-sm text-foreground focus:border-border focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="rating">Top Rated</option>
          <option value="price">Lowest Price</option>
          <option value="experience">Most Experienced</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      <FilterSelect
        value={radius}
        onChange={(v) => {
          setRadius(v || "25");
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (sort) params.set("sort", sort);
          params.set("radius", v || "25");
          router.push(`/search?${params.toString()}`);
        }}
        options={[
          { value: "10", label: "Within 10 mi" },
          { value: "25", label: "Within 25 mi" },
          { value: "50", label: "Within 50 mi" },
          { value: "100", label: "Within 100 mi" },
        ]}
        placeholder="Within 25 mi"
      />
    </form>
  );
}
