import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const mockConstructEvent = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: (key: string) =>
        key === "stripe-signature" ? "test_sig" : null,
    })
  ),
}));

import { POST } from "@/app/api/webhooks/stripe/route";

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("processes checkout.session.completed event", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { bookingId: "booking-1" },
          payment_intent: "pi_test_123",
          amount_total: 17500,
        },
      },
    });
    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.create.mockResolvedValue({});

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: {
        bookingId: "booking-1",
        amountCents: 17500,
        status: "SUCCEEDED",
        stripePaymentId: "pi_test_123",
        method: "CARD",
      },
    });
  });

  it("updates existing payment record", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { bookingId: "booking-1" },
          payment_intent: "pi_test_456",
          amount_total: 17500,
        },
      },
    });
    prismaMock.payment.findUnique.mockResolvedValue({ id: "pay-1" });
    prismaMock.payment.update.mockResolvedValue({});

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(prismaMock.payment.update).toHaveBeenCalledOnce();
  });

  it("returns 400 for invalid signature", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: "invalid",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
