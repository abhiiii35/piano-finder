import { describe, it, expect } from "vitest";
import { profileSchema, serviceSchema, availabilitySchema } from "@/lib/validations/technician";

describe("profileSchema", () => {
  it("accepts empty input (all optional)", () => {
    expect(profileSchema.safeParse({}).success).toBe(true);
  });

  it("accepts full profile", () => {
    const result = profileSchema.safeParse({
      bio: "Experienced tuner",
      businessName: "Mike's Pianos",
      yearsExperience: "15",
      serviceRadius: "30",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
    });
    expect(result.success).toBe(true);
  });

  it("coerces yearsExperience from string to number", () => {
    const result = profileSchema.safeParse({ yearsExperience: "10" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.yearsExperience).toBe(10);
  });

  it("rejects negative yearsExperience", () => {
    const result = profileSchema.safeParse({ yearsExperience: "-1" });
    expect(result.success).toBe(false);
  });
});

describe("serviceSchema", () => {
  it("accepts valid service", () => {
    const result = serviceSchema.safeParse({
      name: "Standard Tuning",
      price: "175",
      durationMin: "90",
    });
    expect(result.success).toBe(true);
  });

  it("coerces price from string", () => {
    const result = serviceSchema.safeParse({ name: "Tuning", price: "175.50", durationMin: "90" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.price).toBe(175.5);
  });

  it("rejects missing name", () => {
    const result = serviceSchema.safeParse({ name: "", price: "100", durationMin: "60" });
    expect(result.success).toBe(false);
  });

  it("rejects zero price", () => {
    const result = serviceSchema.safeParse({ name: "Test", price: "0", durationMin: "60" });
    expect(result.success).toBe(false);
  });

  it("rejects too short duration", () => {
    const result = serviceSchema.safeParse({ name: "Test", price: "100", durationMin: "5" });
    expect(result.success).toBe(false);
  });
});

describe("availabilitySchema", () => {
  it("accepts valid availability", () => {
    const result = availabilitySchema.safeParse({
      dayOfWeek: "1",
      startTime: "09:00",
      endTime: "17:00",
      enabled: "true",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid time format", () => {
    const result = availabilitySchema.safeParse({
      dayOfWeek: "1",
      startTime: "9am",
      endTime: "5pm",
      enabled: "true",
    });
    expect(result.success).toBe(false);
  });

  it("rejects dayOfWeek out of range", () => {
    const result = availabilitySchema.safeParse({
      dayOfWeek: "7",
      startTime: "09:00",
      endTime: "17:00",
      enabled: "true",
    });
    expect(result.success).toBe(false);
  });
});
