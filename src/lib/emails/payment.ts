import { buildEmailHtml } from "@/lib/email";
import { formatCents } from "@/lib/utils";
import { format } from "date-fns";

export function paymentReceiptEmail(
  booking: { scheduledAt: Date },
  payment: { amountCents: number; method: string | null },
  services: string[]
): { subject: string; html: string } {
  const amount = formatCents(payment.amountCents);
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy");
  return {
    subject: `Payment receipt - ${amount}`,
    html: buildEmailHtml("Payment Receipt",
      `<p>Your payment has been processed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;font-weight:600;">${amount}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Method</td><td style="padding:8px 0;">${payment.method ?? "Card"}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Services</td><td style="padding:8px 0;">${services.join(", ")}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;">${dateStr}</td></tr>
      </table>
      <p>Thank you for choosing PianoTuner!</p>`),
  };
}
