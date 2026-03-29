"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FilterSelect } from "@/components/ui/filter-select";
import { SERVICE_TYPES } from "@/lib/constants";

const OPTIONS = SERVICE_TYPES.map((s) => ({ value: s, label: s }));

export function ServiceFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("service") ?? "";

  return (
    <FilterSelect
      value={current}
      onChange={(v) => router.push(v ? `/jobs?service=${v}` : "/jobs")}
      options={OPTIONS}
      placeholder="All Services"
    />
  );
}
