import { describe, it, expect } from "vitest";
import {
  sumIncomeCents,
  expenseTotalsByCategory,
  mileageRateCentsPerMile,
  mileageDeductionCents,
  buildProfitAndLoss,
} from "@/lib/finance/report";

describe("sumIncomeCents", () => {
  it("sums payment amounts plus tips", () => {
    const payments = [
      { amountCents: 17500, tipCents: 2000 },
      { amountCents: 25000, tipCents: 0 },
    ];
    expect(sumIncomeCents(payments)).toBe(44500);
  });

  it("returns 0 for no payments", () => {
    expect(sumIncomeCents([])).toBe(0);
  });
});

describe("expenseTotalsByCategory", () => {
  it("groups totals by category, sorted by total descending", () => {
    const expenses = [
      { category: "Tools & Equipment", amountCents: 5000, deductible: true },
      { category: "Vehicle & Fuel", amountCents: 12000, deductible: true },
      { category: "Tools & Equipment", amountCents: 3000, deductible: false },
    ];
    expect(expenseTotalsByCategory(expenses)).toEqual([
      { category: "Vehicle & Fuel", totalCents: 12000, count: 1 },
      { category: "Tools & Equipment", totalCents: 8000, count: 2 },
    ]);
  });

  it("returns empty array for no expenses", () => {
    expect(expenseTotalsByCategory([])).toEqual([]);
  });
});

describe("mileageRateCentsPerMile", () => {
  it("returns the configured rate for a known year", () => {
    expect(mileageRateCentsPerMile(2025)).toBe(70);
    expect(mileageRateCentsPerMile(2026)).toBe(72.5);
  });

  it("returns null for a year with no configured rate", () => {
    expect(mileageRateCentsPerMile(1999)).toBeNull();
  });
});

describe("mileageDeductionCents", () => {
  it("multiplies miles by the rate and rounds to whole cents", () => {
    expect(mileageDeductionCents(100, 70)).toBe(7000);
    // 12.3 miles * 72.5 = 891.75 -> 892 cents
    expect(mileageDeductionCents(12.3, 72.5)).toBe(892);
  });

  it("returns 0 for zero miles", () => {
    expect(mileageDeductionCents(0, 70)).toBe(0);
  });
});

describe("buildProfitAndLoss", () => {
  const payments = [
    { amountCents: 17500, tipCents: 2000 },
    { amountCents: 25000, tipCents: 500 },
  ];
  const expenses = [
    { category: "Vehicle & Fuel", amountCents: 12000, deductible: true },
    { category: "Tools & Equipment", amountCents: 8000, deductible: false },
  ];

  it("computes income, expenses, and net (income minus expenses)", () => {
    const pl = buildProfitAndLoss({ payments, expenses, mileageLogs: [] });
    expect(pl.incomeCents).toBe(45000);
    expect(pl.expenseTotalCents).toBe(20000);
    expect(pl.netCents).toBe(25000);
    expect(pl.deductibleExpenseCents).toBe(12000);
    expect(pl.expensesByCategory).toHaveLength(2);
  });

  it("computes the mileage deduction per year using that year's rate", () => {
    const mileageLogs = [
      { date: new Date(2025, 5, 1), miles: 100 }, // 100 * 70 = 7000
      { date: new Date(2026, 1, 1), miles: 10 }, // 10 * 72.5 = 725
    ];
    const pl = buildProfitAndLoss({ payments: [], expenses: [], mileageLogs });
    expect(pl.mileage.totalMiles).toBe(110);
    expect(pl.mileage.byYear).toEqual([
      { year: 2025, miles: 100, rateCentsPerMile: 70, deductionCents: 7000 },
      { year: 2026, miles: 10, rateCentsPerMile: 72.5, deductionCents: 725 },
    ]);
    expect(pl.mileage.totalDeductionCents).toBe(7725);
    expect(pl.mileage.missingRateYears).toEqual([]);
  });

  it("flags years with no configured rate instead of guessing", () => {
    const mileageLogs = [{ date: new Date(2020, 3, 1), miles: 50 }];
    const pl = buildProfitAndLoss({ payments: [], expenses: [], mileageLogs });
    expect(pl.mileage.byYear).toEqual([
      { year: 2020, miles: 50, rateCentsPerMile: null, deductionCents: null },
    ]);
    expect(pl.mileage.totalDeductionCents).toBe(0);
    expect(pl.mileage.missingRateYears).toEqual([2020]);
  });

  it("does not subtract the mileage deduction from net", () => {
    const mileageLogs = [{ date: new Date(2026, 1, 1), miles: 100 }];
    const pl = buildProfitAndLoss({ payments, expenses, mileageLogs });
    expect(pl.netCents).toBe(25000);
  });

  it("net can be negative when expenses exceed income", () => {
    const pl = buildProfitAndLoss({
      payments: [{ amountCents: 1000, tipCents: 0 }],
      expenses: [{ category: "Other", amountCents: 5000, deductible: true }],
      mileageLogs: [],
    });
    expect(pl.netCents).toBe(-4000);
  });
});
