import { format, isSameDay } from "date-fns";
import type { CSSProperties } from "react";
import type { CalendarBooking } from "./calendar";

export type CalendarException = {
  id: string;
  startsAt: string; // ISO
  endsAt: string; // ISO, exclusive (matches AvailabilityException convention)
  allDay: boolean;
  reason: string | null;
};

// Shared grey/hatched look for time-off blocks — deliberately distinct from
// booking status colors (STATUS_COLORS in the calendar-*-view files).
export const EXCEPTION_CLASSES =
  "border-slate-400 bg-slate-200/80 text-slate-600 dark:border-slate-500 dark:bg-slate-700/60 dark:text-slate-300";
export const EXCEPTION_HATCH_STYLE: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, rgba(100,116,139,0.18) 0px, rgba(100,116,139,0.18) 6px, transparent 6px, transparent 12px)",
};

export type CalendarFilters = {
  service: string;
  customer: string;
  city: string;
};

export const EMPTY_FILTERS: CalendarFilters = {
  service: "",
  customer: "",
  city: "",
};

export function applyFilters(
  bookings: CalendarBooking[],
  filters: CalendarFilters
): CalendarBooking[] {
  const customer = filters.customer.trim().toLowerCase();
  return bookings.filter((b) => {
    if (filters.service && !b.services.includes(filters.service)) return false;
    if (filters.city && b.city !== filters.city) return false;
    if (customer && !b.customerName.toLowerCase().includes(customer)) return false;
    return true;
  });
}

export function serviceOptions(bookings: CalendarBooking[]): string[] {
  return Array.from(new Set(bookings.flatMap((b) => b.services))).sort();
}

export function cityOptions(bookings: CalendarBooking[]): string[] {
  return Array.from(new Set(bookings.map((b) => b.city))).sort();
}

// ─── Exception day mapping ──────────────────────────────────────
// endsAt is an EXCLUSIVE boundary: a block ending at midnight covers the
// prior day but not the day that midnight starts.
export function exceptionCoversDay(exception: CalendarException, day: Date): boolean {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const startsAt = new Date(exception.startsAt);
  const endsAt = new Date(exception.endsAt);
  return startsAt < dayEnd && endsAt > dayStart;
}

export function getExceptionsForDay(
  exceptions: CalendarException[],
  day: Date
): CalendarException[] {
  return exceptions.filter((e) => exceptionCoversDay(e, day));
}

// Last calendar day actually covered by an all-day block (endsAt is midnight
// AFTER the last day, so subtract 1ms before flooring to a day).
export function exceptionDayBounds(exception: CalendarException) {
  const start = new Date(exception.startsAt);
  const end = new Date(new Date(exception.endsAt).getTime() - 1);
  return {
    startDay: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
    endDay: new Date(end.getFullYear(), end.getMonth(), end.getDate()),
  };
}

export function formatExceptionSpan(exception: CalendarException): string {
  if (exception.allDay) {
    const { startDay, endDay } = exceptionDayBounds(exception);
    return isSameDay(startDay, endDay)
      ? format(startDay, "EEEE, MMMM d, yyyy")
      : `${format(startDay, "MMM d")} – ${format(endDay, "MMM d, yyyy")}`;
  }
  const start = new Date(exception.startsAt);
  const end = new Date(exception.endsAt);
  return `${format(start, "EEEE, MMMM d, yyyy")}, ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
}

// ─── Quick-create payload ───────────────────────────────────────
// Shapes UI form state into createAvailabilityException's input, trimming
// unused optional fields so the server schema's refinements pass cleanly.
export function buildExceptionInput(form: {
  date: string;
  allDay: boolean;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}): {
  date: string;
  allDay: boolean;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
} {
  const reason = form.reason?.trim();
  return {
    date: form.date,
    allDay: form.allDay,
    endDate: form.allDay && form.endDate ? form.endDate : undefined,
    startTime: form.allDay ? undefined : form.startTime,
    endTime: form.allDay ? undefined : form.endTime,
    reason: reason ? reason : undefined,
  };
}
