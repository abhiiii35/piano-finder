import { describe, it, expect, vi, beforeEach } from "vitest";
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
// Mock only geocode (network call); keep haversineDistance real so the free
// travel-time provider runs its actual math.
vi.mock("@/lib/geocoding", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/geocoding")>();
  return { ...actual, geocode: vi.fn() };
});

import { getServerSession } from "next-auth";
import { sendEmail } from "@/lib/email";
import { geocode } from "@/lib/geocoding";
import { createBooking, updateBookingStatus, getAvailableSlots } from "@/actions/booking";

const mockGetSession = vi.mocked(getServerSession);
const mockGeocode = vi.mocked(geocode);

describe("createBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction = vi.fn(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      return cb(prismaMock);
    });
    // Default: user is email-verified (checked from DB, not session)
    prismaMock.user.findUnique.mockResolvedValue({
      ...fixtures.user,
      emailVerified: new Date(),
    });
  });

  it("creates a booking with selected services", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.service.findMany.mockResolvedValue([fixtures.service]);
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
    expect(result.bookingId).toBe("new-booking");
    expect(prismaMock.booking.create).toHaveBeenCalledOnce();
    const createCall = prismaMock.booking.create.mock.calls[0][0];
    expect(createCall.data.totalCents).toBe(17500);
    expect(createCall.data.durationMin).toBe(90);
  });

  it("sums multiple services correctly", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.service.findMany.mockResolvedValue([fixtures.service, fixtures.service2]);
    prismaMock.booking.findFirst.mockResolvedValue(null);
    prismaMock.booking.create.mockResolvedValue({ id: "new-booking" });

    const result = await createBooking({
      technicianId: "tech-profile-1",
      serviceIds: ["service-1", "service-2"],
      scheduledAt: "2026-04-15T10:00:00",
      addressLine1: "123 Main St",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
    });

    expect(result.success).toBe(true);
    const createCall = prismaMock.booking.create.mock.calls[0][0];
    expect(createCall.data.totalCents).toBe(42500); // 175 + 250
    expect(createCall.data.durationMin).toBe(210); // 90 + 120
  });

  it("rejects unverified user", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession({ emailVerified: null }));
    prismaMock.user.findUnique.mockResolvedValue({
      ...fixtures.user,
      emailVerified: null,
    });

    const result = await createBooking({
      technicianId: "tech-profile-1",
      serviceIds: ["service-1"],
      scheduledAt: "2026-04-15T10:00:00",
      addressLine1: "123 Main St",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
    });

    expect(result.error).toContain("verify your email");
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await createBooking({
      technicianId: "tech-1",
      serviceIds: ["s-1"],
      scheduledAt: "2026-04-15T10:00:00",
      addressLine1: "123 Main",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
    });

    expect(result.error).toContain("sign in");
  });

  it("rejects when no valid services found", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.service.findMany.mockResolvedValue([]);

    const result = await createBooking({
      technicianId: "tech-1",
      serviceIds: ["nonexistent"],
      scheduledAt: "2026-04-15T10:00:00",
      addressLine1: "123 Main",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
    });

    expect(result.error).toContain("No valid services");
  });

  it("sends confirmation emails to customer and technician", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.service.findMany.mockResolvedValue([fixtures.service]);
    prismaMock.booking.findFirst.mockResolvedValue(null);
    prismaMock.booking.create.mockResolvedValue({
      id: "new-booking",
      scheduledAt: new Date("2026-04-15T10:00:00"),
      addressLine1: "123 Main",
      city: "Boston",
      state: "MA",
      totalCents: 17500,
    });
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      user: { name: "Mike Tuner", email: "tech@example.com" },
    });

    await createBooking({
      technicianId: "tech-profile-1",
      serviceIds: ["service-1"],
      scheduledAt: "2026-04-15T10:00:00",
      addressLine1: "123 Main",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
    });

    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("rejects booking when time slot conflicts with existing booking", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.service.findMany.mockResolvedValue([fixtures.service]); // 90 min

    // Simulate transaction by making $transaction call the callback with prismaMock
    prismaMock.$transaction = vi.fn(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      return cb(prismaMock);
    });

    // Existing booking overlaps: 09:30-11:00 overlaps with requested 10:00-11:30
    const existingBookingDate = new Date("2026-04-15T00:00:00");
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
});

describe("updateBookingStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows technician to confirm a pending booking", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique.mockResolvedValue({
      ...fixtures.booking,
      status: "PENDING",
      technician: { userId: "tech-user-1" },
    });
    prismaMock.booking.update.mockResolvedValue({});

    const result = await updateBookingStatus("booking-1", "CONFIRMED");
    expect(result.success).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: { status: "CONFIRMED" },
    });
  });

  it("allows customer to cancel a pending booking", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findUnique.mockResolvedValue({
      ...fixtures.booking,
      status: "PENDING",
      customerId: "customer-1",
      technician: { userId: "tech-user-1" },
    });
    prismaMock.booking.update.mockResolvedValue({});

    const result = await updateBookingStatus("booking-1", "CANCELLED");
    expect(result.success).toBe(true);
  });

  it("rejects invalid status transition", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique.mockResolvedValue({
      ...fixtures.booking,
      status: "COMPLETED",
      technician: { userId: "tech-user-1" },
    });

    const result = await updateBookingStatus("booking-1", "CONFIRMED");
    expect(result.error).toContain("Invalid status");
  });

  it("rejects unauthorized user", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await updateBookingStatus("booking-1", "CONFIRMED");
    expect(result.error).toContain("Unauthorized");
  });

  it("auto-populates CRM CustomerRecord when booking completes", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique
      .mockResolvedValueOnce({
        ...fixtures.booking,
        status: "IN_PROGRESS",
        technician: { userId: "tech-user-1" },
      })
      // Second findUnique call for email sending
      .mockResolvedValueOnce({
        ...fixtures.booking,
        status: "COMPLETED",
        customer: { email: "customer@example.com" },
        technician: { user: { name: "Mike Tuner", email: "tech@example.com" } },
      })
      // Third findUnique call for CRM auto-populate
      .mockResolvedValueOnce({
        ...fixtures.booking,
        customer: {
          name: "Jane Doe",
          email: "customer@example.com",
          phone: "617-555-0100",
        },
      });
    prismaMock.booking.update.mockResolvedValue({});
    prismaMock.customerRecord.upsert.mockResolvedValue({});

    const result = await updateBookingStatus("booking-1", "COMPLETED");

    expect(result.success).toBe(true);
    expect(prismaMock.customerRecord.upsert).toHaveBeenCalledOnce();
    expect(prismaMock.customerRecord.upsert).toHaveBeenCalledWith({
      where: {
        technicianId_customerEmail: {
          technicianId: "tech-profile-1",
          customerEmail: "customer@example.com",
        },
      },
      update: expect.objectContaining({
        customerName: "Jane Doe",
        pianoMake: "Steinway",
      }),
      create: expect.objectContaining({
        technicianId: "tech-profile-1",
        customerEmail: "customer@example.com",
        customerName: "Jane Doe",
        pianoMake: "Steinway",
        pianoModel: "Model B",
      }),
    });
  });

  it("does not populate CRM for non-COMPLETED status changes", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.booking.findUnique
      .mockResolvedValueOnce({
        ...fixtures.booking,
        status: "PENDING",
        technician: { userId: "tech-user-1" },
      })
      .mockResolvedValueOnce({
        ...fixtures.booking,
        status: "CONFIRMED",
        customer: { email: "customer@example.com" },
        technician: { user: { name: "Mike Tuner", email: "tech@example.com" } },
      });
    prismaMock.booking.update.mockResolvedValue({});

    await updateBookingStatus("booking-1", "CONFIRMED");

    expect(prismaMock.customerRecord.upsert).not.toHaveBeenCalled();
  });
});

describe("getAvailableSlots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 30-min slots for available day", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "11:00",
    });
    prismaMock.booking.findMany.mockResolvedValue([]);

    const slots = await getAvailableSlots("tech-1", "2026-04-14"); // Monday
    expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  it("returns empty for unavailable day", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue(null);

    const slots = await getAvailableSlots("tech-1", "2026-04-13"); // Sunday
    expect(slots).toEqual([]);
  });

  it("filters out booked slots", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "11:00",
    });

    // Create a booking at 09:00 local time on the target date
    const bookingDate = new Date(2026, 3, 14, 9, 0, 0, 0);

    prismaMock.booking.findMany.mockResolvedValue([
      { scheduledAt: bookingDate, durationMin: 90 },
    ]);

    const slots = await getAvailableSlots("tech-1", "2026-04-14");
    // 09:00, 09:30, 10:00 overlap with the 90-min booking starting at 09:00
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("09:30");
    expect(slots).not.toContain("10:00");
    expect(slots).toContain("10:30");
  });

  it("filters slots that don't have enough room for the full duration", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "12:00",
    });

    // Existing booking at 10:30 for 60 min (occupies 10:30-11:30)
    const bookingDate = new Date(2026, 3, 14, 10, 30, 0, 0);

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

  it("excludes slots where duration exceeds availability end time", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "11:00",
    });
    prismaMock.booking.findMany.mockResolvedValue([]);

    // With 90-min duration, only 09:00 and 09:30 fit.
    // 10:00 + 90 = 11:30, exceeds 11:00 end time.
    const slots = await getAvailableSlots("tech-1", "2026-04-14", 90);
    expect(slots).toContain("09:00");
    expect(slots).toContain("09:30"); // 09:30 + 90 = 11:00 exactly, should fit
    expect(slots).not.toContain("10:00");
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
});

describe("getAvailableSlots with a customer address (travel feasibility)", () => {
  // Technician home base = fixtures.technicianProfile (Boston 42.36, -71.06).
  // Existing 60-min booking 12:00-13:00 in Worcester (~38.6 mi away):
  // haversine at 30 mph => 78 min travel, +30 buffer = 108 min per leg.
  const CUSTOMER_ADDRESS = {
    addressLine1: "10 Beacon St",
    city: "Boston",
    state: "MA",
    zipCode: "02108",
  };

  function seedDay(travelBufferMin = 30) {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "17:00",
    });
    const worcesterNoon = new Date(2026, 3, 14, 12, 0, 0, 0); // local noon
    prismaMock.booking.findMany.mockResolvedValue([
      {
        scheduledAt: worcesterNoon,
        durationMin: 60,
        latitude: 42.2626,
        longitude: -71.8023,
      },
    ]);
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      travelBufferMin,
    });
    // Customer geocodes to the technician's home base (0 min home leg)
    mockGeocode.mockResolvedValue({
      lat: 42.36,
      lng: -71.06,
      displayName: "Boston, MA",
    });
  }

  beforeEach(() => vi.clearAllMocks());

  it("removes slots the technician cannot reach in time, server-side", async () => {
    seedDay();
    const slots = await getAvailableSlots("tech-profile-1", "2026-04-14", 90, CUSTOMER_ADDRESS);
    // Morning slots (09:00-10:30) all end too close to the Worcester noon
    // booking (need 108 min after). Afternoon slots must start >= 13:00 + 108
    // => 15:00, but the home-base end anchor caps starts at 15:00. Only 15:00
    // survives.
    expect(slots).toEqual(["15:00"]);
  });

  it("makes no paid API call when billing is disabled", async () => {
    seedDay();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await getAvailableSlots("tech-profile-1", "2026-04-14", 90, CUSTOMER_ADDRESS);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("widening travelBufferMin removes more slots", async () => {
    seedDay(45);
    const slots = await getAvailableSlots("tech-profile-1", "2026-04-14", 90, CUSTOMER_ADDRESS);
    expect(slots).toEqual([]);
  });

  it("narrowing travelBufferMin restores slots", async () => {
    seedDay(0);
    const slots = await getAvailableSlots("tech-profile-1", "2026-04-14", 90, CUSTOMER_ADDRESS);
    // With no buffer, 09:00 (ends 10:30, 90 min ≥ 78 min drive to Worcester)
    // and three afternoon slots become reachable.
    expect(slots).toEqual(["09:00", "14:30", "15:00", "15:30"]);
  });

  it("returns unfiltered slots when the address cannot be geocoded", async () => {
    seedDay();
    mockGeocode.mockResolvedValue(null);
    const slots = await getAvailableSlots("tech-profile-1", "2026-04-14", 90, CUSTOMER_ADDRESS);
    // Fail open: base availability (overlap + window checks) still applies
    expect(slots).toEqual([
      "09:00", "09:30", "10:00", "10:30",
      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    ]);
  });
});

describe("createBooking travel feasibility and geocoding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction = vi.fn(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      return cb(prismaMock);
    });
    prismaMock.user.findUnique.mockResolvedValue({
      ...fixtures.user,
      emailVerified: new Date(),
    });
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.service.findMany.mockResolvedValue([fixtures.service]); // 90 min
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      user: { name: "Mike Tuner", email: "tech@example.com" },
    });
  });

  it("geocodes the address once and stores coordinates on the booking", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "17:00",
    });
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.booking.findFirst.mockResolvedValue(null);
    prismaMock.booking.create.mockResolvedValue({ id: "new-booking" });
    mockGeocode.mockResolvedValue({
      lat: 42.35,
      lng: -71.07,
      displayName: "10 Beacon St, Boston",
    });

    const result = await createBooking({
      technicianId: "tech-profile-1",
      serviceIds: ["service-1"],
      scheduledAt: "2026-04-14T10:00:00",
      addressLine1: "10 Beacon St",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
    });

    expect(result.success).toBe(true);
    expect(mockGeocode).toHaveBeenCalledTimes(1);
    const createCall = prismaMock.booking.create.mock.calls[0][0];
    expect(createCall.data.latitude).toBe(42.35);
    expect(createCall.data.longitude).toBe(-71.07);
  });

  it("rejects a slot without enough travel time and returns feasible alternatives", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "17:00",
    });
    const worcesterNoon = new Date(2026, 3, 14, 12, 0, 0, 0); // local noon
    prismaMock.booking.findMany.mockResolvedValue([
      {
        scheduledAt: worcesterNoon,
        durationMin: 60,
        latitude: 42.2626,
        longitude: -71.8023,
      },
    ]);
    mockGeocode.mockResolvedValue({
      lat: 42.36,
      lng: -71.06,
      displayName: "Boston, MA",
    });

    // 10:00-11:30 is free of overlaps but leaves only 30 min to reach the
    // Worcester booking that needs 108 min of travel + buffer.
    const result = await createBooking({
      technicianId: "tech-profile-1",
      serviceIds: ["service-1"],
      scheduledAt: "2026-04-14T10:00:00",
      addressLine1: "10 Beacon St",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
    });

    expect(result.error).toMatch(/travel/i);
    expect(result.availableSlots).toEqual(["15:00"]);
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it("still creates the booking (without coordinates) when geocoding fails", async () => {
    prismaMock.availabilitySlot.findFirst.mockResolvedValue({
      startTime: "09:00",
      endTime: "17:00",
    });
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.booking.findFirst.mockResolvedValue(null);
    prismaMock.booking.create.mockResolvedValue({ id: "new-booking" });
    mockGeocode.mockResolvedValue(null);

    const result = await createBooking({
      technicianId: "tech-profile-1",
      serviceIds: ["service-1"],
      scheduledAt: "2026-04-14T10:00:00",
      addressLine1: "10 Beacon St",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
    });

    expect(result.success).toBe(true);
    const createCall = prismaMock.booking.create.mock.calls[0][0];
    expect(createCall.data.latitude).toBeNull();
    expect(createCall.data.longitude).toBeNull();
  });
});
