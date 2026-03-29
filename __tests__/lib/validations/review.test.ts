import { describe, it, expect } from "vitest";
import { reviewSchema } from "@/lib/validations/review";

describe("reviewSchema", () => {
  it("accepts valid review", () => {
    const result = reviewSchema.safeParse({
      bookingId: "booking-1",
      rating: 5,
      comment: "Great service!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts review without comment", () => {
    const result = reviewSchema.safeParse({ bookingId: "booking-1", rating: 3 });
    expect(result.success).toBe(true);
  });

  it("coerces rating from string", () => {
    const result = reviewSchema.safeParse({ bookingId: "booking-1", rating: "4" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.rating).toBe(4);
  });

  it("rejects rating below 1", () => {
    expect(reviewSchema.safeParse({ bookingId: "b-1", rating: 0 }).success).toBe(false);
  });

  it("rejects rating above 5", () => {
    expect(reviewSchema.safeParse({ bookingId: "b-1", rating: 6 }).success).toBe(false);
  });

  it("rejects comment over 1000 chars", () => {
    const result = reviewSchema.safeParse({
      bookingId: "b-1",
      rating: 5,
      comment: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});
