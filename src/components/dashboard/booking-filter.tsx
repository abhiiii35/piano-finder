"use client";

import { useRouter } from "next/navigation";
import { FilterSelect } from "@/components/ui/filter-select";

const OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

export function BookingFilter({ currentFilter }: { currentFilter: string }) {
  const router = useRouter();

  return (
    <div className="mb-6">
      <FilterSelect
        value={currentFilter}
        onChange={(v) =>
          router.push(`/dashboard/technician?tab=bookings&filter=${v || "upcoming"}`)
        }
        options={OPTIONS}
        placeholder="Upcoming"
      />
    </div>
  );
}
