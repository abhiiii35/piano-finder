import { buildEmailHtml } from "@/lib/email";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function newMessageEmail(
  senderName: string,
  recipientName: string,
  content: string,
  bookingDate?: string
): { subject: string; html: string } {
  const preview = escapeHtml(content.length > 200 ? content.slice(0, 200) + "..." : content);
  const safeSender = escapeHtml(senderName);
  const safeRecipient = escapeHtml(recipientName);

  const subject = bookingDate
    ? `New message about your booking on ${bookingDate}`
    : `New message from ${senderName}`;

  return {
    subject,
    html: buildEmailHtml(
      bookingDate ? "New Message About Your Booking" : "New Message",
      `<p>Hi <strong>${safeRecipient}</strong>,</p>
      <p><strong>${safeSender}</strong> sent you a message:</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;white-space:pre-line;">${preview}</p>
      </div>
      <p>Log in to your dashboard to reply.</p>`
    ),
  };
}
