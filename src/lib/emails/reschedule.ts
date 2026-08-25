import { buildEmailHtml } from "@/lib/email";
import { format } from "date-fns";

type RescheduleBookingInfo = {
  id: string;
  scheduledAt: Date;
  addressLine1: string;
  city: string;
  state: string;
};

export function rescheduledNoticeEmail(booking: RescheduleBookingInfo): { subject: string; html: string } {
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a");
  return {
    subject: "Your appointment was rescheduled",
    html: buildEmailHtml("Appointment Rescheduled",
      `<p>Your appointment has been moved to a new time.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#64748b;">New Date</td><td style="padding:8px 0;font-weight:600;">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Location</td><td style="padding:8px 0;">${booking.addressLine1}, ${booking.city}, ${booking.state}</td></tr>
      </table>
      <p>Log in to your dashboard for the full booking details.</p>`),
  };
}

export function proposalEmail(booking: RescheduleBookingInfo, slots: string[], token: string): { subject: string; html: string } {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/reschedule/${token}`;
  const items = slots
    .map((s) => `<li style="padding:4px 0;">${format(new Date(s), "MMMM d, yyyy 'at' h:mm a")}</li>`)
    .join("");
  return {
    subject: "Your technician offered new appointment times",
    html: buildEmailHtml("New Times Offered",
      `<p>Your technician isn't able to make your current appointment time and has offered these alternatives:</p>
      <ul style="margin:16px 0;padding-left:20px;">${items}</ul>
      <p style="margin-top:24px;">
        <a href="${link}" style="display:inline-block;background-color:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Pick a Time</a>
      </p>`),
  };
}

export function proposalAcceptedEmail(booking: RescheduleBookingInfo, customerName: string): { subject: string; html: string } {
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a");
  return {
    subject: `${customerName} picked a new appointment time`,
    html: buildEmailHtml("New Time Confirmed",
      `<p><strong>${customerName}</strong> chose one of the times you offered.</p>
      <p style="font-size:16px;font-weight:600;color:#1e293b;">${dateStr}</p>`),
  };
}
