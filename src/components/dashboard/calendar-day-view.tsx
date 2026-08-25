"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  EXCEPTION_CLASSES,
  EXCEPTION_HATCH_STYLE,
  getExceptionsForDay,
  type CalendarException,
} from "./calendar-utils";

export type CalendarBooking = {
  id: string;
  scheduledAt: string;
  durationMin: number;
  status: string;
  customerName: string;
  serviceName: string;
  totalCents: number;
};

const START_HOUR = 6;
const END_HOUR = 20;
const HOUR_HEIGHT = 60;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 border-amber-300 text-amber-800",
  CONFIRMED: "bg-blue-100 border-blue-300 text-blue-800",
  IN_PROGRESS: "bg-purple-100 border-purple-300 text-purple-800",
  COMPLETED: "bg-emerald-100 border-emerald-300 text-emerald-800",
  CANCELLED: "bg-slate-100 border-slate-300 text-slate-500",
};

export function CalendarDayView({
  date,
  bookings,
  exceptions,
  onSlotClick,
  onExceptionClick,
}: {
  date: Date;
  bookings: CalendarBooking[];
  exceptions: CalendarException[];
  onSlotClick: (date: Date) => void;
  onExceptionClick: (exception: CalendarException) => void;
}) {
  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i
  );

  const dayBookings = bookings.filter((b) => {
    const bDate = new Date(b.scheduledAt);
    return (
      bDate.getFullYear() === date.getFullYear() &&
      bDate.getMonth() === date.getMonth() &&
      bDate.getDate() === date.getDate()
    );
  });

  const dayExceptions = getExceptionsForDay(exceptions, date);
  const allDayExceptions = dayExceptions.filter((e) => e.allDay);
  const timedExceptions = dayExceptions.filter((e) => !e.allDay);

  return (
    <div className="relative border border-border rounded-lg bg-card overflow-hidden">
      <div className="relative" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute w-full border-t border-border flex"
            style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
          >
            <span className="w-16 shrink-0 px-2 py-1 text-xs text-muted-foreground">
              {format(new Date(2026, 0, 1, hour, 0), "h a")}
            </span>
            <button
              type="button"
              onClick={() =>
                onSlotClick(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0))
              }
              className="flex-1 cursor-pointer text-left hover:bg-secondary/40"
              aria-label={`Add time off at ${format(new Date(2026, 0, 1, hour, 0), "h a")}`}
            />
          </div>
        ))}

        {allDayExceptions.map((exception) => (
          <button
            key={exception.id}
            type="button"
            onClick={() => onExceptionClick(exception)}
            className={`absolute left-16 right-2 top-0 bottom-0 flex items-start justify-start rounded-md border px-2 py-1 text-left text-xs font-medium ${EXCEPTION_CLASSES}`}
            style={EXCEPTION_HATCH_STYLE}
          >
            {exception.reason || "Unavailable"}
          </button>
        ))}

        {dayBookings.map((booking) => {
          const bDate = new Date(booking.scheduledAt);
          const startMin = bDate.getHours() * 60 + bDate.getMinutes();
          const topPx = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
          const heightPx = (booking.durationMin / 60) * HOUR_HEIGHT;
          const colors = STATUS_COLORS[booking.status] ?? STATUS_COLORS.CONFIRMED;

          return (
            <Link
              key={booking.id}
              href={`/dashboard/technician/bookings/${booking.id}`}
              className={`absolute left-16 right-2 rounded-md border px-2 py-1 text-xs transition-opacity hover:opacity-80 ${colors}`}
              style={{
                top: `${Math.max(topPx, 0)}px`,
                height: `${Math.max(heightPx, 20)}px`,
              }}
            >
              <p className="font-semibold truncate">{booking.customerName}</p>
              <p className="truncate">{booking.serviceName}</p>
              <p>{format(bDate, "h:mm a")}</p>
            </Link>
          );
        })}

        {timedExceptions.map((exception) => {
          const start = new Date(exception.startsAt);
          const end = new Date(exception.endsAt);
          const startMin = start.getHours() * 60 + start.getMinutes();
          const topPx = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
          const heightPx = ((end.getTime() - start.getTime()) / 60000 / 60) * HOUR_HEIGHT;

          return (
            <button
              key={exception.id}
              type="button"
              onClick={() => onExceptionClick(exception)}
              className={`absolute left-16 right-2 rounded-md border px-2 py-1 text-left text-xs ${EXCEPTION_CLASSES}`}
              style={{
                top: `${Math.max(topPx, 0)}px`,
                height: `${Math.max(heightPx, 20)}px`,
                ...EXCEPTION_HATCH_STYLE,
              }}
            >
              <p className="font-semibold truncate">{exception.reason || "Unavailable"}</p>
              <p>{format(start, "h:mm a")} – {format(end, "h:mm a")}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
