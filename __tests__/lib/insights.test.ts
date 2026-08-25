import { describe, it, expect } from "vitest";
import { subDays } from "date-fns";
import {
  monthlyRevenue,
  monthsOfHistory,
  yoyGrowth,
  revenueByServiceType,
  avgJobValue,
  seasonality,
  profitMarginTrend,
  repeatClientRate,
  avgClientTenureMonths,
  clientLifetimeValue,
  revenueByCity,
  slippingAway,
  type RevenuePayment,
} from "@/lib/insights";

function payment(overrides: Partial<RevenuePayment> = {}): RevenuePayment {
  return {
    amountCents: 10000,
    tipCents: 0,
    status: "SUCCEEDED",
    method: "CARD",
    date: new Date(2026, 0, 15),
    ...overrides,
  };
}

describe("monthlyRevenue", () => {
  it("produces 12 zero-filled buckets crossing a Dec/Jan rollover", () => {
    // asOf Jan 2026 -> buckets Feb 2025 .. Jan 2026
    const asOf = new Date(2026, 0, 15);
    const payments = [
      payment({ date: new Date(2025, 11, 20), amountCents: 5000 }), // Dec 2025
      payment({ date: new Date(2026, 0, 5), amountCents: 3000 }), // Jan 2026
    ];
    const buckets = monthlyRevenue(payments, asOf);
    expect(buckets).toHaveLength(12);
    expect(buckets[0].date).toBe("2025-02-01");
    expect(buckets.at(-1)!.date).toBe("2026-01-01");
    const dec = buckets.find((b) => b.date === "2025-12-01");
    const jan = buckets.find((b) => b.date === "2026-01-01");
    expect(dec?.revenueCents).toBe(5000);
    expect(jan?.revenueCents).toBe(3000);
  });

  it("keeps a month with zero revenue present (not skipped)", () => {
    const asOf = new Date(2026, 2, 1); // Mar 2026
    const payments = [payment({ date: new Date(2026, 2, 1), amountCents: 1000 })];
    const buckets = monthlyRevenue(payments, asOf);
    const feb = buckets.find((b) => b.date === "2026-02-01");
    expect(feb).toBeDefined();
    expect(feb?.revenueCents).toBe(0);
  });

  it("excludes non-qualifying payments (not SUCCEEDED, or non card/cash method)", () => {
    const asOf = new Date(2026, 0, 15);
    const payments = [
      payment({ status: "PENDING", amountCents: 9999 }),
      payment({ method: null, amountCents: 9999 }),
      payment({ amountCents: 100 }),
    ];
    const total = monthlyRevenue(payments, asOf).reduce((s, b) => s + b.revenueCents, 0);
    expect(total).toBe(100);
  });
});

describe("yoyGrowth", () => {
  it("returns null when the prior 12-month period had zero revenue (no divide-by-zero)", () => {
    const asOf = new Date(2026, 5, 1);
    const payments = [payment({ date: new Date(2026, 4, 1), amountCents: 5000 })];
    expect(yoyGrowth(payments, asOf)).toBeNull();
  });

  it("computes growth between the two trailing 12-month windows", () => {
    const asOf = new Date(2026, 5, 1);
    const payments = [
      payment({ date: new Date(2025, 0, 1), amountCents: 10000 }), // prior window
      payment({ date: new Date(2026, 0, 1), amountCents: 15000 }), // current window
    ];
    expect(yoyGrowth(payments, asOf)).toBeCloseTo(0.5, 5);
  });
});

describe("monthsOfHistory", () => {
  it("counts distinct months with qualifying revenue", () => {
    const payments = [
      payment({ date: new Date(2026, 0, 1) }),
      payment({ date: new Date(2026, 0, 20) }), // same month
      payment({ date: new Date(2026, 1, 1) }),
      payment({ status: "PENDING", date: new Date(2026, 2, 1) }),
    ];
    expect(monthsOfHistory(payments)).toBe(2);
  });
});

describe("revenueByServiceType", () => {
  it("joins bookingServices to services and only counts qualifying payments", () => {
    const rows = revenueByServiceType(
      [
        { serviceId: "s1", priceCents: 10000, paymentStatus: "SUCCEEDED", paymentMethod: "CARD" },
        { serviceId: "s1", priceCents: 20000, paymentStatus: "SUCCEEDED", paymentMethod: "CASH" },
        { serviceId: "s2", priceCents: 5000, paymentStatus: "PENDING", paymentMethod: null },
      ],
      [
        { id: "s1", name: "Standard Tuning" },
        { id: "s2", name: "Pitch Raise" },
      ]
    );
    expect(rows).toEqual([{ serviceName: "Standard Tuning", revenueCents: 30000, bookingCount: 2 }]);
  });
});

describe("avgJobValue", () => {
  it("returns null when there are no qualifying payments", () => {
    expect(avgJobValue([payment({ status: "FAILED" })])).toBeNull();
  });

  it("averages amount + tip across qualifying payments", () => {
    const payments = [
      payment({ amountCents: 10000, tipCents: 1000 }),
      payment({ amountCents: 20000, tipCents: 0 }),
    ];
    expect(avgJobValue(payments)).toBe(15500);
  });
});

describe("seasonality", () => {
  it("sums revenue per calendar month across multiple years and flags the busiest", () => {
    const payments = [
      payment({ date: new Date(2024, 0, 5), amountCents: 10000 }), // Jan
      payment({ date: new Date(2025, 0, 5), amountCents: 10000 }), // Jan (another year)
      payment({ date: new Date(2025, 5, 5), amountCents: 5000 }), // Jun
    ];
    const months = seasonality(payments);
    const jan = months.find((m) => m.label === "Jan")!;
    const jun = months.find((m) => m.label === "Jun")!;
    expect(jan.revenueCents).toBe(20000);
    expect(jun.revenueCents).toBe(5000);
    expect(jan.isBusiest).toBe(true);
    expect(months.filter((m) => m.isBusiest)).toHaveLength(1);
  });

  it("flags nothing when there is no revenue at all", () => {
    const months = seasonality([]);
    expect(months.every((m) => !m.isBusiest)).toBe(true);
  });
});

describe("profitMarginTrend", () => {
  it("computes margin per month and returns null margin for a zero-revenue month", () => {
    const asOf = new Date(2026, 1, 1);
    const payments = [payment({ date: new Date(2026, 1, 1), amountCents: 10000 })];
    const expenses = [
      { amountCents: 4000, date: new Date(2026, 1, 1) },
      { amountCents: 500, date: new Date(2026, 0, 1) },
    ];
    const trend = profitMarginTrend(payments, expenses, asOf);
    const feb = trend.find((m) => m.date === "2026-02-01")!;
    const jan = trend.find((m) => m.date === "2026-01-01")!;
    expect(feb.marginPct).toBeCloseTo(0.6, 5);
    expect(feb.netCents).toBe(6000);
    expect(jan.revenueCents).toBe(0);
    expect(jan.marginPct).toBeNull();
  });
});

describe("repeatClientRate", () => {
  it("returns null for empty input", () => {
    expect(repeatClientRate([])).toBeNull();
  });

  it("returns null when nobody has a completed booking", () => {
    expect(repeatClientRate([{ customerKey: "a", status: "PENDING" }])).toBeNull();
  });

  it("computes the share of completed-booking customers with 2+", () => {
    const rows = [
      { customerKey: "a", status: "COMPLETED" },
      { customerKey: "a", status: "COMPLETED" },
      { customerKey: "b", status: "COMPLETED" },
      { customerKey: "c", status: "CANCELLED" },
    ];
    expect(repeatClientRate(rows)).toBeCloseTo(0.5, 5);
  });
});

describe("avgClientTenureMonths", () => {
  it("returns null for no completed bookings", () => {
    expect(avgClientTenureMonths([])).toBeNull();
  });

  it("averages first->last span per customer", () => {
    const rows = [
      { customerKey: "a", completedAt: new Date(2026, 0, 1) },
      { customerKey: "a", completedAt: new Date(2026, 5, 1) }, // 151 days later
      { customerKey: "b", completedAt: new Date(2026, 0, 1) }, // single booking -> 0 tenure
    ];
    const result = avgClientTenureMonths(rows)!;
    expect(result).toBeCloseTo((151 / 30 + 0) / 2, 3);
  });
});

describe("clientLifetimeValue", () => {
  it("returns null when nobody has a qualifying payment", () => {
    expect(clientLifetimeValue([])).toBeNull();
  });

  it("averages total paid per customer", () => {
    const rows = [
      { ...payment({ amountCents: 10000 }), customerKey: "a" },
      { ...payment({ amountCents: 20000 }), customerKey: "a" },
      { ...payment({ amountCents: 30000 }), customerKey: "b" },
    ];
    expect(clientLifetimeValue(rows)).toBe(30000); // (30000 + 30000) / 2
  });
});

describe("revenueByCity", () => {
  it("breaks ties alphabetically and caps at topN", () => {
    const rows = [
      { ...payment({ amountCents: 10000 }), city: "Springfield" },
      { ...payment({ amountCents: 10000 }), city: "Boston" },
      { ...payment({ amountCents: 5000 }), city: "Worcester" },
    ];
    const result = revenueByCity(rows, 8);
    expect(result[0]).toEqual({ city: "Boston", revenueCents: 10000, bookingCount: 1 });
    expect(result[1]).toEqual({ city: "Springfield", revenueCents: 10000, bookingCount: 1 });
    expect(result[2].city).toBe("Worcester");
  });

  it("caps results at topN", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      ...payment({ amountCents: 1000 * (i + 1) }),
      city: `City${i}`,
    }));
    expect(revenueByCity(rows, 8)).toHaveLength(8);
  });
});

describe("slippingAway", () => {
  it("is not slipping exactly at the 1.25x threshold", () => {
    const frequencyMonths = 6;
    const asOf = new Date(2026, 0, 1);
    // threshold = 6 * 1.25 * 30 = 225 days; subDays is calendar-day safe (no DST drift)
    const lastCompleted = subDays(asOf, 225);
    const rows = [{ customerName: "Jane", lastCompleted, frequencyMonths }];
    expect(slippingAway(rows, asOf)).toHaveLength(0);
  });

  it("is slipping just past the 1.25x threshold", () => {
    const frequencyMonths = 6;
    const asOf = new Date(2026, 0, 1);
    const lastCompleted = subDays(asOf, 226);
    const rows = [{ customerName: "Jane", lastCompleted, frequencyMonths }];
    const result = slippingAway(rows, asOf);
    expect(result).toHaveLength(1);
    expect(result[0].customerName).toBe("Jane");
  });

  it("sorts most-overdue first and passes extra fields through", () => {
    const asOf = new Date(2026, 0, 1);
    const rows = [
      { id: "c1", customerName: "Barely overdue", lastCompleted: new Date(2025, 5, 1), frequencyMonths: 3 },
      { id: "c2", customerName: "Very overdue", lastCompleted: new Date(2024, 0, 1), frequencyMonths: 3 },
    ];
    const result = slippingAway(rows, asOf);
    expect(result.map((r) => r.id)).toEqual(["c2", "c1"]);
    expect(result[0].monthsOverdue).toBeGreaterThan(result[1].monthsOverdue);
  });
});
