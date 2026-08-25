"use client";

import { X } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalendarBooking } from "./calendar";
import { EMPTY_FILTERS, cityOptions, serviceOptions, type CalendarFilters } from "./calendar-utils";

export function CalendarFilterBar({
  bookings,
  filters,
  onChange,
}: {
  bookings: CalendarBooking[];
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
}) {
  const services = serviceOptions(bookings);
  const cities = cityOptions(bookings);
  const hasFilters = !!(filters.service || filters.customer || filters.city);

  function update(patch: Partial<CalendarFilters>) {
    onChange({ ...filters, ...patch });
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={filters.service}
          onChange={(v) => update({ service: v })}
          options={services.map((s) => ({ value: s, label: s }))}
          placeholder="All services"
        />
        <FilterSelect
          value={filters.city}
          onChange={(v) => update({ city: v })}
          options={cities.map((c) => ({ value: c, label: c }))}
          placeholder="All cities"
        />
        <Input
          value={filters.customer}
          onChange={(e) => update({ customer: e.target.value })}
          placeholder="Customer name"
          className="w-40"
        />
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
            Clear
          </Button>
        )}
      </div>

      {hasFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filters.service && (
            <Badge variant="secondary" className="gap-1">
              Service: {filters.service}
              <button onClick={() => update({ service: "" })} aria-label="Remove service filter">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.city && (
            <Badge variant="secondary" className="gap-1">
              City: {filters.city}
              <button onClick={() => update({ city: "" })} aria-label="Remove city filter">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.customer && (
            <Badge variant="secondary" className="gap-1">
              Customer: {filters.customer}
              <button onClick={() => update({ customer: "" })} aria-label="Remove customer filter">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
