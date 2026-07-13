import { describe, it, expect } from "vitest";
import { bookingCreatedEmail, bookingReceivedEmail, bookingStatusEmail, bookingCancelledEmail } from "@/lib/emails/booking";

const sampleBooking = {
  id: "booking-1",
  scheduledAt: new Date("2026-04-15T10:00:00"),
  addressLine1: "123 Main St",
  city: "Boston",
  state: "MA",
  totalCents: 17500,
};
const sampleServices = ["Standard Tuning"];

describe("bookingCreatedEmail", () => {
  it("includes service name in subject", () => {
    const { subject } = bookingCreatedEmail(sampleBooking, "Mike Tuner", sampleServices);
    expect(subject).toContain("Standard Tuning");
  });
  it("includes booking details in HTML", () => {
    const { html } = bookingCreatedEmail(sampleBooking, "Mike Tuner", sampleServices);
    expect(html).toContain("Mike Tuner");
    expect(html).toContain("123 Main St");
    expect(html).toContain("$175.00");
  });
  it("includes cancellation policy", () => {
    const { html } = bookingCreatedEmail(sampleBooking, "Mike Tuner", sampleServices);
    expect(html).toContain("Cancellation Policy");
    expect(html).toContain("24 hours");
  });
});

describe("bookingReceivedEmail", () => {
  it("includes customer name in subject", () => {
    const { subject } = bookingReceivedEmail(sampleBooking, "Jane Doe", sampleServices);
    expect(subject).toContain("Jane Doe");
  });
  it("includes booking details in HTML", () => {
    const { html } = bookingReceivedEmail(sampleBooking, "Jane Doe", sampleServices);
    expect(html).toContain("Jane Doe");
    expect(html).toContain("123 Main St");
  });
});

describe("bookingStatusEmail", () => {
  it("returns correct subject for CONFIRMED", () => {
    const { subject } = bookingStatusEmail(sampleBooking, "CONFIRMED", "Mike Tuner");
    expect(subject).toContain("confirmed");
  });
  it("returns correct subject for COMPLETED", () => {
    const { subject } = bookingStatusEmail(sampleBooking, "COMPLETED", "Mike Tuner");
    expect(subject).toContain("completed");
  });
  it("includes technician name in HTML", () => {
    const { html } = bookingStatusEmail(sampleBooking, "CONFIRMED", "Mike Tuner");
    expect(html).toContain("Mike Tuner");
  });
});

describe("bookingCancelledEmail", () => {
  it("includes cancelled in subject", () => {
    const { subject } = bookingCancelledEmail(sampleBooking);
    expect(subject).toContain("cancelled");
  });
});
