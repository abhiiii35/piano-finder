import { describe, it, expect } from "vitest";
import { customerRecordSchema } from "@/lib/validations/customer-record";

describe("customerRecordSchema", () => {
  it("accepts valid full record", () => {
    const result = customerRecordSchema.safeParse({
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      customerPhone: "617-555-0100",
      pianoMake: "Steinway",
      pianoModel: "Model B",
      serialNumber: "SN12345",
      pianoLocation: "Living room",
      notes: "Annual client",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal record (name only)", () => {
    expect(customerRecordSchema.safeParse({ customerName: "Jane" }).success).toBe(true);
  });

  it("accepts empty email string", () => {
    const result = customerRecordSchema.safeParse({ customerName: "Jane", customerEmail: "" });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    expect(customerRecordSchema.safeParse({ customerName: "" }).success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = customerRecordSchema.safeParse({ customerName: "Jane", customerEmail: "not-email" });
    expect(result.success).toBe(false);
  });
});
