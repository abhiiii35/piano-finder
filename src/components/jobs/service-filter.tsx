"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function ServiceFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("service") ?? "";

  return (
    <div className="relative inline-block">
      <select
        name="service"
        defaultValue={current}
        onChange={(e) => {
          const url = e.target.value
            ? `/jobs?service=${e.target.value}`
            : "/jobs";
          router.push(url);
        }}
        className="appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
      >
        <option value="">All Services</option>
        <option value="Tuning">Tuning</option>
        <option value="Repair">Repair</option>
        <option value="Regulation">Regulation</option>
        <option value="Voicing">Voicing</option>
        <option value="Appraisal">Appraisal</option>
        <option value="Other">Other</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
