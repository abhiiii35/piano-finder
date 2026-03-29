import { describe, it, expect } from "vitest";
import { jobSchema } from "@/lib/validations/job";

describe("jobSchema", () => {
  const valid = {
    title: "Annual piano tuning",
    serviceType: "Tuning",
    description: "Need my piano tuned, it's been over a year.",
    budget: "200",
    city: "Boston",
    state: "MA",
  };

  it("accepts valid job input", () => {
    expect(jobSchema.safeParse(valid).success).toBe(true);
  });

  it("coerces budget from string to number", () => {
    const result = jobSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.budget).toBe(200);
  });

  it("rejects empty title", () => {
    expect(jobSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
  });

  it("rejects short description", () => {
    expect(jobSchema.safeParse({ ...valid, description: "short" }).success).toBe(false);
  });

  it("rejects zero budget", () => {
    expect(jobSchema.safeParse({ ...valid, budget: "0" }).success).toBe(false);
  });

  it("rejects missing city", () => {
    expect(jobSchema.safeParse({ ...valid, city: "" }).success).toBe(false);
  });

  it("rejects state longer than 2 chars", () => {
    expect(jobSchema.safeParse({ ...valid, state: "Massachusetts" }).success).toBe(false);
  });

  it("rejects missing serviceType", () => {
    expect(jobSchema.safeParse({ ...valid, serviceType: "" }).success).toBe(false);
  });
});
