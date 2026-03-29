import { describe, it, expect } from "vitest";
import { bookingSchema } from "@/lib/validations/booking";

describe("bookingSchema", () => {
  const valid = {
    technicianId: "tech-1",
    serviceIds: ["service-1"],
    scheduledAt: "2026-04-15T10:00:00",
    addressLine1: "123 Main St",
    city: "Boston",
    state: "MA",
    zipCode: "02108",
  };

  it("accepts valid booking input", () => {
    expect(bookingSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts with optional fields", () => {
    const result = bookingSchema.safeParse({
      ...valid,
      pianoType: "GRAND",
      pianoMake: "Steinway",
      notes: "Ring doorbell",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty serviceIds", () => {
    const result = bookingSchema.safeParse({ ...valid, serviceIds: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing address", () => {
    const result = bookingSchema.safeParse({ ...valid, addressLine1: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing city", () => {
    const result = bookingSchema.safeParse({ ...valid, city: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing scheduledAt", () => {
    const result = bookingSchema.safeParse({ ...valid, scheduledAt: "" });
    expect(result.success).toBe(false);
  });
});
