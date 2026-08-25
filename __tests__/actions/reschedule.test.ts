import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  prismaMock,
  mockCustomerSession,
  mockTechnicianSession,
  fixtures,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn((heading: string, bodyHtml: string) => `<html>${heading}${bodyHtml}</html>`),
}));

import { getServerSession } from "next-auth";
import { sendEmail } from "@/lib/email";
import {
  rescheduleBooking,
  proposeRescheduleTimes,
  acceptRescheduleProposal,
} from "@/actions/reschedule";

const mockGetSession = vi.mocked(getServerSession);

// Booking is scheduled for June 10, 2026 at 2:00 PM local time; the
// technician has a 48-hour reschedule cutoff for customers.
const SCHEDULED_AT = new Date(2026, 5, 10, 14, 0);
const CUTOFF_HOURS = 48;

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-1",
    customerId: "customer-1",
    technicianId: "tech-profile-1",
    status: "PENDING",
    scheduledAt: SCHEDULED_AT,
    durationMin: 90,
    addressLine1: "456 Oak Ave",
    city: "Boston",
    state: "MA",
    zipCode: "02215",
    latitude: null,
    longitude: null,
    technician: {
      ...fixtures.technicianProfile,
      rescheduleCutoffHours: CUTOFF_HOURS,
      proposeTimesEnabled: true,
      user: { name: "Mike Tuner", email: "tech@example.com" },
    },
    customer: { name: "Jane Doe", email: "customer@example.com" },
    ...overrides,
  };
}

// A future date/time well clear of any cutoff or conflict concerns.
const NEW_DATE = "2026-06-20";
const NEW_TIME = "10:00";

describe("rescheduleBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Anchor "now" well before every fixture date below so future-date checks
    // don't drift as real calendar time passes. Individual tests override
    // this with their own vi.setSystemTime for cutoff-boundary math.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));
    prismaMock.$transaction = vi.fn(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock));
    prismaMock.booking.findMany.mockResolvedValue([]); // no same-day conflicts by default
    prismaMock.booking.update.mockResolvedValue({});
    prismaMock.rescheduleProposal.updateMany.mockResolvedValue({ count: 0 });
  });
  afterEach(() => vi.useRealTimers());

  it("lets the technician reschedule anytime, even inside the customer cutoff window", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    // scheduledAt is only 2 hours away — deep inside the 48h cutoff — but the
    // technician isn't subject to it.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(SCHEDULED_AT.getTime() - 2 * 60 * 60 * 1000));
    prismaMock.booking.findUnique.mockResolvedValue(makeBooking());

    const result = await rescheduleBooking("booking-1", NEW_DATE, NEW_TIME);

    expect(result.success).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: { scheduledAt: new Date(2026, 5, 20, 10, 0) },
    });
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("lets the customer reschedule while outside the cutoff window", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    // 49 hours before the appointment — just outside the 48h cutoff.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(SCHEDULED_AT.getTime() - 49 * 60 * 60 * 1000));
    prismaMock.booking.findUnique.mockResolvedValue(makeBooking());

    const result = await rescheduleBooking("booking-1", NEW_DATE, NEW_TIME);

    expect(result.success).toBe(true);
  });

  it("blocks the customer exactly at the cutoff boundary", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    // now === scheduledAt - cutoffHours exactly: spec requires strictly
    // "now < scheduledAt - cutoff" to allow, so the boundary itself blocks.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(SCHEDULED_AT.getTime() - CUTOFF_HOURS * 60 * 60 * 1000));
    prismaMock.booking.findUnique.mockResolvedValue(makeBooking());

    const result = await rescheduleBooking("booking-1", NEW_DATE, NEW_TIME);

    expect(result.error).toContain("48 hours");
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("blocks the customer well inside the cutoff window", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    vi.useFakeTimers();
    vi.setSystemTime(new Date(SCHEDULED_AT.getTime() - 5 * 60 * 60 * 1000));
    prismaMock.booking.findUnique.mockResolvedValue(makeBooking());

    const result = await rescheduleBooking("booking-1", NEW_DATE, NEW_TIME);

    expect(result.error).toContain("48 hours");
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("rejects a user who is neither the booking's customer nor its technician", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "stranger-1", role: "CUSTOMER", name: "Stranger", email: "s@example.com" },
    });
    prismaMock.booking.findUnique.mockResolvedValue(makeBooking());

    const result = await rescheduleBooking("booking-1", NEW_DATE, NEW_TIME);
    expect(result.error).toContain("Not authorized");
  });

  it("rejects rescheduling a cancelled booking", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique.mockResolvedValue(makeBooking({ status: "CANCELLED" }));

    const result = await rescheduleBooking("booking-1", NEW_DATE, NEW_TIME);
    expect(result.error).toContain("no longer be rescheduled");
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("rejects a slot that conflicts with another active booking that day", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique.mockResolvedValue(makeBooking());
    // Existing booking 10:00-11:30 on the requested day overlaps the new 10:00 slot.
    prismaMock.booking.findMany.mockResolvedValue([
      { scheduledAt: new Date(2026, 5, 20, 10, 0), durationMin: 90, latitude: null, longitude: null },
    ]);

    const result = await rescheduleBooking("booking-1", NEW_DATE, NEW_TIME);
    expect(result.error).toContain("no longer available");
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid date/time format before touching the database", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());

    const result = await rescheduleBooking("booking-1", "06/20/2026", "10am");
    expect(result.error).toBeDefined();
    expect(prismaMock.booking.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a time that has already passed", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique.mockResolvedValue(makeBooking());

    const result = await rescheduleBooking("booking-1", "2020-01-01", "10:00");
    expect(result.error).toContain("future");
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("cancels any pending reschedule proposal when the booking is directly rescheduled", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique.mockResolvedValue(makeBooking());

    await rescheduleBooking("booking-1", NEW_DATE, NEW_TIME);

    expect(prismaMock.rescheduleProposal.updateMany).toHaveBeenCalledWith({
      where: { bookingId: "booking-1", status: "PENDING" },
      data: { status: "CANCELLED" },
    });
  });
});

describe("proposeRescheduleTimes", () => {
  const FUTURE_SLOTS = ["2026-06-20T10:00:00", "2026-06-21T11:00:00"];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));
    prismaMock.$transaction = vi.fn(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock));
    prismaMock.rescheduleProposal.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.rescheduleProposal.create.mockResolvedValue({ token: "abc123token" });
    prismaMock.user.findUnique.mockResolvedValue({ email: "customer@example.com" });
  });
  afterEach(() => vi.useRealTimers());

  it("creates a proposal and emails the customer", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique.mockResolvedValue(makeBooking());

    const result = await proposeRescheduleTimes("booking-1", FUTURE_SLOTS);

    expect(result.success).toBe(true);
    expect(prismaMock.rescheduleProposal.create).toHaveBeenCalledOnce();
    const createCall = prismaMock.rescheduleProposal.create.mock.calls[0][0];
    expect(JSON.parse(createCall.data.slots)).toEqual(FUTURE_SLOTS);
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("rejects when the technician hasn't enabled offering times", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ technician: { ...makeBooking().technician, proposeTimesEnabled: false } })
    );

    const result = await proposeRescheduleTimes("booking-1", FUTURE_SLOTS);
    expect(result.error).toContain("Offer suggested times");
    expect(prismaMock.rescheduleProposal.create).not.toHaveBeenCalled();
  });

  it("rejects a technician who doesn't own the booking", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ technician: { ...makeBooking().technician, userId: "someone-else" } })
    );

    const result = await proposeRescheduleTimes("booking-1", FUTURE_SLOTS);
    expect(result.error).toContain("Not authorized");
  });

  it("rejects a non-technician caller", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());

    const result = await proposeRescheduleTimes("booking-1", FUTURE_SLOTS);
    expect(result.error).toContain("Not authorized");
    expect(prismaMock.booking.findUnique).not.toHaveBeenCalled();
  });

  it("rejects fewer than 2 offered slots", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());

    const result = await proposeRescheduleTimes("booking-1", ["2026-06-20T10:00:00"]);
    expect(result.error).toBeDefined();
    expect(prismaMock.booking.findUnique).not.toHaveBeenCalled();
  });

  it("rejects more than 4 offered slots", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());

    const result = await proposeRescheduleTimes("booking-1", [
      "2026-06-20T10:00:00",
      "2026-06-21T10:00:00",
      "2026-06-22T10:00:00",
      "2026-06-23T10:00:00",
      "2026-06-24T10:00:00",
    ]);
    expect(result.error).toBeDefined();
  });

  it("rejects an offered slot that's already in the past", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique.mockResolvedValue(makeBooking());

    const result = await proposeRescheduleTimes("booking-1", [
      "2020-01-01T10:00:00",
      "2026-06-21T10:00:00",
    ]);
    expect(result.error).toContain("future");
    expect(prismaMock.rescheduleProposal.create).not.toHaveBeenCalled();
  });
});

describe("acceptRescheduleProposal", () => {
  const OFFERED_SLOTS = ["2026-06-20T10:00:00", "2026-06-21T11:00:00"];

  function makeProposal(overrides: Record<string, unknown> = {}) {
    return {
      id: "proposal-1",
      bookingId: "booking-1",
      token: "the-token",
      slots: JSON.stringify(OFFERED_SLOTS),
      status: "PENDING",
      chosenSlot: null,
      expiresAt: new Date(2026, 5, 15),
      booking: makeBooking(),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction = vi.fn(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock));
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.booking.update.mockResolvedValue({});
    prismaMock.rescheduleProposal.update.mockResolvedValue({});
  });
  afterEach(() => vi.useRealTimers());

  it("applies the chosen slot, marks the proposal accepted, and emails both parties", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1));
    prismaMock.rescheduleProposal.findUnique.mockResolvedValue(makeProposal());

    const result = await acceptRescheduleProposal("the-token", OFFERED_SLOTS[0]);

    expect(result.success).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: { scheduledAt: new Date(OFFERED_SLOTS[0]) },
    });
    expect(prismaMock.rescheduleProposal.update).toHaveBeenCalledWith({
      where: { id: "proposal-1" },
      data: { status: "ACCEPTED", chosenSlot: new Date(OFFERED_SLOTS[0]) },
    });
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("rejects an unknown token", async () => {
    prismaMock.rescheduleProposal.findUnique.mockResolvedValue(null);

    const result = await acceptRescheduleProposal("bogus-token", OFFERED_SLOTS[0]);
    expect(result.error).toContain("no longer valid");
  });

  it("rejects a proposal that has already been accepted", async () => {
    prismaMock.rescheduleProposal.findUnique.mockResolvedValue(makeProposal({ status: "ACCEPTED" }));

    const result = await acceptRescheduleProposal("the-token", OFFERED_SLOTS[0]);
    expect(result.error).toContain("already been used");
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("rejects an expired proposal", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 25)); // after expiresAt (June 15)
    prismaMock.rescheduleProposal.findUnique.mockResolvedValue(makeProposal());

    const result = await acceptRescheduleProposal("the-token", OFFERED_SLOTS[0]);
    expect(result.error).toContain("expired");
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("rejects a slot that wasn't one of the offered options", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1));
    prismaMock.rescheduleProposal.findUnique.mockResolvedValue(makeProposal());

    const result = await acceptRescheduleProposal("the-token", "2026-06-22T09:00:00");
    expect(result.error).toContain("wasn't one of the offered options");
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("rejects accepting into a booking that's since been cancelled", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1));
    prismaMock.rescheduleProposal.findUnique.mockResolvedValue(
      makeProposal({ booking: makeBooking({ status: "CANCELLED" }) })
    );

    const result = await acceptRescheduleProposal("the-token", OFFERED_SLOTS[0]);
    expect(result.error).toContain("no longer be rescheduled");
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });
});
