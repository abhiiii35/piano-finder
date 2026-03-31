# Booking Conflict Prevention

## Overview

Prevent double-booking by re-checking slot availability at booking creation time, using duration-aware slot filtering, and wrapping the check + create in a database transaction.

## Problem

Two gaps in the current booking flow:

1. **Race condition:** `createBooking()` does not re-check availability. Between viewing available slots and submitting, another customer can book the same slot.
2. **Duration blindness:** `getAvailableSlots()` checks overlap using a fixed 30-minute window. A customer selecting 120 minutes of services at 2:00 PM won't see that a 3:00 PM booking conflicts — the slot shows as available but the booking would actually overlap.

## Solution

### 1. Duration-aware slot filtering

Update `getAvailableSlots(technicianId, date, durationMin)` to accept the total service duration. For each candidate 30-minute slot, check whether the full window from `slotStart` to `slotStart + durationMin` is free of conflicts — not just the 30-minute slot itself. Slots without enough contiguous free time are excluded from the results.

### 2. Server-side conflict check in createBooking

Before creating the booking, query for any existing booking (PENDING, CONFIRMED, or IN_PROGRESS) whose time window overlaps with the new booking's window (`scheduledAt` to `scheduledAt + durationMin`). If a conflict is found, return an error message plus the available slots for that day (by calling `getAvailableSlots`), so the customer can pick an alternative without navigating back.

### 3. Transactional create

Wrap the conflict check and `booking.create` in `prisma.$transaction()` so no concurrent request can insert a conflicting booking between the check and the create.

## Changes

### Modified files

| File | Change |
|------|--------|
| `src/actions/booking.ts` | Add `durationMin` param to `getAvailableSlots()`, update overlap logic to use full duration. Add conflict check + transaction to `createBooking()`. On conflict, return `{ error, availableSlots }`. |
| `src/app/(public)/technicians/[id]/book/page.tsx` | Pass computed `durationMin` to `getAvailableSlots()`. Handle conflict response: show error with alternative slot options. |
| `__tests__/actions/booking.test.ts` | Add tests for conflict detection, duration-aware filtering, and transaction behavior. |

### No new files. No schema changes.

## Error response format

On conflict, `createBooking()` returns:

```typescript
{
  error: "This time slot is no longer available",
  availableSlots: ["09:00", "09:30", "14:00", "14:30", ...]  // remaining slots for that day
}
```

The booking page checks for `availableSlots` in the error response and displays them as clickable alternatives, allowing the customer to pick a new time and resubmit without navigating back to step 2.

## Conflict check logic

A new booking at `scheduledAt` with `durationMin` conflicts with an existing booking if:

```
newStart < existingEnd AND newEnd > existingStart
```

Where:
- `newStart = scheduledAt`
- `newEnd = scheduledAt + durationMin`
- `existingStart = existing.scheduledAt`
- `existingEnd = existing.scheduledAt + existing.durationMin`

Only bookings with status PENDING, CONFIRMED, or IN_PROGRESS are considered. COMPLETED and CANCELLED bookings are ignored.

## Duration-aware getAvailableSlots

Currently each 30-minute slot is checked against a 30-minute window. Updated logic:

For each candidate slot time `T`:
- The booking would occupy `T` to `T + durationMin`
- Check if this full window overlaps with any existing booking
- Also check that `T + durationMin` doesn't exceed the technician's availability end time
- Only include the slot if the full window is free

## UI handling on conflict

When `createBooking()` returns `{ error, availableSlots }`:

1. Show the error message via toast
2. Display the alternative slots inline on the confirmation step (step 4) as clickable time buttons
3. Customer clicks a new time, the `selectedTime` state updates
4. Customer can re-click "Confirm Booking" to retry with the new time

This avoids navigating back to step 2 and re-fetching everything.
