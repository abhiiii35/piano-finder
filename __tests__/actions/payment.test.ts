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
const mockCreateCheckoutSession = vi.fn().mockResolvedValue({
  url: "https://checkout.stripe.com/test",
});
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: mockCreateCheckoutSession,
      },
    },
  }),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn((heading: string, bodyHtml: string) => `<html>${heading}${bodyHtml}</html>`),
}));
vi.mock("@/lib/emails/payment", () => ({
  paymentReceiptEmail: vi.fn().mockReturnValue({
    subject: "Payment Receipt",
    html: "<html>receipt</html>",
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

  it("accepts a tip within range and adds it as a separate line item", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      totalCents: 17500,
      services: [{ service: fixtures.service, priceCents: 17500 }],
      payment: null,
    });

    const result = await createCheckoutSession("booking-1", 2625); // 15%
    expect(result.url).toBe("https://checkout.stripe.com/test");

    const call = mockCreateCheckoutSession.mock.calls[0][0];
    expect(call.metadata).toEqual({ bookingId: "booking-1", tipCents: "2625" });
    expect(call.line_items).toHaveLength(2);
    expect(call.line_items[1]).toMatchObject({
      price_data: {
        currency: "usd",
        product_data: { name: "Tip for your technician" },
        unit_amount: 2625,
      },
      quantity: 1,
    });
  });

  it("omits the tip line item when tipCents is 0", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      totalCents: 17500,
      services: [{ service: fixtures.service, priceCents: 17500 }],
      payment: null,
    });

    await createCheckoutSession("booking-1");

    const call = mockCreateCheckoutSession.mock.calls[0][0];
    expect(call.line_items).toHaveLength(1);
    expect(call.metadata).toEqual({ bookingId: "booking-1", tipCents: "0" });
  });

  it("rejects a tip over 100% of the booking total", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      totalCents: 17500,
      services: [{ service: fixtures.service, priceCents: 17500 }],
      payment: null,
    });

    const result = await createCheckoutSession("booking-1", 17501);
    expect(result.error).toContain("Invalid tip amount");
  });

  it("rejects a negative or non-integer tip", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      totalCents: 17500,
      services: [{ service: fixtures.service, priceCents: 17500 }],
      payment: null,
    });

    expect((await createCheckoutSession("booking-1", -100)).error).toContain(
      "Invalid tip amount"
    );
    expect((await createCheckoutSession("booking-1", 100.5)).error).toContain(
      "Invalid tip amount"
    );
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

  it("rejects if booking already has a SUCCEEDED payment", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      payment: { id: "pay-1", status: "SUCCEEDED" },
    });

    const result = await markCashPayment("booking-1");
    expect(result.error).toContain("Already paid");
  });

  it("still succeeds when email sending fails", async () => {
    mockGetSession.mockResolvedValue(mockTechnicianSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      payment: null,
    });
    prismaMock.payment.create.mockResolvedValue({});
    prismaMock.booking.findUnique.mockRejectedValue(new Error("DB error"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await markCashPayment("booking-1");
    expect(result.success).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      "[EMAIL] Failed to send payment receipt:",
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});
