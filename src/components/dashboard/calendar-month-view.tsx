"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from "date-fns";
import { createAvailabilityException } from "@/actions/availability-exception";
import {
  EXCEPTION_CLASSES,
  EXCEPTION_HATCH_STYLE,
  exceptionDayBounds,
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

export function CalendarMonthView({
  date,
  bookings,
  exceptions,
  onDayClick,
  onExceptionClick,
}: {
  date: Date;
  bookings: CalendarBooking[];
  exceptions: CalendarException[];
  onDayClick: (day: Date) => void;
  onExceptionClick: (exception: CalendarException) => void;
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let current = calStart;
  while (current <= calEnd) {
    days.push(current);
    current = addDays(current, 1);
  }

  function getBookingCount(day: Date): number {
    return bookings.filter((b) => isSameDay(new Date(b.scheduledAt), day)).length;
  }

  async function handleMarkUnavailable(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    setPendingKey(key);
    const result = await createAvailabilityException({ date: key, allDay: true });
    setPendingKey(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`${format(day, "MMM d")} marked unavailable`);
    router.refresh();
  }

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const count = getBookingCount(day);
          const inMonth = isSameMonth(day, date);
          const today = isToday(day);
          const dayExceptions = getExceptionsForDay(exceptions, day).filter((e) => e.allDay);
          const dayKey = format(day, "yyyy-MM-dd");

          return (
            <div
              key={dayKey}
              className={`group relative h-20 border-b border-r border-border p-1.5 text-left transition-colors hover:bg-secondary ${
                !inMonth ? "bg-secondary/50" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onDayClick(day)}
                className="absolute inset-0"
                aria-label={`View ${format(day, "MMMM d, yyyy")}`}
              />

              <div className="relative flex items-start justify-between">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    today
                      ? "bg-accent text-accent-foreground"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkUnavailable(day);
                  }}
                  disabled={pendingKey === dayKey}
                  title="Mark day unavailable"
                  aria-label={`Mark ${format(day, "MMMM d")} unavailable`}
                  className="relative z-10 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-secondary hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                >
                  <Ban className="h-3.5 w-3.5" />
                </button>
              </div>

              {count > 0 && (
                <div className="relative mt-1">
                  <span className="pointer-events-none inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    {count} appt{count !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {dayExceptions.length > 0 && (
                <div className="relative mt-1 space-y-0.5">
                  {dayExceptions.map((exception) => {
                    const { startDay, endDay } = exceptionDayBounds(exception);
                    const roundLeft = isSameDay(day, startDay) || day.getDay() === 1;
                    const roundRight = isSameDay(day, endDay) || day.getDay() === 0;
                    const showLabel = isSameDay(day, startDay) || day.getDay() === 1;

                    return (
                      <button
                        key={exception.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExceptionClick(exception);
                        }}
                        className={`relative z-10 block w-[calc(100%+0.75rem)] -mx-1.5 truncate px-1.5 py-0.5 text-left text-[10px] font-medium border-y ${EXCEPTION_CLASSES} ${
                          roundLeft ? "rounded-l-full border-l" : ""
                        } ${roundRight ? "rounded-r-full border-r" : ""}`}
                        style={EXCEPTION_HATCH_STYLE}
                      >
                        {showLabel ? exception.reason || "Unavailable" : " "}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
