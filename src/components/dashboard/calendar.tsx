"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarDayView } from "./calendar-day-view";
import { CalendarWeekView } from "./calendar-week-view";
import { CalendarMonthView } from "./calendar-month-view";
import { CalendarFilterBar } from "./calendar-filter-bar";
import {
  CalendarExceptionDialog,
  type ExceptionDialogState,
} from "./calendar-exception-dialog";
import { applyFilters, EMPTY_FILTERS, type CalendarException, type CalendarFilters } from "./calendar-utils";

export type CalendarBooking = {
  id: string;
  scheduledAt: string;
  durationMin: number;
  status: string;
  customerName: string;
  serviceName: string;
  services: string[];
  city: string;
  totalCents: number;
};

export type { CalendarException };

type View = "day" | "week" | "month";

export function Calendar({
  bookings,
  exceptions,
  initialDate,
  initialView,
  initialFilters,
}: {
  bookings: CalendarBooking[];
  exceptions: CalendarException[];
  initialDate: string;
  initialView: View;
  initialFilters?: CalendarFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>(initialView);
  const [date, setDate] = useState(new Date(initialDate));
  const [filters, setFilters] = useState<CalendarFilters>(initialFilters ?? EMPTY_FILTERS);
  const [dialogState, setDialogState] = useState<ExceptionDialogState | null>(null);

  const visibleBookings = useMemo(() => applyFilters(bookings, filters), [bookings, filters]);

  function pushState(newDate: Date, newView: View, newFilters: CalendarFilters) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "bookings");
    params.set("view", newView);
    params.set("date", format(newDate, "yyyy-MM-dd"));
    for (const key of ["service", "customer", "city"] as const) {
      if (newFilters[key]) params.set(key, newFilters[key]);
      else params.delete(key);
    }
    router.push(`/dashboard/technician?${params.toString()}`);
  }

  function navigate(direction: -1 | 1) {
    let newDate: Date;
    if (view === "day") newDate = addDays(date, direction);
    else if (view === "week") newDate = addWeeks(date, direction);
    else newDate = addMonths(date, direction);
    pushState(newDate, view, filters);
    setDate(newDate);
  }

  function changeView(newView: View) {
    setView(newView);
    pushState(date, newView, filters);
  }

  function goToday() {
    const today = new Date();
    setDate(today);
    pushState(today, view, filters);
  }

  function handleMonthDayClick(day: Date) {
    setDate(day);
    setView("day");
    pushState(day, "day", filters);
  }

  function handleFiltersChange(newFilters: CalendarFilters) {
    setFilters(newFilters);
    pushState(date, view, newFilters);
  }

  function handleSlotClick(clicked: Date) {
    setDialogState({
      mode: "create",
      date: format(clicked, "yyyy-MM-dd"),
      startTime: format(clicked, "HH:mm"),
    });
  }

  function handleExceptionClick(exception: CalendarException) {
    setDialogState({ mode: "view", exception });
  }

  function getDateLabel(): string {
    if (view === "day") return format(date, "EEEE, MMMM d, yyyy");
    if (view === "week") {
      const ws = startOfWeek(date, { weekStartsOn: 1 });
      const we = endOfWeek(date, { weekStartsOn: 1 });
      return `${format(ws, "MMM d")} - ${format(we, "MMM d, yyyy")}`;
    }
    return format(date, "MMMM yyyy");
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Today
          </button>
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-foreground ml-2">
            {getDateLabel()}
          </h2>
        </div>

        <div className="flex rounded-lg border border-border p-0.5">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <CalendarFilterBar bookings={bookings} filters={filters} onChange={handleFiltersChange} />

      {view === "day" && (
        <CalendarDayView
          date={date}
          bookings={visibleBookings}
          exceptions={exceptions}
          onSlotClick={handleSlotClick}
          onExceptionClick={handleExceptionClick}
        />
      )}
      {view === "week" && (
        <CalendarWeekView
          date={date}
          bookings={visibleBookings}
          exceptions={exceptions}
          onSlotClick={handleSlotClick}
          onExceptionClick={handleExceptionClick}
        />
      )}
      {view === "month" && (
        <CalendarMonthView
          date={date}
          bookings={visibleBookings}
          exceptions={exceptions}
          onDayClick={handleMonthDayClick}
          onExceptionClick={handleExceptionClick}
        />
      )}

      <CalendarExceptionDialog state={dialogState} onClose={() => setDialogState(null)} />
    </div>
  );
}
