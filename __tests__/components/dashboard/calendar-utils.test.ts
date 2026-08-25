import { describe, it, expect } from "vitest";
import {
  applyFilters,
  buildExceptionInput,
  cityOptions,
  EMPTY_FILTERS,
  exceptionCoversDay,
  getExceptionsForDay,
  serviceOptions,
  type CalendarException,
} from "@/components/dashboard/calendar-utils";
import type { CalendarBooking } from "@/components/dashboard/calendar";

function booking(overrides: Partial<CalendarBooking>): CalendarBooking {
  return {
    id: "b1",
    scheduledAt: new Date(2026, 3, 14, 9, 0).toISOString(),
    durationMin: 60,
    status: "CONFIRMED",
    customerName: "Jane Doe",
    serviceName: "Standard Tuning",
    services: ["Standard Tuning"],
    city: "Austin",
    totalCents: 15000,
    ...overrides,
  };
}

function exception(overrides: Partial<CalendarException>): CalendarException {
  return {
    id: "e1",
    startsAt: new Date(2026, 3, 14, 0, 0).toISOString(),
    endsAt: new Date(2026, 3, 15, 0, 0).toISOString(),
    allDay: true,
    reason: "Vacation",
    ...overrides,
  };
}

describe("applyFilters", () => {
  const bookings = [
    booking({ id: "1", customerName: "Jane Doe", city: "Austin", services: ["Tuning"] }),
    booking({ id: "2", customerName: "John Smith", city: "Dallas", services: ["Repair"] }),
    booking({ id: "3", customerName: "Janet Lee", city: "Austin", services: ["Tuning", "Repair"] }),
  ];

  it("returns all bookings when filters are empty", () => {
    expect(applyFilters(bookings, EMPTY_FILTERS)).toHaveLength(3);
  });

  it("matches customer name by case-insensitive substring", () => {
    const result = applyFilters(bookings, { ...EMPTY_FILTERS, customer: "jan" });
    expect(result.map((b) => b.id)).toEqual(["1", "3"]);
  });

  it("filters by exact service match", () => {
    const result = applyFilters(bookings, { ...EMPTY_FILTERS, service: "Repair" });
    expect(result.map((b) => b.id)).toEqual(["2", "3"]);
  });

  it("filters by exact city match", () => {
    const result = applyFilters(bookings, { ...EMPTY_FILTERS, city: "Austin" });
    expect(result.map((b) => b.id)).toEqual(["1", "3"]);
  });

  it("combines multiple filters with AND", () => {
    const result = applyFilters(bookings, { service: "Tuning", customer: "jan", city: "Austin" });
    expect(result.map((b) => b.id)).toEqual(["1", "3"]);

    const noMatch = applyFilters(bookings, { service: "Repair", customer: "jan", city: "Dallas" });
    expect(noMatch).toHaveLength(0);
  });

  it("clear (EMPTY_FILTERS) restores every booking", () => {
    const narrowed = applyFilters(bookings, { ...EMPTY_FILTERS, city: "Austin" });
    expect(narrowed).toHaveLength(2);
    expect(applyFilters(bookings, EMPTY_FILTERS)).toHaveLength(3);
  });
});

describe("serviceOptions / cityOptions", () => {
  const bookings = [
    booking({ services: ["Tuning", "Repair"], city: "Austin" }),
    booking({ services: ["Tuning"], city: "Dallas" }),
  ];

  it("dedupes and sorts service names present in the range", () => {
    expect(serviceOptions(bookings)).toEqual(["Repair", "Tuning"]);
  });

  it("dedupes and sorts cities present in the range", () => {
    expect(cityOptions(bookings)).toEqual(["Austin", "Dallas"]);
  });
});

describe("exceptionCoversDay / getExceptionsForDay", () => {
  it("covers every day in a multi-day all-day span", () => {
    // Vacation Apr 14-16 inclusive -> endsAt is midnight Apr 17 (exclusive)
    const vacation = exception({
      startsAt: new Date(2026, 3, 14, 0, 0).toISOString(),
      endsAt: new Date(2026, 3, 17, 0, 0).toISOString(),
    });
    expect(exceptionCoversDay(vacation, new Date(2026, 3, 13))).toBe(false);
    expect(exceptionCoversDay(vacation, new Date(2026, 3, 14))).toBe(true);
    expect(exceptionCoversDay(vacation, new Date(2026, 3, 15))).toBe(true);
    expect(exceptionCoversDay(vacation, new Date(2026, 3, 16))).toBe(true);
    expect(exceptionCoversDay(vacation, new Date(2026, 3, 17))).toBe(false);
  });

  it("boundary: a single-day all-day block ending at midnight does not bleed into the next day", () => {
    const singleDay = exception({
      startsAt: new Date(2026, 3, 14, 0, 0).toISOString(),
      endsAt: new Date(2026, 3, 15, 0, 0).toISOString(),
    });
    expect(exceptionCoversDay(singleDay, new Date(2026, 3, 14))).toBe(true);
    expect(exceptionCoversDay(singleDay, new Date(2026, 3, 15))).toBe(false);
  });

  it("boundary: a timed block ending exactly at midnight does not appear on the next day", () => {
    const lateBlock = exception({
      allDay: false,
      startsAt: new Date(2026, 3, 14, 22, 0).toISOString(),
      endsAt: new Date(2026, 3, 15, 0, 0).toISOString(),
    });
    expect(exceptionCoversDay(lateBlock, new Date(2026, 3, 14))).toBe(true);
    expect(exceptionCoversDay(lateBlock, new Date(2026, 3, 15))).toBe(false);
  });

  it("getExceptionsForDay filters a mixed list down to the ones covering the day", () => {
    const exceptions = [
      exception({ id: "a", startsAt: new Date(2026, 3, 14, 0, 0).toISOString(), endsAt: new Date(2026, 3, 15, 0, 0).toISOString() }),
      exception({ id: "b", startsAt: new Date(2026, 3, 20, 0, 0).toISOString(), endsAt: new Date(2026, 3, 21, 0, 0).toISOString() }),
    ];
    expect(getExceptionsForDay(exceptions, new Date(2026, 3, 14)).map((e) => e.id)).toEqual(["a"]);
    expect(getExceptionsForDay(exceptions, new Date(2026, 3, 21))).toHaveLength(0);
  });
});

describe("buildExceptionInput (quick-create payload)", () => {
  it("builds an all-day payload with endDate and trims a blank reason to undefined", () => {
    const input = buildExceptionInput({
      date: "2026-04-14",
      allDay: true,
      endDate: "2026-04-16",
      startTime: "09:00",
      endTime: "17:00",
      reason: "  ",
    });
    expect(input).toEqual({
      date: "2026-04-14",
      allDay: true,
      endDate: "2026-04-16",
      startTime: undefined,
      endTime: undefined,
      reason: undefined,
    });
  });

  it("drops endDate for a timed block and keeps trimmed start/end/reason", () => {
    const input = buildExceptionInput({
      date: "2026-04-14",
      allDay: false,
      endDate: "2026-04-16",
      startTime: "09:00",
      endTime: "11:30",
      reason: "  Dentist  ",
    });
    expect(input).toEqual({
      date: "2026-04-14",
      allDay: false,
      endDate: undefined,
      startTime: "09:00",
      endTime: "11:30",
      reason: "Dentist",
    });
  });

  it("omits endDate when the all-day block has no end date entered", () => {
    const input = buildExceptionInput({ date: "2026-04-14", allDay: true, endDate: "" });
    expect(input.endDate).toBeUndefined();
  });
});
