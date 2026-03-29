"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [state, setState] = useState(searchParams.get("state") ?? "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (state) params.set("state", state);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
      <Input
        placeholder="Search by name, city, or service..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="flex-1"
      />
      <Input
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="sm:w-40"
      />
      <Input
        placeholder="State"
        value={state}
        onChange={(e) => setState(e.target.value)}
        className="sm:w-24"
        maxLength={2}
      />
      <Button type="submit">
        <Search className="mr-2 h-4 w-4" />
        Search
      </Button>
    </form>
  );
}
