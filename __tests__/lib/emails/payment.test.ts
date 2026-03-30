import { describe, it, expect } from "vitest";
import { paymentReceiptEmail } from "@/lib/emails/payment";

describe("paymentReceiptEmail", () => {
  it("includes amount in subject", () => {
    const { subject } = paymentReceiptEmail(
      { scheduledAt: new Date("2026-04-15T10:00:00") },
      { amountCents: 17500, method: "CARD" },
      ["Standard Tuning"]
    );
    expect(subject).toContain("$175.00");
  });

  it("includes services in HTML", () => {
    const { html } = paymentReceiptEmail(
      { scheduledAt: new Date("2026-04-15T10:00:00") },
      { amountCents: 17500, method: "CARD" },
      ["Standard Tuning"]
    );
    expect(html).toContain("Standard Tuning");
  });

  it("shows payment method", () => {
    const { html } = paymentReceiptEmail(
      { scheduledAt: new Date("2026-04-15T10:00:00") },
      { amountCents: 17500, method: "CASH" },
      ["Repair"]
    );
    expect(html).toContain("CASH");
  });
});
