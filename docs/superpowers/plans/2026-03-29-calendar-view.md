# Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat bookings list on the technician dashboard with a calendar supporting day, week, and month views.

**Architecture:** Custom Tailwind calendar components. Server component fetches bookings for the date range, passes serialized data to a client component that handles view toggling, navigation, and rendering. Three sub-view components share a common booking block type.

**Tech Stack:** Next.js 16, Tailwind CSS, date-fns, Lucide icons

---

### Shared Type

All calendar components use this booking type (defined in the main calendar component):

```typescript
export type CalendarBooking = {
  id: string;
  scheduledAt: string; // ISO string (serialized from server)
  durationMin: number;
  status: string;
  customerName: string;
  serviceName: string;
  totalCents: number;
};
```

---

### Task 1: Calendar day view component

**Files:**
- Create: `src/components/dashboard/calendar-day-view.tsx`

- [ ] **Step 1: Create the day view component**

```typescript
// src/components/dashboard/calendar-day-view.tsx
"use client";

import Link from "next/link";
import { format } from "date-fns";
import { type CalendarBooking } from "./calendar";

const START_HOUR = 6;
const END_HOUR = 20;
const HOUR_HEIGHT = 60; // px per hour

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
    <div className="relative border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Time labels + grid */}
      <div className="relative" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute w-full border-t border-slate-100 flex"
            style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
          >
            <span className="w-16 shrink-0 px-2 py-1 text-xs text-slate-400">
              {format(new Date().setHours(hour, 0), "h a")}
            </span>
            <div className="flex-1" />
          </div>
        ))}

        {/* Booking blocks */}
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
```

- [ ] **Step 2: Verify no TypeScript errors**

This file imports `CalendarBooking` from `./calendar` which doesn't exist yet — that's OK, we'll create it in Task 4. For now just verify the file is saved correctly.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/calendar-day-view.tsx
git commit -m "feat: add calendar day view component

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Calendar week view component

**Files:**
- Create: `src/components/dashboard/calendar-week-view.tsx`

- [ ] **Step 1: Create the week view component**

```typescript
// src/components/dashboard/calendar-week-view.tsx
"use client";

import Link from "next/link";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { type CalendarBooking } from "./calendar";

const START_HOUR = 6;
const END_HOUR = 20;
const HOUR_HEIGHT = 48; // slightly shorter for week view

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
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
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
      {/* Day headers */}
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

      {/* Time grid */}
      <div className="relative grid grid-cols-[4rem_repeat(7,1fr)]" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
        {/* Hour labels */}
        <div className="relative">
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-t border-slate-100 px-1 py-0.5 text-[10px] text-slate-400"
              style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
            >
              {format(new Date().setHours(hour, 0), "h a")}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dayBookings = getBookingsForDay(day);
          return (
            <div key={day.toISOString()} className="relative border-l border-slate-100">
              {/* Hour grid lines */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-slate-50"
                  style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                />
              ))}

              {/* Booking blocks */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/calendar-week-view.tsx
git commit -m "feat: add calendar week view component

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Calendar month view component

**Files:**
- Create: `src/components/dashboard/calendar-month-view.tsx`

- [ ] **Step 1: Create the month view component**

```typescript
// src/components/dashboard/calendar-month-view.tsx
"use client";

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
import { type CalendarBooking } from "./calendar";

export function CalendarMonthView({
  date,
  bookings,
  onDayClick,
}: {
  date: Date;
  bookings: CalendarBooking[];
  onDayClick: (day: Date) => void;
}) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Build array of all days in the calendar grid
  const days: Date[] = [];
  let current = calStart;
  while (current <= calEnd) {
    days.push(current);
    current = addDays(current, 1);
  }

  function getBookingCount(day: Date): number {
    return bookings.filter((b) => isSameDay(new Date(b.scheduledAt), day)).length;
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Day of week headers */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-medium text-slate-500"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const count = getBookingCount(day);
          const inMonth = isSameMonth(day, date);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`h-20 border-b border-r border-slate-100 p-1.5 text-left transition-colors hover:bg-slate-50 ${
                !inMonth ? "bg-slate-50/50" : ""
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  today
                    ? "bg-amber-500 text-white"
                    : inMonth
                      ? "text-slate-900"
                      : "text-slate-400"
                }`}
              >
                {format(day, "d")}
              </span>
              {count > 0 && (
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    {count} appt{count !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/calendar-month-view.tsx
git commit -m "feat: add calendar month view component

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Main calendar component with view toggle and navigation

**Files:**
- Create: `src/components/dashboard/calendar.tsx`

- [ ] **Step 1: Create the main calendar component**

```typescript
// src/components/dashboard/calendar.tsx
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
  startOfMonth,
  endOfMonth,
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
    updateDate(newDate);
  }

  function updateDate(newDate: Date) {
    setDate(newDate);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "bookings");
    params.set("view", view);
    params.set("date", format(newDate, "yyyy-MM-dd"));
    router.push(`/dashboard/technician?${params.toString()}`);
  }

  function changeView(newView: View) {
    setView(newView);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "bookings");
    params.set("view", newView);
    params.set("date", format(date, "yyyy-MM-dd"));
    router.push(`/dashboard/technician?${params.toString()}`);
  }

  function goToday() {
    updateDate(new Date());
  }

  function handleMonthDayClick(day: Date) {
    setDate(day);
    setView("day");
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "bookings");
    params.set("view", "day");
    params.set("date", format(day, "yyyy-MM-dd"));
    router.push(`/dashboard/technician?${params.toString()}`);
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
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Navigation */}
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

        {/* View toggle */}
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

      {/* View content */}
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
```

- [ ] **Step 2: Build to verify all components compile**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/calendar.tsx
git commit -m "feat: add main calendar component with view toggle and navigation

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Integrate calendar into technician dashboard

**Files:**
- Modify: `src/app/(dashboard)/dashboard/technician/page.tsx`

- [ ] **Step 1: Read the current file**

Read `src/app/(dashboard)/dashboard/technician/page.tsx` to see the full current content.

- [ ] **Step 2: Update the page**

Make these changes:

1. Add `view` and `date` to the `searchParams` type:

```typescript
searchParams: Promise<{ tab?: string; filter?: string; view?: string; date?: string }>;
```

2. Add imports:

```typescript
import { Calendar, type CalendarBooking } from "@/components/dashboard/calendar";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";
```

3. Read view and date params after extracting `activeTab`:

```typescript
const calendarView = (params.view ?? "week") as "day" | "week" | "month";
const calendarDate = params.date ? new Date(params.date) : new Date();
```

4. Replace the bookings query. Instead of the old `tabBookings` query that uses `bookingStatusFilter`, compute a date range based on the calendar view and fetch bookings in that range:

```typescript
let dateStart: Date;
let dateEnd: Date;
if (calendarView === "day") {
  dateStart = new Date(calendarDate);
  dateStart.setHours(0, 0, 0, 0);
  dateEnd = new Date(calendarDate);
  dateEnd.setHours(23, 59, 59, 999);
} else if (calendarView === "week") {
  dateStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
  dateEnd = endOfWeek(calendarDate, { weekStartsOn: 1 });
} else {
  dateStart = startOfMonth(calendarDate);
  dateStart = startOfWeek(dateStart, { weekStartsOn: 1 });
  dateEnd = endOfMonth(calendarDate);
  dateEnd = endOfWeek(dateEnd, { weekStartsOn: 1 });
}

const tabBookings: CalendarBooking[] =
  activeTab === "bookings"
    ? (
        await prisma.booking.findMany({
          where: {
            technicianId: profile.id,
            scheduledAt: { gte: dateStart, lte: dateEnd },
            status: {
              in: filter === "all"
                ? ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
                : filter === "completed"
                  ? ["COMPLETED"]
                  : filter === "cancelled"
                    ? ["CANCELLED"]
                    : ["CONFIRMED", "PENDING", "IN_PROGRESS"],
            },
          },
          include: {
            customer: { select: { name: true, email: true } },
            services: { include: { service: true } },
          },
          orderBy: { scheduledAt: "asc" },
        })
      ).map((b) => ({
        id: b.id,
        scheduledAt: b.scheduledAt.toISOString(),
        durationMin: b.durationMin,
        status: b.status,
        customerName: b.customer.name ?? b.customer.email ?? "Customer",
        serviceName: b.services.map((s) => s.service.name).join(", "),
        totalCents: b.totalCents,
      }))
    : [];
```

5. Replace the bookings tab render content (the `{activeTab === "bookings" && (...)}` block) with:

```tsx
{activeTab === "bookings" && (
  <>
    <BookingFilter currentFilter={filter} />
    <Calendar
      bookings={tabBookings}
      initialDate={format(calendarDate, "yyyy-MM-dd")}
      initialView={calendarView}
    />
  </>
)}
```

6. Remove the now-unused `bookingStatusFilter` object and the old booking list JSX (the `tabBookings.length === 0` empty state and the `.map()` rendering booking cards).

7. Remove unused imports: `Badge` (if no longer used elsewhere in the file).

- [ ] **Step 3: Build and run tests**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx next build && npx vitest run`
Expected: Build succeeds, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/technician/page.tsx
git commit -m "feat: replace bookings list with calendar view on technician dashboard

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: E2e test update and final verification

**Files:**
- Modify: `e2e/dashboard.spec.ts`

- [ ] **Step 1: Update the dashboard e2e test**

In `e2e/dashboard.spec.ts`, the "shows dashboard with stats and tabs" test for Technician Dashboard currently checks for `text=Today` and `text=Pending`. The calendar adds a "Today" button that could conflict. Update the test to be more specific:

Read the file first, then update the technician test to verify the calendar renders:

```typescript
test("shows calendar on bookings tab", async ({ page }) => {
  await signIn(page, "tech@test.com", "password123");
  // Calendar should render with view toggle buttons
  await expect(page.locator("button", { hasText: "Day" })).toBeVisible();
  await expect(page.locator("button", { hasText: "Week" })).toBeVisible();
  await expect(page.locator("button", { hasText: "Month" })).toBeVisible();
});
```

- [ ] **Step 2: Run full unit test suite**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Run build**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx next build`
Expected: Build succeeds

- [ ] **Step 4: Run e2e tests**

Run:
```bash
source ~/.nvm/nvm.sh && nvm use 20
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null
npx tsx e2e/seed-test-db.ts && npx playwright test
```
Expected: All e2e tests pass

- [ ] **Step 5: Commit**

```bash
git add e2e/dashboard.spec.ts
git commit -m "test: add e2e test for calendar view toggle

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
