import { IRS_MILEAGE_RATE_CENTS_PER_MILE } from "@/lib/constants";

export type IncomePayment = { amountCents: number; tipCents: number };
export type ReportExpense = {
  category: string;
  amountCents: number;
  deductible: boolean;
};
export type ReportMileageLog = { date: Date; miles: number };

export type CategoryTotal = {
  category: string;
  totalCents: number;
  count: number;
};

export type MileageYearLine = {
  year: number;
  miles: number;
  rateCentsPerMile: number | null;
  deductionCents: number | null;
};

export type MileageSummary = {
  totalMiles: number;
  byYear: MileageYearLine[];
  totalDeductionCents: number;
  missingRateYears: number[];
};

export type ProfitAndLoss = {
  incomeCents: number;
  expenseTotalCents: number;
  deductibleExpenseCents: number;
  expensesByCategory: CategoryTotal[];
  mileage: MileageSummary;
  netCents: number;
};

export function sumIncomeCents(payments: IncomePayment[]): number {
  return payments.reduce((sum, p) => sum + p.amountCents + p.tipCents, 0);
}

export function expenseTotalsByCategory(
  expenses: ReportExpense[]
): CategoryTotal[] {
  const byCategory = new Map<string, CategoryTotal>();
  for (const expense of expenses) {
    const entry = byCategory.get(expense.category) ?? {
      category: expense.category,
      totalCents: 0,
      count: 0,
    };
    entry.totalCents += expense.amountCents;
    entry.count += 1;
    byCategory.set(expense.category, entry);
  }
  return [...byCategory.values()].sort((a, b) => b.totalCents - a.totalCents);
}

export function mileageRateCentsPerMile(year: number): number | null {
  return IRS_MILEAGE_RATE_CENTS_PER_MILE[year] ?? null;
}

export function mileageDeductionCents(
  miles: number,
  rateCentsPerMile: number
): number {
  return Math.round(miles * rateCentsPerMile);
}

function summarizeMileage(mileageLogs: ReportMileageLog[]): MileageSummary {
  const milesByYear = new Map<number, number>();
  for (const log of mileageLogs) {
    const year = log.date.getFullYear();
    milesByYear.set(year, (milesByYear.get(year) ?? 0) + log.miles);
  }

  const byYear: MileageYearLine[] = [...milesByYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, miles]) => {
      const rate = mileageRateCentsPerMile(year);
      return {
        year,
        miles,
        rateCentsPerMile: rate,
        deductionCents: rate === null ? null : mileageDeductionCents(miles, rate),
      };
    });

  return {
    totalMiles: byYear.reduce((sum, line) => sum + line.miles, 0),
    byYear,
    totalDeductionCents: byYear.reduce(
      (sum, line) => sum + (line.deductionCents ?? 0),
      0
    ),
    missingRateYears: byYear
      .filter((line) => line.rateCentsPerMile === null)
      .map((line) => line.year),
  };
}

export function buildProfitAndLoss(input: {
  payments: IncomePayment[];
  expenses: ReportExpense[];
  mileageLogs: ReportMileageLog[];
}): ProfitAndLoss {
  const incomeCents = sumIncomeCents(input.payments);
  const expenseTotalCents = input.expenses.reduce(
    (sum, e) => sum + e.amountCents,
    0
  );
  return {
    incomeCents,
    expenseTotalCents,
    deductibleExpenseCents: input.expenses
      .filter((e) => e.deductible)
      .reduce((sum, e) => sum + e.amountCents, 0),
    expensesByCategory: expenseTotalsByCategory(input.expenses),
    mileage: summarizeMileage(input.mileageLogs),
    netCents: incomeCents - expenseTotalCents,
  };
}
