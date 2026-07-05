import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockTechnicianSession,
  mockCustomerSession,
  fixtures,
} from "../../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { GET } from "@/app/api/finances/export/route";

const mockGetSession = vi.mocked(getServerSession);

function request(type: string, from = "2026-01-01", to = "2026-12-31") {
  return new Request(
    `http://localhost/api/finances/export?type=${type}&from=${from}&to=${to}`
  );
}

const paidBooking = {
  ...fixtures.payment,
  status: "SUCCEEDED",
  method: "CARD",
  amountCents: 17500,
  tipCents: 2000,
  booking: {
    ...fixtures.booking,
    scheduledAt: new Date(2026, 3, 15),
    customer: { name: "Jane Doe" },
    services: [{ service: { name: "Standard Tuning" } }],
  },
};

describe("GET /api/finances/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(
      fixtures.technicianProfile
    );
  });

  it("returns 401 for non-technicians", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const response = await GET(request("transactions"));
    expect(response.status).toBe(401);
  });

  it("rejects unknown export types", async () => {
    const response = await GET(request("quickbooks"));
    expect(response.status).toBe(400);
  });

  it("rejects an invalid date range", async () => {
    const response = await GET(
      request("transactions", "2026-12-31", "2026-01-01")
    );
    expect(response.status).toBe(400);
  });

  it("exports transactions as Date, Description, Amount, Category with signed amounts", async () => {
    prismaMock.payment.findMany.mockResolvedValue([paidBooking]);
    prismaMock.expense.findMany.mockResolvedValue([
      { ...fixtures.expense, date: new Date(2026, 5, 2) },
    ]);

    const response = await GET(request("transactions"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");

    const lines = (await response.text()).trimEnd().split("\r\n");
    expect(lines[0]).toBe("Date,Description,Amount,Category");
    // income: positive, amount + tip, categorized as business income
    expect(lines[1]).toBe(
      "04/15/2026,Standard Tuning - Jane Doe,195.00,Business income"
    );
    // expense: negative, vendor as description, its own category (sanitized)
    expect(lines[2]).toBe("06/02/2026,Schaff,-45.99,Tools and Equipment");
  });

  it("keeps custom expense categories in the Category column", async () => {
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.expense.findMany.mockResolvedValue([
      {
        ...fixtures.expense,
        category: "Piano wire stock",
        vendor: null,
        notes: null,
      },
    ]);

    const response = await GET(request("transactions"));
    const lines = (await response.text()).trimEnd().split("\r\n");
    // no vendor or notes -> category doubles as the description
    expect(lines[1]).toBe(
      "06/02/2026,Piano wire stock,-45.99,Piano wire stock"
    );
  });
});
