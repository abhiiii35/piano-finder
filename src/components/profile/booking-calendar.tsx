"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { getAvailableSlots } from "@/actions/booking";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type AvailabilitySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

interface BookingCalendarProps {
  technicianId: string;
  availabilitySlots: AvailabilitySlot[];
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BookingCalendar({
  technicianId,
  availabilitySlots,
}: BookingCalendarProps) {
  const router = useRouter();
  const today = startOfDay(new Date());
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Set of days that have availability (0=Sun, 6=Sat)
  const availableDays = new Set(availabilitySlots.map((s) => s.dayOfWeek));

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Fetch available time slots when a date is selected
  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    getAvailableSlots(technicianId, dateStr).then((result) => {
      setSlots(result);
      setLoadingSlots(false);
    });
  }, [selectedDate, technicianId]);

  function handleDateClick(date: Date) {
    if (isBefore(date, today)) return;
    if (!availableDays.has(date.getDay())) return;
    setSelectedDate(date);
  }

  function handleTimeClick(time: string) {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    router.push(
      `/technicians/${technicianId}/book?date=${dateStr}&time=${time}`
    );
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          disabled={isBefore(addMonths(currentMonth, -1), startOfMonth(today))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const inMonth = isSameMonth(d, currentMonth);
          const isPast = isBefore(d, today);
          const hasAvailability = availableDays.has(d.getDay());
          const isSelected = selectedDate && isSameDay(d, selectedDate);
          const isToday = isSameDay(d, today);
          const disabled = !inMonth || isPast || !hasAvailability;

          return (
            <button
              key={i}
              onClick={() => !disabled && handleDateClick(d)}
              disabled={disabled}
              className={`
                relative flex flex-col items-center justify-center rounded-md p-1.5 text-sm
                transition-colors
                ${disabled ? "text-muted-foreground/40 cursor-not-allowed" : "hover:bg-muted cursor-pointer"}
                ${isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                ${isToday && !isSelected ? "font-bold" : ""}
                ${!inMonth ? "opacity-0" : ""}
              `}
            >
              {format(d, "d")}
              {inMonth && hasAvailability && !isPast && !isSelected && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="mt-4 border-t pt-4">
          <p className="text-sm font-medium mb-2">
            Available times for {format(selectedDate, "MMM d, yyyy")}
          </p>
          {loadingSlots ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : slots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((time) => (
                <Button
                  key={time}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTimeClick(time)}
                  className="text-xs"
                >
                  {time}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No available slots on this day
            </p>
          )}
        </div>
      )}
    </div>
  );
}
