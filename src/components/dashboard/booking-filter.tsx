"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function BookingFilter({ currentFilter }: { currentFilter: string }) {
  const router = useRouter();

  return (
    <div className="relative mb-6 inline-block">
      <select
        defaultValue={currentFilter}
        onChange={(e) => {
          router.push(`/dashboard/technician?tab=bookings&filter=${e.target.value}`);
        }}
        className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
      >
        <option value="upcoming">Upcoming</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="all">All</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
