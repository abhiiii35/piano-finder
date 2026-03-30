"use client";

import { useState } from "react";
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

export type CalendarBooking = {
  id: string;
  scheduledAt: string;
  durationMin: number;
  status: string;
  customerName: string;
  serviceName: string;
  totalCents: number;
};

type View = "day" | "week" | "month";

export function Calendar({
  bookings,
  initialDate,
  initialView,
}: {
  bookings: CalendarBooking[];
  initialDate: string;
  initialView: View;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>(initialView);
  const [date, setDate] = useState(new Date(initialDate));

  function navigate(direction: -1 | 1) {
    let newDate: Date;
    if (view === "day") newDate = addDays(date, direction);
    else if (view === "week") newDate = addWeeks(date, direction);
    else newDate = addMonths(date, direction);
    updateUrl(newDate, view);
    setDate(newDate);
  }

  function updateUrl(newDate: Date, newView: View) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "bookings");
    params.set("view", newView);
    params.set("date", format(newDate, "yyyy-MM-dd"));
    router.push(`/dashboard/technician?${params.toString()}`);
  }

  function changeView(newView: View) {
    setView(newView);
    updateUrl(date, newView);
  }

  function goToday() {
    const today = new Date();
    setDate(today);
    updateUrl(today, view);
  }

  function handleMonthDayClick(day: Date) {
    setDate(day);
    setView("day");
    updateUrl(day, "day");
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
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-slate-900 ml-2">
            {getDateLabel()}
          </h2>
        </div>

        <div className="flex rounded-lg border border-slate-200 p-0.5">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                view === v
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === "day" && <CalendarDayView date={date} bookings={bookings} />}
      {view === "week" && <CalendarWeekView date={date} bookings={bookings} />}
      {view === "month" && (
        <CalendarMonthView
          date={date}
          bookings={bookings}
          onDayClick={handleMonthDayClick}
        />
      )}
    </div>
  );
}
