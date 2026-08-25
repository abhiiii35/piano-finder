import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockTechnicianSession,
  mockCustomerSession,
  fixtures,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getFinanceReport } from "@/actions/finance-report";

const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(
    fixtures.technicianProfile
  );
}

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    ...fixtures.payment,
    status: "SUCCEEDED",
    booking: {
      ...fixtures.booking,
      customer: { name: "Jane Doe" },
      services: [{ service: { name: "Standard Tuning" } }],
    },
    ...overrides,
  };
}

describe("getFinanceReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.expense.findMany.mockResolvedValue([]);
    prismaMock.mileageLog.findMany.mockResolvedValue([]);
  });

  it("income reconciles exactly with SUCCEEDED payment amounts plus tips", async () => {
    setupTechSession();
    const payments = [
      paymentRow({ amountCents: 17500, tipCents: 2000 }),
      paymentRow({ id: "payment-2", amountCents: 25000, tipCents: 500 }),
    ];
    prismaMock.payment.findMany.mockResolvedValue(payments);

    const result = await getFinanceReport("2026-01-01", "2026-12-31");
    expect(result.error).toBeUndefined();
    expect(result.report!.incomeCents).toBe(17500 + 2000 + 25000 + 500);
  });

  it("only queries SUCCEEDED payments scoped to the technician's bookings in range", async () => {
    setupTechSession();
    await getFinanceReport("2026-01-01", "2026-01-31");

    const where = prismaMock.payment.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("SUCCEEDED");
    expect(where.booking.technicianId).toBe("tech-profile-1");
    // range: inclusive local start, exclusive next-day end
    expect(where.booking.scheduledAt.gte).toEqual(new Date(2026, 0, 1));
    expect(where.booking.scheduledAt.lt).toEqual(new Date(2026, 1, 1));
  });

  it("builds the P&L from expenses and mileage in the range", async () => {
    setupTechSession();
    prismaMock.payment.findMany.mockResolvedValue([
      paymentRow({ amountCents: 50000, tipCents: 0 }),
    ]);
    prismaMock.expense.findMany.mockResolvedValue([
      { ...fixtures.expense, amountCents: 12000, category: "Vehicle & Fuel" },
    ]);
    prismaMock.mileageLog.findMany.mockResolvedValue([
      { ...fixtures.mileageLog, date: new Date(2026, 5, 3), miles: 100 },
    ]);

    const result = await getFinanceReport("2026-01-01", "2026-12-31");
    const report = result.report!;
    expect(report.expenseTotalCents).toBe(12000);
    expect(report.netCents).toBe(38000);
    expect(report.mileage.totalMiles).toBe(100);
    expect(report.mileage.totalDeductionCents).toBe(7250); // 100 mi * 72.5c (2026)
  });

  it("returns an error for an invalid range", async () => {
    setupTechSession();
    const result = await getFinanceReport("2026-02-01", "2026-01-01");
    expect(result.error).toBeDefined();
    expect(prismaMock.payment.findMany).not.toHaveBeenCalled();
  });

  it("rejects non-technicians", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    await expect(
      getFinanceReport("2026-01-01", "2026-12-31")
    ).rejects.toThrow("Unauthorized");
  });
});
