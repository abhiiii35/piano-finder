# Calendar View Design

## Problem

The technician dashboard shows bookings as a flat list. Technicians can't visualize their day, see gaps in their schedule, or plan their week at a glance. The PRD's core value prop is "replace Google Calendar" — a calendar view is essential.

## Solution

Replace the Bookings tab content on the technician dashboard with a calendar that supports three views: day, week, and month. Custom-built with Tailwind (no library dependency).

## Architecture

### View Toggle

Three buttons at the top: Day / Week / Month. Default to week view. Selected view stored in URL params (`?tab=bookings&view=week&date=2026-03-29`).

### Navigation

- Left/right arrows to navigate by day/week/month depending on current view
- "Today" button to jump to current date
- Date range displayed as heading (e.g., "March 24 - 30, 2026" for week view)

### Day View

- Single column with hourly time slots from 6am to 8pm
- Booking blocks positioned at their `scheduledAt` time
- Block height proportional to `durationMin`
- Each block shows: customer name, service name, time
- Clicking a block navigates to `/dashboard/technician/bookings/[id]`

### Week View

- 7-column grid (Monday through Sunday)
- Column headers show day name + date, current day highlighted
- Same hourly rows as day view
- Booking blocks rendered in the correct column and time position
- Narrower blocks than day view to fit 7 columns

### Month View

- Standard month grid (6 rows x 7 columns)
- Each day cell shows the count of bookings for that day
- Days with bookings show a colored dot or count badge
- Clicking a day switches to day view for that date
- Current day highlighted, days outside the month grayed out

### Data Flow

- Server component fetches bookings for the appropriate date range based on the view:
  - Day: single day
  - Week: 7 days starting from the week's Monday
  - Month: full calendar month (may include days from adjacent months)
- Bookings passed as serialized props to a client component that handles rendering, view toggling, and navigation
- Status filter dropdown stays — filters which bookings appear on the calendar
- Navigation triggers a URL param change, which causes a server re-fetch

### Booking Block Data

Each booking block needs: `id`, `scheduledAt`, `durationMin`, `status`, `customerName`, `serviceName`. Queried from existing Prisma relations.

## Files

| File | Change |
|------|--------|
| `src/components/dashboard/calendar.tsx` | New — main calendar client component: view toggle, navigation, date state, delegates to sub-views |
| `src/components/dashboard/calendar-day-view.tsx` | New — single day column with time slots and booking blocks |
| `src/components/dashboard/calendar-week-view.tsx` | New — 7-column grid reusing day column rendering |
| `src/components/dashboard/calendar-month-view.tsx` | New — month grid with booking counts per day |
| `src/app/(dashboard)/dashboard/technician/page.tsx` | Modify — replace flat bookings list with Calendar component, adjust query date range based on view param |

## Edge Cases

- **No bookings in range**: show empty time slots, no blocks
- **Overlapping bookings**: stack or overlap blocks (shouldn't happen with conflict prevention, but render gracefully)
- **Booking spans outside visible hours**: clip to the visible range
- **Timezone**: all times are local (server and client), no timezone conversion needed for MVP (SQLite stores naive datetimes)

## Testing

- Unit tests not practical for visual calendar components — rely on e2e tests
- E2e: verify calendar renders on the bookings tab, view toggle works, booking blocks appear, clicking a block navigates to detail page
- Verify build passes, all existing tests still pass
