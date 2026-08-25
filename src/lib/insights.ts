// Pure aggregation functions for the technician business-insights dashboard.
// No Prisma here — the page fetches rows and joins them; these functions only
// crunch numbers so they're cheap to unit test.
//
// Money is integer cents in and out throughout. Revenue only counts payments
// with status "SUCCEEDED" and method "CARD" or "CASH" — this mirrors
// src/lib/finance/report.ts / src/lib/queries/finance.ts's getIncomePayments,
// which sums amountCents + tipCents for status: SUCCEEDED payments (method is
// always CARD or CASH per the Payment schema, so the method check is a no-op
// safety net, not a behavior change).

import { differenceInCalendarDays } from "date-fns";

const REVENUE_STATUS = "SUCCEEDED";
const REVENUE_METHODS = new Set(["CARD", "CASH"]);

export type RevenuePayment = {
  amountCents: number;
  tipCents: number;
  status: string;
  method: string | null;
  /** Booking's scheduledAt — income is recognized on the service date, same as finance reports. */
  date: Date;
};

function isRevenue(p: { status: string; method: string | null }): boolean {
  return p.status === REVENUE_STATUS && p.method !== null && REVENUE_METHODS.has(p.method);
}

function revenueCentsOf(p: RevenuePayment): number {
  return p.amountCents + p.tipCents;
}

function monthKey(year: number, month1to12: number): number {
  return year * 12 + (month1to12 - 1);
}

function isoMonthStart(key: number): string {
  const year = Math.floor(key / 12);
  const month = (key % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// ─── Monthly revenue trend ──────────────────────────────────────

export type MonthBucket = {
  /** ISO date, first of month, e.g. "2026-01-01" — format with date-fns in the UI. */
  date: string;
  revenueCents: number;
};

/** Trailing `months` calendar-month buckets ending at asOf's month, zero-filled. */
export function monthlyRevenue(
  payments: RevenuePayment[],
  asOf: Date = new Date(),
  months = 12
): MonthBucket[] {
  const endKey = monthKey(asOf.getFullYear(), asOf.getMonth() + 1);
  const startKey = endKey - (months - 1);
  const totals = new Map<number, number>();
  for (let key = startKey; key <= endKey; key++) totals.set(key, 0);

  for (const p of payments) {
    if (!isRevenue(p)) continue;
    const key = monthKey(p.date.getFullYear(), p.date.getMonth() + 1);
    if (totals.has(key)) totals.set(key, totals.get(key)! + revenueCentsOf(p));
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a - b)
    .map(([key, revenueCents]) => ({ date: isoMonthStart(key), revenueCents }));
}

function sumRevenueInKeyRange(payments: RevenuePayment[], keyLo: number, keyHi: number): number {
  let sum = 0;
  for (const p of payments) {
    if (!isRevenue(p)) continue;
    const key = monthKey(p.date.getFullYear(), p.date.getMonth() + 1);
    if (key >= keyLo && key <= keyHi) sum += revenueCentsOf(p);
  }
  return sum;
}

/** Trailing-12-months revenue vs. the 12 months before that. Null when the prior period had no revenue (avoids divide-by-zero). */
export function yoyGrowth(payments: RevenuePayment[], asOf: Date = new Date()): number | null {
  const endKey = monthKey(asOf.getFullYear(), asOf.getMonth() + 1);
  const current = sumRevenueInKeyRange(payments, endKey - 11, endKey);
  const prior = sumRevenueInKeyRange(payments, endKey - 23, endKey - 12);
  if (prior === 0) return null;
  return (current - prior) / prior;
}

/** Distinct calendar months with at least one qualifying revenue payment — used to gate the "not enough history" empty state. */
export function monthsOfHistory(payments: RevenuePayment[]): number {
  const months = new Set<number>();
  for (const p of payments) {
    if (isRevenue(p)) months.add(monthKey(p.date.getFullYear(), p.date.getMonth() + 1));
  }
  return months.size;
}

// ─── Revenue by service type ────────────────────────────────────

export type BookingServiceRow = {
  serviceId: string;
  priceCents: number;
  paymentStatus: string;
  paymentMethod: string | null;
};
export type ServiceRow = { id: string; name: string };
export type ServiceRevenue = { serviceName: string; revenueCents: number; bookingCount: number };

export function revenueByServiceType(
  bookingServices: BookingServiceRow[],
  services: ServiceRow[]
): ServiceRevenue[] {
  const nameById = new Map(services.map((s) => [s.id, s.name]));
  const totals = new Map<string, ServiceRevenue>();
  for (const bs of bookingServices) {
    if (!isRevenue({ status: bs.paymentStatus, method: bs.paymentMethod })) continue;
    const name = nameById.get(bs.serviceId) ?? "Other";
    const entry = totals.get(name) ?? { serviceName: name, revenueCents: 0, bookingCount: 0 };
    entry.revenueCents += bs.priceCents;
    entry.bookingCount += 1;
    totals.set(name, entry);
  }
  return [...totals.values()].sort((a, b) => b.revenueCents - a.revenueCents);
}

// ─── Average job value ───────────────────────────────────────────

/** Average amount+tip per qualifying (paid) booking. Null when there are none. */
export function avgJobValue(payments: RevenuePayment[]): number | null {
  const qualifying = payments.filter(isRevenue);
  if (qualifying.length === 0) return null;
  const total = qualifying.reduce((sum, p) => sum + revenueCentsOf(p), 0);
  return Math.round(total / qualifying.length);
}

// ─── Seasonality ─────────────────────────────────────────────────

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type SeasonalityMonth = {
  month: number; // 1-12
  label: string;
  revenueCents: number;
  isBusiest: boolean;
};

/** Total revenue per calendar month, summed across every year present. Flags the single busiest month (first on a tie; none flagged if all months are zero). */
export function seasonality(payments: RevenuePayment[]): SeasonalityMonth[] {
  const totals = new Array(12).fill(0) as number[];
  for (const p of payments) {
    if (!isRevenue(p)) continue;
    totals[p.date.getMonth()] += revenueCentsOf(p);
  }
  const max = Math.max(...totals);
  const busiestIndex = totals.indexOf(max);
  return totals.map((revenueCents, i) => ({
    month: i + 1,
    label: MONTH_LABELS[i],
    revenueCents,
    isBusiest: max > 0 && i === busiestIndex,
  }));
}

// ─── Profit margin trend ─────────────────────────────────────────

export type ExpenseRow = { amountCents: number; date: Date };

export type MarginMonth = {
  date: string; // ISO, first of month
  revenueCents: number;
  expenseCents: number;
  netCents: number;
  /** Null when revenueCents is 0 (avoids divide-by-zero). */
  marginPct: number | null;
};

export function profitMarginTrend(
  payments: RevenuePayment[],
  expenses: ExpenseRow[],
  asOf: Date = new Date(),
  months = 12
): MarginMonth[] {
  const endKey = monthKey(asOf.getFullYear(), asOf.getMonth() + 1);
  const startKey = endKey - (months - 1);
  const revenue = new Map<number, number>();
  const expense = new Map<number, number>();
  for (let key = startKey; key <= endKey; key++) {
    revenue.set(key, 0);
    expense.set(key, 0);
  }

  for (const p of payments) {
    if (!isRevenue(p)) continue;
    const key = monthKey(p.date.getFullYear(), p.date.getMonth() + 1);
    if (revenue.has(key)) revenue.set(key, revenue.get(key)! + revenueCentsOf(p));
  }
  for (const e of expenses) {
    const key = monthKey(e.date.getFullYear(), e.date.getMonth() + 1);
    if (expense.has(key)) expense.set(key, expense.get(key)! + e.amountCents);
  }

  return [...revenue.keys()]
    .sort((a, b) => a - b)
    .map((key) => {
      const revenueCents = revenue.get(key)!;
      const expenseCents = expense.get(key)!;
      const netCents = revenueCents - expenseCents;
      return {
        date: isoMonthStart(key),
        revenueCents,
        expenseCents,
        netCents,
        marginPct: revenueCents === 0 ? null : netCents / revenueCents,
      };
    });
}

// ─── Client loyalty ──────────────────────────────────────────────

export type CustomerBookingRow = { customerKey: string; status: string };

/** Share of customers with a completed booking who have 2+. Null when nobody has a completed booking yet. */
export function repeatClientRate(bookings: CustomerBookingRow[]): number | null {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    if (b.status !== "COMPLETED") continue;
    counts.set(b.customerKey, (counts.get(b.customerKey) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const repeat = [...counts.values()].filter((c) => c >= 2).length;
  return repeat / counts.size;
}

export type CompletedBookingRow = { customerKey: string; completedAt: Date };

/** Average (first→last completed booking) span per customer, in ~30-day months. Null when there are no completed bookings. */
export function avgClientTenureMonths(bookings: CompletedBookingRow[]): number | null {
  const byCustomer = new Map<string, { first: Date; last: Date }>();
  for (const b of bookings) {
    const entry = byCustomer.get(b.customerKey);
    if (!entry) {
      byCustomer.set(b.customerKey, { first: b.completedAt, last: b.completedAt });
    } else {
      if (b.completedAt < entry.first) entry.first = b.completedAt;
      if (b.completedAt > entry.last) entry.last = b.completedAt;
    }
  }
  if (byCustomer.size === 0) return null;
  const tenures = [...byCustomer.values()].map(
    ({ first, last }) => differenceInCalendarDays(last, first) / 30
  );
  return tenures.reduce((sum, t) => sum + t, 0) / tenures.length;
}

export type CustomerPaymentRow = RevenuePayment & { customerKey: string };

/** Average total paid (lifetime) per customer who has at least one qualifying payment. Null when there are none. */
export function clientLifetimeValue(payments: CustomerPaymentRow[]): number | null {
  const byCustomer = new Map<string, number>();
  for (const p of payments) {
    if (!isRevenue(p)) continue;
    byCustomer.set(p.customerKey, (byCustomer.get(p.customerKey) ?? 0) + revenueCentsOf(p));
  }
  if (byCustomer.size === 0) return null;
  const total = [...byCustomer.values()].reduce((sum, v) => sum + v, 0);
  return Math.round(total / byCustomer.size);
}

// ─── Revenue by city ─────────────────────────────────────────────

export type CityRevenueRow = RevenuePayment & { city: string };
export type CityRevenue = { city: string; revenueCents: number; bookingCount: number };

/** Top `topN` cities by revenue; ties broken alphabetically for a stable order. */
export function revenueByCity(rows: CityRevenueRow[], topN = 8): CityRevenue[] {
  const totals = new Map<string, CityRevenue>();
  for (const r of rows) {
    if (!isRevenue(r)) continue;
    const entry = totals.get(r.city) ?? { city: r.city, revenueCents: 0, bookingCount: 0 };
    entry.revenueCents += revenueCentsOf(r);
    entry.bookingCount += 1;
    totals.set(r.city, entry);
  }
  return [...totals.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents || a.city.localeCompare(b.city))
    .slice(0, topN);
}

// ─── Clients slipping away ───────────────────────────────────────

export type SlippingClientRow = {
  customerName: string;
  lastCompleted: Date;
  /** The customer's piano's tuningFrequencyMonths (pre-joined by the caller). */
  frequencyMonths: number;
};
const SLIPPING_THRESHOLD_MULTIPLIER = 1.25;
// ponytail: 30-day months (not calendar-exact addMonths) so the 1.25x cutoff
// is a plain day-count comparison — deterministic and easy to test at the
// boundary. Swap for exact calendar math if billing-cycle precision matters.
const DAYS_PER_MONTH = 30;

/**
 * Customers whose last completed booking is more than 1.25x their piano's
 * tuning frequency ago, most-overdue first. Generic so callers can pass
 * extra fields (e.g. a CRM record id to link to) straight through.
 */
export function slippingAway<T extends SlippingClientRow>(
  rows: T[],
  asOf: Date = new Date()
): (T & { monthsOverdue: number })[] {
  const result: (T & { monthsOverdue: number })[] = [];
  for (const r of rows) {
    const daysSince = differenceInCalendarDays(asOf, r.lastCompleted);
    const thresholdDays = r.frequencyMonths * SLIPPING_THRESHOLD_MULTIPLIER * DAYS_PER_MONTH;
    if (daysSince > thresholdDays) {
      result.push({ ...r, monthsOverdue: daysSince / DAYS_PER_MONTH });
    }
  }
  return result.sort((a, b) => b.monthsOverdue - a.monthsOverdue);
}
