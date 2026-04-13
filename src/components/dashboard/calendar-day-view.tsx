"use client";

import Link from "next/link";
import { format } from "date-fns";

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
}: {
  date: Date;
  bookings: CalendarBooking[];
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
            <div className="flex-1" />
          </div>
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
      </div>
    </div>
  );
}
