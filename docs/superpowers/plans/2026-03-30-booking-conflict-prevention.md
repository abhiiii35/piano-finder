# Booking Conflict Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent double-bookings by adding duration-aware slot filtering, server-side conflict checks with alternative slot suggestions, and transactional booking creation.

**Architecture:** Update `getAvailableSlots()` to accept a `durationMin` parameter for duration-aware filtering. Wrap `createBooking()` in a `prisma.$transaction()` that checks for conflicts before inserting. On conflict, return available alternatives. Update booking page UI to handle conflict responses.

**Tech Stack:** Next.js 16, Prisma 7 (SQLite), Vitest, server actions

---

## File Structure

### Modified Files
| File | Change |
|------|--------|
| `src/actions/booking.ts` | Add `durationMin` param to `getAvailableSlots()`, add conflict check + transaction to `createBooking()` |
| `src/app/(public)/technicians/[id]/book/page.tsx` | Pass `durationMin` to `getAvailableSlots()`, handle conflict response with alternative slot UI |
| `__tests__/actions/booking.test.ts` | Add tests for conflict detection, duration-aware filtering, transaction |

### No new files.

---

### Task 1: Duration-aware getAvailableSlots

**Files:**
- Modify: `__tests__/actions/booking.test.ts`
- Modify: `src/actions/booking.ts:166-219`

- [ ] **Step 1: Write failing tests for duration-aware filtering**

Add these tests to the `getAvailableSlots` describe block in `__tests__/actions/booking.test.ts`:

```typescript
  it("filters slots that don't have enough room for the full duration", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "12:00",
    });

    // Existing booking at 10:30 for 60 min (occupies 10:30-11:30)
    const bookingDate = new Date("2026-04-14");
    bookingDate.setHours(10, 30, 0, 0);

    prismaMock.booking.findMany.mockResolvedValue([
      { scheduledAt: bookingDate, durationMin: 60 },
    ]);

    // With a 90-min service, the 09:30 slot (09:30-11:00) overlaps with the 10:30 booking
    const slots = await getAvailableSlots("tech-1", "2026-04-14", 90);
    expect(slots).toContain("09:00"); // 09:00-10:30 fits before the booking
    expect(slots).not.toContain("09:30"); // 09:30-11:00 overlaps with 10:30 booking
    expect(slots).not.toContain("10:00"); // 10:00-11:30 overlaps
    expect(slots).not.toContain("10:30"); // 10:30-12:00 overlaps
    expect(slots).toContain("11:30"); // 11:30-13:00 — but wait, end is 12:00, so 11:30+90min=13:00 exceeds availability
    // Actually 11:30 + 90 min = 13:00 which is past 12:00 end time, so it should NOT be included
  });

  it("excludes slots where duration exceeds availability end time", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "11:00",
    });
    prismaMock.booking.findMany.mockResolvedValue([]);

    // With 90-min duration, only 09:00 (09:00-10:30) fits. 09:30 (09:30-11:00) fits exactly.
    // 10:00 (10:00-11:30) exceeds 11:00 end time.
    const slots = await getAvailableSlots("tech-1", "2026-04-14", 90);
    expect(slots).toContain("09:00");
    expect(slots).toContain("09:30"); // 09:30 + 90 = 11:00 exactly, should fit
    expect(slots).not.toContain("10:00"); // 10:00 + 90 = 11:30, exceeds 11:00
    expect(slots).not.toContain("10:30");
  });

  it("defaults to 30-min duration when not provided", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "11:00",
    });
    prismaMock.booking.findMany.mockResolvedValue([]);

    const slots = await getAvailableSlots("tech-1", "2026-04-14");
    expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
nvm use 20 && npx vitest run __tests__/actions/booking.test.ts
```

Expected: The duration-aware tests FAIL because `getAvailableSlots` doesn't accept a third parameter and uses a fixed 30-min window.

- [ ] **Step 3: Update getAvailableSlots to accept durationMin**

In `src/actions/booking.ts`, change the `getAvailableSlots` function signature and overlap logic. Replace the entire function (lines 166-219):

```typescript
export async function getAvailableSlots(technicianId: string, date: string, durationMin: number = 30) {
  const dayOfWeek = new Date(date).getDay();

  const slot = await prisma.availabilitySlot.findFirst({
    where: { technicianId, dayOfWeek },
  });

  if (!slot) return [];

  // Get existing bookings for this date
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existingBookings = await prisma.booking.findMany({
    where: {
      technicianId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
    },
  });

  // Generate 30-min slots, checking if the full duration fits
  const [startH, startM] = slot.startTime.split(":").map(Number);
  const [endH, endM] = slot.endTime.split(":").map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  const slots: string[] = [];
  for (let m = startMin; m < endMin; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;

    // Check if the full duration fits within availability
    if (m + durationMin > endMin) continue;

    const timeStr = `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;

    const slotTime = new Date(date);
    slotTime.setHours(h, min, 0, 0);

    // Check if the full duration window overlaps with any existing booking
    const isBooked = existingBookings.some((b) => {
      const bookingStart = new Date(b.scheduledAt).getTime();
      const bookingEnd = bookingStart + b.durationMin * 60 * 1000;
      const slotStart = slotTime.getTime();
      const slotEnd = slotStart + durationMin * 60 * 1000;
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });

    if (!isBooked) {
      slots.push(timeStr);
    }
  }

  return slots;
}
```

- [ ] **Step 4: Fix the existing "filters out booked slots" test**

The existing test at line 208 uses the default 30-min duration and expects `10:30` to be available. With duration-aware filtering, `10:30` with a 30-min window (10:30-11:00) doesn't overlap with a booking at 09:00-10:30, so it should still pass. Verify by running:

```bash
nvm use 20 && npx vitest run __tests__/actions/booking.test.ts
```

Expected: All tests pass including the existing ones and the new duration-aware ones.

- [ ] **Step 5: Fix the first duration-aware test**

Review the test from step 1 — the comment about `11:30` was self-correcting. Remove or fix if needed. The test assertion `expect(slots).toContain("11:30")` should be `expect(slots).not.toContain("11:30")` since 11:30 + 90min = 13:00 exceeds the 12:00 end time. Update the test:

```typescript
  it("filters slots that don't have enough room for the full duration", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "12:00",
    });

    // Existing booking at 10:30 for 60 min (occupies 10:30-11:30)
    const bookingDate = new Date("2026-04-14");
    bookingDate.setHours(10, 30, 0, 0);

    prismaMock.booking.findMany.mockResolvedValue([
      { scheduledAt: bookingDate, durationMin: 60 },
    ]);

    // With a 90-min service:
    const slots = await getAvailableSlots("tech-1", "2026-04-14", 90);
    expect(slots).toContain("09:00");     // 09:00-10:30 fits before the booking
    expect(slots).not.toContain("09:30"); // 09:30-11:00 overlaps with 10:30 booking
    expect(slots).not.toContain("10:00"); // 10:00-11:30 overlaps
    expect(slots).not.toContain("10:30"); // booked
    expect(slots).not.toContain("11:00"); // 11:00-12:30 exceeds 12:00 end
    expect(slots).not.toContain("11:30"); // 11:30-13:00 exceeds 12:00 end
  });
```

- [ ] **Step 6: Run tests to verify all pass**

```bash
nvm use 20 && npx vitest run __tests__/actions/booking.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/actions/booking.ts __tests__/actions/booking.test.ts
git commit -m "feat: add duration-aware slot filtering to getAvailableSlots"
```

---

### Task 2: Server-side conflict check with transaction in createBooking

**Files:**
- Modify: `__tests__/actions/booking.test.ts`
- Modify: `src/actions/booking.ts:11-93`

- [ ] **Step 1: Write failing tests for conflict detection**

Add these tests to the `createBooking` describe block in `__tests__/actions/booking.test.ts`:

```typescript
  it("rejects booking when time slot conflicts with existing booking", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.service.findMany.mockResolvedValue([fixtures.service]); // 90 min

    // Simulate transaction by making $transaction call the callback with prismaMock
    prismaMock.$transaction = vi.fn(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      return cb(prismaMock);
    });

    // Existing booking overlaps: 09:30-11:00 overlaps with requested 10:00-11:30
    const existingBookingDate = new Date("2026-04-15");
    existingBookingDate.setHours(9, 30, 0, 0);
    prismaMock.booking.findFirst.mockResolvedValue({
      id: "existing-booking",
      scheduledAt: existingBookingDate,
      durationMin: 90,
    });

    // Return available slots for the conflict response
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "17:00",
    });
    prismaMock.booking.findMany.mockResolvedValue([
      { scheduledAt: existingBookingDate, durationMin: 90 },
    ]);

    const result = await createBooking({
      technicianId: "tech-profile-1",
      serviceIds: ["service-1"],
      scheduledAt: "2026-04-15T10:00:00",
      addressLine1: "123 Main St",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
    });

    expect(result.error).toContain("no longer available");
    expect(result.availableSlots).toBeDefined();
    expect(Array.isArray(result.availableSlots)).toBe(true);
  });

  it("creates booking inside a transaction when no conflict", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.service.findMany.mockResolvedValue([fixtures.service]);

    prismaMock.$transaction = vi.fn(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      return cb(prismaMock);
    });

    // No conflicts
    prismaMock.booking.findFirst.mockResolvedValue(null);
    prismaMock.booking.create.mockResolvedValue({ id: "new-booking" });

    const result = await createBooking({
      technicianId: "tech-profile-1",
      serviceIds: ["service-1"],
      scheduledAt: "2026-04-15T10:00:00",
      addressLine1: "123 Main St",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
nvm use 20 && npx vitest run __tests__/actions/booking.test.ts
```

Expected: FAIL — `createBooking` doesn't use `$transaction` or check conflicts.

- [ ] **Step 3: Update createBooking with conflict check and transaction**

In `src/actions/booking.ts`, replace the `createBooking` function (lines 11-93) with:

```typescript
export async function createBooking(data: {
  technicianId: string;
  serviceIds: string[];
  scheduledAt: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  pianoType?: string;
  pianoMake?: string;
  pianoModel?: string;
  notes?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Please sign in to book" };

  const result = bookingSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { technicianId, serviceIds, scheduledAt, ...address } = result.data;

  // Fetch services to calculate total
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, technicianId },
  });

  if (services.length === 0) {
    return { error: "No valid services selected" };
  }

  const totalCents = services.reduce((sum, s) => sum + s.priceCents, 0);
  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);

  const newStart = new Date(scheduledAt);
  const newEnd = new Date(newStart.getTime() + durationMin * 60 * 1000);

  // Conflict check + create inside a transaction
  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      // Check for overlapping bookings on the same day
      const dayStart = new Date(newStart);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(newStart);
      dayEnd.setHours(23, 59, 59, 999);

      const conflict = await tx.booking.findFirst({
        where: {
          technicianId,
          status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
      });

      // Precise overlap check: newStart < existingEnd AND newEnd > existingStart
      if (conflict) {
        const conflictStart = new Date(conflict.scheduledAt).getTime();
        const conflictEnd = conflictStart + conflict.durationMin * 60 * 1000;
        if (newStart.getTime() < conflictEnd && newEnd.getTime() > conflictStart) {
          throw new Error("CONFLICT");
        }
      }

      return tx.booking.create({
        data: {
          customerId: session.user.id,
          technicianId,
          status: "PENDING",
          scheduledAt: newStart,
          durationMin,
          totalCents,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 ?? null,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          pianoType: address.pianoType ?? null,
          pianoMake: address.pianoMake ?? null,
          pianoModel: address.pianoModel ?? null,
          notes: address.notes ?? null,
          services: {
            create: services.map((s) => ({
              serviceId: s.id,
              priceCents: s.priceCents,
            })),
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONFLICT") {
      // Fetch alternative slots for the same day
      const dateStr = scheduledAt.split("T")[0];
      const availableSlots = await getAvailableSlots(technicianId, dateStr, durationMin);
      return {
        error: "This time slot is no longer available",
        availableSlots,
      };
    }
    throw error;
  }

  try {
    const techProfile = await prisma.technicianProfile.findUnique({
      where: { id: technicianId },
      include: { user: { select: { name: true, email: true } } },
    });
    const serviceNames = services.map((s) => s.name);
    if (session.user.email) {
      const email = bookingCreatedEmail(booking, techProfile?.user.name ?? "Your technician", serviceNames);
      await sendEmail({ to: session.user.email, ...email });
    }
    if (techProfile?.user.email) {
      const email = bookingReceivedEmail(booking, session.user.name ?? "Customer", serviceNames);
      await sendEmail({ to: techProfile.user.email, ...email });
    }
  } catch (error) {
    console.error("[EMAIL] Failed to send booking confirmation:", error);
  }

  revalidatePath("/dashboard/customer/bookings");
  revalidatePath("/dashboard/technician/bookings");
  return { success: true, bookingId: booking.id };
}
```

- [ ] **Step 4: Update existing createBooking tests to mock $transaction**

The existing tests that call `createBooking` need to mock `$transaction`. Update the first two tests and the email test in the `createBooking` describe block. Add this to `beforeEach`:

```typescript
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock $transaction to just call the callback with prismaMock
    prismaMock.$transaction = vi.fn(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      return cb(prismaMock);
    });
  });
```

And add `prismaMock.booking.findFirst.mockResolvedValue(null);` before `prismaMock.booking.create` in each existing test that creates a booking (the "creates a booking", "sums multiple services", and "sends confirmation emails" tests).

- [ ] **Step 5: Run tests to verify all pass**

```bash
nvm use 20 && npx vitest run __tests__/actions/booking.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/actions/booking.ts __tests__/actions/booking.test.ts
git commit -m "feat: add conflict check with transaction to createBooking"
```

---

### Task 3: Update booking page UI to handle conflicts

**Files:**
- Modify: `src/app/(public)/technicians/[id]/book/page.tsx`

- [ ] **Step 1: Pass durationMin to getAvailableSlots**

In `src/app/(public)/technicians/[id]/book/page.tsx`, update the `useEffect` that fetches available slots (lines 58-62) to pass the computed `totalDuration`:

Find:
```typescript
  useEffect(() => {
    if (selectedDate && params.id) {
      getAvailableSlots(params.id as string, selectedDate).then(setAvailableSlots);
    }
  }, [selectedDate, params.id]);
```

Replace with:
```typescript
  useEffect(() => {
    if (selectedDate && params.id) {
      getAvailableSlots(params.id as string, selectedDate, totalDuration || 30).then(setAvailableSlots);
    }
  }, [selectedDate, params.id, totalDuration]);
```

- [ ] **Step 2: Add conflict state and update handleConfirm**

Add a new state variable after the `loading` state (line 50):

```typescript
  const [conflictSlots, setConflictSlots] = useState<string[] | null>(null);
```

Replace the `handleConfirm` function (lines 89-105) with:

```typescript
  async function handleConfirm() {
    setLoading(true);
    setConflictSlots(null);
    const result = await createBooking({
      technicianId: params.id as string,
      serviceIds: selectedServices,
      scheduledAt: `${selectedDate}T${selectedTime}:00`,
      ...address,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      if (result.availableSlots) {
        setConflictSlots(result.availableSlots);
      }
    } else {
      toast.success("Booking created!");
      router.push(`/dashboard/customer/bookings/${result.bookingId}`);
    }
  }
```

- [ ] **Step 3: Add alternative slots UI to step 4**

In the step 4 JSX (the confirmation card), add the conflict slots UI after the existing Back/Confirm buttons div (after line 399, before the closing `</CardContent>`):

```tsx
              {conflictSlots && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900 mb-2">
                    Pick a different time:
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {conflictSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={selectedTime === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedTime(slot);
                          setConflictSlots(null);
                        }}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                  {conflictSlots.length === 0 && (
                    <p className="text-sm text-amber-700 mt-2">
                      No more slots available on this day. Please go back and pick a different date.
                    </p>
                  )}
                </div>
              )}
```

- [ ] **Step 4: Update the date/time display to reflect changed time**

The confirmation step shows `{selectedTime}` which will automatically update when the user clicks an alternative slot. No additional change needed — the existing `{selectedDate} at {selectedTime}` display already reads from state.

- [ ] **Step 5: Clear conflict slots when going back**

Update the Back button in step 4 to clear conflict state:

Find:
```tsx
                <Button variant="outline" onClick={() => setStep(3)}>
                  Back
                </Button>
```

Replace with:
```tsx
                <Button variant="outline" onClick={() => { setConflictSlots(null); setStep(3); }}>
                  Back
                </Button>
```

- [ ] **Step 6: Run all tests**

```bash
nvm use 20 && npm run test:run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(public\)/technicians/\[id\]/book/page.tsx
git commit -m "feat: handle booking conflicts with alternative slot suggestions"
```

---

### Task 4: End-to-end verification

- [ ] **Step 1: Run full test suite**

```bash
nvm use 20 && npm run test:run
```

Expected: All tests pass.

- [ ] **Step 2: Manual verification**

Start the dev server and test:

```bash
nvm use 20 && npm run dev
```

1. Sign in as customer (`customer@example.com` / `password123`)
2. Navigate to a technician's booking page
3. Select a service (note the duration)
4. Pick a date — verify that slots respect the service duration (long services should show fewer available slots)
5. Complete a booking
6. Go back and try to book the same time slot — should get a conflict error with alternative times shown
7. Pick an alternative time from the suggestions — should be able to confirm successfully

- [ ] **Step 3: Commit any fixes**

If any fixes were needed during verification, commit them.
