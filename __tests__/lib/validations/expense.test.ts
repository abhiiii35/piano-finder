import { describe, it, expect } from "vitest";
import { expenseSchema, mileageLogSchema } from "@/lib/validations/expense";

describe("expenseSchema", () => {
  const valid = {
    date: "2026-06-02",
    category: "Tools & Equipment",
    amount: "45.99",
    deductible: "on",
  };

  it("parses a valid expense and converts dollars to integer cents", () => {
    const result = expenseSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.amountCents).toBe(4599);
    expect(result.data.deductible).toBe(true);
    // local date, not UTC-shifted
    expect(result.data.date.getFullYear()).toBe(2026);
    expect(result.data.date.getMonth()).toBe(5);
    expect(result.data.date.getDate()).toBe(2);
  });

  it("converts whole and single-decimal dollar amounts exactly", () => {
    expect(
      expenseSchema.safeParse({ ...valid, amount: "45" }).success &&
        expenseSchema.parse({ ...valid, amount: "45" }).amountCents
    ).toBe(4500);
    expect(expenseSchema.parse({ ...valid, amount: "45.9" }).amountCents).toBe(
      4590
    );
    expect(expenseSchema.parse({ ...valid, amount: "0.05" }).amountCents).toBe(
      5
    );
  });

  it("treats an absent checkbox value as not deductible", () => {
    const result = expenseSchema.parse({ ...valid, deductible: undefined });
    expect(result.deductible).toBe(false);
  });

  it("rejects non-numeric, negative, symbol-laden, or >2-decimal amounts", () => {
    for (const amount of ["abc", "-5", "$45", "45.999", "", "1,000"]) {
      expect(expenseSchema.safeParse({ ...valid, amount }).success).toBe(false);
    }
  });

  it("rejects zero amounts", () => {
    expect(expenseSchema.safeParse({ ...valid, amount: "0" }).success).toBe(
      false
    );
    expect(expenseSchema.safeParse({ ...valid, amount: "0.00" }).success).toBe(
      false
    );
  });

  it("accepts IRS Schedule C and custom categories alike", () => {
    expect(
      expenseSchema.safeParse({ ...valid, category: "Supplies" }).success
    ).toBe(true);
    expect(
      expenseSchema.safeParse({ ...valid, category: "Piano wire stock" })
        .success
    ).toBe(true);
  });

  it("rejects empty or over-long categories", () => {
    expect(expenseSchema.safeParse({ ...valid, category: "" }).success).toBe(
      false
    );
    expect(
      expenseSchema.safeParse({ ...valid, category: "   " }).success
    ).toBe(false);
    expect(
      expenseSchema.safeParse({ ...valid, category: "x".repeat(61) }).success
    ).toBe(false);
  });

  it("trims whitespace around a category", () => {
    expect(
      expenseSchema.parse({ ...valid, category: "  Supplies  " }).category
    ).toBe("Supplies");
  });

  it("rejects malformed dates", () => {
    expect(
      expenseSchema.safeParse({ ...valid, date: "06/02/2026" }).success
    ).toBe(false);
    expect(
      expenseSchema.safeParse({ ...valid, date: "2026-13-45" }).success
    ).toBe(false);
  });
});

describe("mileageLogSchema", () => {
  const valid = { date: "2026-01-09", miles: "24.6", purpose: "Client visit" };

  it("parses a valid log", () => {
    const result = mileageLogSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.miles).toBe(24.6);
    expect(result.data.purpose).toBe("Client visit");
    expect(result.data.bookingId).toBeUndefined();
  });

  it("rejects zero, negative, or non-numeric miles", () => {
    for (const miles of ["0", "-3", "abc", ""]) {
      expect(mileageLogSchema.safeParse({ ...valid, miles }).success).toBe(
        false
      );
    }
  });

  it("rejects an empty purpose", () => {
    expect(mileageLogSchema.safeParse({ ...valid, purpose: "" }).success).toBe(
      false
    );
  });
});
