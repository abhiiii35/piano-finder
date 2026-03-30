"use client";

import Link from "next/link";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";

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
const HOUR_HEIGHT = 48;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 border-amber-300 text-amber-800",
  CONFIRMED: "bg-blue-100 border-blue-300 text-blue-800",
  IN_PROGRESS: "bg-purple-100 border-purple-300 text-purple-800",
  COMPLETED: "bg-emerald-100 border-emerald-300 text-emerald-800",
  CANCELLED: "bg-slate-100 border-slate-300 text-slate-500",
};

export function CalendarWeekView({
  date,
  bookings,
}: {
  date: Date;
  bookings: CalendarBooking[];
}) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i
  );

  function getBookingsForDay(day: Date) {
    return bookings.filter((b) => isSameDay(new Date(b.scheduledAt), day));
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b border-slate-200">
        <div />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`px-2 py-2 text-center text-xs font-medium ${
              isToday(day) ? "bg-amber-50 text-amber-700" : "text-slate-600"
            }`}
          >
            <div>{format(day, "EEE")}</div>
            <div className={`text-lg font-semibold ${isToday(day) ? "text-amber-700" : "text-slate-900"}`}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-[4rem_repeat(7,1fr)]" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
        <div className="relative">
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-t border-slate-100 px-1 py-0.5 text-[10px] text-slate-400"
              style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
            >
              {format(new Date(2026, 0, 1, hour, 0), "h a")}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayBookings = getBookingsForDay(day);
          return (
            <div key={day.toISOString()} className="relative border-l border-slate-100">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-slate-50"
                  style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                />
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
                    className={`absolute inset-x-0.5 rounded border px-1 py-0.5 text-[10px] leading-tight transition-opacity hover:opacity-80 overflow-hidden ${colors}`}
                    style={{
                      top: `${Math.max(topPx, 0)}px`,
                      height: `${Math.max(heightPx, 16)}px`,
                    }}
                  >
                    <p className="font-semibold truncate">{booking.customerName}</p>
                    <p className="truncate">{booking.serviceName}</p>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
