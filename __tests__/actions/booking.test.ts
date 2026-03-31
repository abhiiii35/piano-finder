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

import { getServerSession } from "next-auth";
import { sendEmail } from "@/lib/email";
import { createBooking, updateBookingStatus, getAvailableSlots } from "@/actions/booking";

const mockGetSession = vi.mocked(getServerSession);

describe("createBooking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a booking with selected services", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.service.findMany.mockResolvedValue([fixtures.service]);
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
    const bookingDate = new Date("2026-04-14");
    bookingDate.setHours(9, 0, 0, 0);

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
