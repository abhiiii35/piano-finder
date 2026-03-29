import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockCustomerSession,
  mockTechnicianSession,
  fixtures,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          url: "https://checkout.stripe.com/test",
        }),
      },
    },
  }),
}));

import { getServerSession } from "next-auth";
import { createCheckoutSession, markCashPayment } from "@/actions/payment";

const mockGetSession = vi.mocked(getServerSession);

describe("createCheckoutSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a checkout session", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      services: [{ service: fixtures.service, priceCents: 17500 }],
      payment: null,
    });

    const result = await createCheckoutSession("booking-1");
    expect(result.url).toBe("https://checkout.stripe.com/test");
  });

  it("rejects if already paid", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      services: [],
      payment: { status: "SUCCEEDED" },
    });

    const result = await createCheckoutSession("booking-1");
    expect(result.error).toContain("Already paid");
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await createCheckoutSession("booking-1");
    expect(result.error).toContain("Unauthorized");
  });
});

describe("markCashPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a cash payment record", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      payment: null,
    });
    prismaMock.payment.create.mockResolvedValue({});

    const result = await markCashPayment("booking-1");
    expect(result.success).toBe(true);
    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: {
        bookingId: "booking-1",
        amountCents: 17500,
        status: "SUCCEEDED",
        method: "CASH",
      },
    });
  });

  it("updates existing pending payment to cash", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      payment: { id: "pay-1", status: "PENDING" },
    });
    prismaMock.payment.update.mockResolvedValue({});

    const result = await markCashPayment("booking-1");
    expect(result.success).toBe(true);
    expect(prismaMock.payment.update).toHaveBeenCalledOnce();
  });

  it("rejects non-technician", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const result = await markCashPayment("booking-1");
    expect(result.error).toContain("Unauthorized");
  });
});
