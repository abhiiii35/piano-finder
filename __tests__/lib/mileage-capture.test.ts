import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, fixtures } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { captureAutoMileage } from "@/lib/mileage-capture";
import { haversineDistance } from "@/lib/geocoding";

// Boston (technician home base, matches fixtures.technicianProfile)
const HOME = { latitude: 42.36, longitude: -71.06 };
// Worcester, ~38.6 mi from home
const JOB_A = { latitude: 42.2626, longitude: -71.8023 };
// Springfield-ish, distinct from both Home and Job A
const JOB_B = { latitude: 42.1015, longitude: -72.5898 };

function road(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.round(haversineDistance(lat1, lng1, lat2, lng2) * 1.3 * 10) / 10;
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-1",
    technicianId: "tech-profile-1",
    status: "COMPLETED",
    scheduledAt: new Date(2026, 5, 10, 10, 0),
    city: "Worcester",
    latitude: JOB_A.latitude,
    longitude: JOB_A.longitude,
    technician: { ...fixtures.technicianProfile, ...HOME },
    ...overrides,
  };
}

describe("captureAutoMileage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.mileageLog.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.mileageLog.create.mockResolvedValue({});
  });

  it("uses the technician's home base as origin for the first job of the day", async () => {
    const b = makeBooking();
    prismaMock.booking.findUnique.mockResolvedValue(b);
    prismaMock.mileageLog.findFirst.mockResolvedValue(null);
    prismaMock.booking.findMany
      .mockResolvedValueOnce([]) // earlierToday
      .mockResolvedValueOnce([b]); // completedToday (return-home)

    await captureAutoMileage("booking-1");

    const expectedMiles = road(HOME.latitude, HOME.longitude, JOB_A.latitude, JOB_A.longitude);
    expect(prismaMock.mileageLog.create).toHaveBeenNthCalledWith(1, {
      data: {
        technicianId: "tech-profile-1",
        date: b.scheduledAt,
        miles: expectedMiles,
        purpose: "Auto: drive to Worcester",
        bookingId: "booking-1",
        autoCaptured: true,
      },
    });
  });

  it("chains the second job of the day from the first, not home base", async () => {
    const firstJob = makeBooking({
      id: "booking-A",
      scheduledAt: new Date(2026, 5, 10, 9, 0),
      city: "Worcester",
      latitude: JOB_A.latitude,
      longitude: JOB_A.longitude,
    });
    const secondJob = makeBooking({
      id: "booking-B",
      scheduledAt: new Date(2026, 5, 10, 13, 0),
      city: "Springfield",
      latitude: JOB_B.latitude,
      longitude: JOB_B.longitude,
    });

    prismaMock.booking.findUnique.mockResolvedValue(secondJob);
    prismaMock.mileageLog.findFirst.mockResolvedValue(null);
    prismaMock.booking.findMany
      .mockResolvedValueOnce([firstJob]) // earlierToday
      .mockResolvedValueOnce([secondJob, firstJob]); // completedToday, latest first

    await captureAutoMileage("booking-B");

    const expectedMiles = road(JOB_A.latitude, JOB_A.longitude, JOB_B.latitude, JOB_B.longitude);
    const arrivalCall = prismaMock.mileageLog.create.mock.calls[0][0];
    expect(arrivalCall.data.bookingId).toBe("booking-B");
    expect(arrivalCall.data.miles).toBe(expectedMiles);
    expect(arrivalCall.data.purpose).toBe("Auto: drive to Springfield");
  });

  it("replaces the prior return-home row instead of duplicating it", async () => {
    const b = makeBooking();
    prismaMock.booking.findUnique.mockResolvedValue(b);
    prismaMock.mileageLog.findFirst.mockResolvedValue(null);
    prismaMock.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([b]);
    prismaMock.mileageLog.deleteMany.mockResolvedValue({ count: 1 }); // an old row existed

    await captureAutoMileage("booking-1");

    expect(prismaMock.mileageLog.deleteMany).toHaveBeenCalledWith({
      where: {
        technicianId: "tech-profile-1",
        bookingId: null,
        autoCaptured: true,
        date: expect.objectContaining({}),
      },
    });
    // delete happens before the replacement return-home row is created
    const deleteOrder = prismaMock.mileageLog.deleteMany.mock.invocationCallOrder[0];
    const returnHomeCreateOrder = prismaMock.mileageLog.create.mock.invocationCallOrder[1];
    expect(deleteOrder).toBeLessThan(returnHomeCreateOrder);

    const returnHomeCall = prismaMock.mileageLog.create.mock.calls[1][0];
    expect(returnHomeCall.data.purpose).toBe("Auto: return home");
    expect(returnHomeCall.data.bookingId).toBeNull();
  });

  it("does not duplicate the arrival leg when a booking is completed twice", async () => {
    const b = makeBooking();

    prismaMock.booking.findUnique.mockResolvedValue(b);
    prismaMock.mileageLog.findFirst.mockResolvedValueOnce(null); // no existing arrival yet
    prismaMock.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([b]);

    await captureAutoMileage("booking-1");
    expect(prismaMock.mileageLog.create).toHaveBeenCalledTimes(2); // arrival + return-home

    vi.clearAllMocks();
    prismaMock.mileageLog.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.mileageLog.create.mockResolvedValue({});
    prismaMock.booking.findUnique.mockResolvedValue(b);
    // Second completion: arrival leg already exists for this booking.
    prismaMock.mileageLog.findFirst.mockResolvedValueOnce({
      id: "existing-arrival",
      bookingId: "booking-1",
      autoCaptured: true,
    });
    prismaMock.booking.findMany.mockResolvedValueOnce([b]); // completedToday only

    await captureAutoMileage("booking-1");

    // Only the return-home leg is (re)created; the arrival leg is not duplicated.
    expect(prismaMock.mileageLog.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.mileageLog.create.mock.calls[0][0].data.purpose).toBe("Auto: return home");
  });

  it("skips capture entirely when the completed booking has no coordinates", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ latitude: null, longitude: null })
    );

    await captureAutoMileage("booking-1");

    expect(prismaMock.mileageLog.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.mileageLog.create).not.toHaveBeenCalled();
  });

  it("skips both legs when the technician has no home base and there is no earlier job", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({
        technician: { ...fixtures.technicianProfile, latitude: null, longitude: null },
      })
    );
    prismaMock.mileageLog.findFirst.mockResolvedValue(null);
    prismaMock.booking.findMany.mockResolvedValueOnce([]); // earlierToday; return-home skipped (no home base)

    await captureAutoMileage("booking-1");

    expect(prismaMock.mileageLog.create).not.toHaveBeenCalled();
  });

  it("skips a leg under 0.1 miles", async () => {
    const b = makeBooking({ latitude: HOME.latitude, longitude: HOME.longitude });
    prismaMock.booking.findUnique.mockResolvedValue(b);
    prismaMock.mileageLog.findFirst.mockResolvedValue(null);
    prismaMock.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([b]);

    await captureAutoMileage("booking-1");

    expect(prismaMock.mileageLog.create).not.toHaveBeenCalled();
  });
});
