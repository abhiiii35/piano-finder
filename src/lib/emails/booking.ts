import { buildEmailHtml } from "@/lib/email";
import { formatCents } from "@/lib/utils";
import { format } from "date-fns";

type BookingInfo = {
  id: string;
  scheduledAt: Date;
  addressLine1: string;
  city: string;
  state: string;
  totalCents: number;
};

export function bookingCreatedEmail(booking: BookingInfo, technicianName: string, services: string[]): { subject: string; html: string } {
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a");
  return {
    subject: `Booking Confirmed - ${services.join(", ")}`,
    html: buildEmailHtml("Booking Confirmed",
      `<p>Your booking has been created!</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#64748b;">Technician</td><td style="padding:8px 0;font-weight:600;">${technicianName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Services</td><td style="padding:8px 0;">${services.join(", ")}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Location</td><td style="padding:8px 0;">${booking.addressLine1}, ${booking.city}, ${booking.state}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Total</td><td style="padding:8px 0;font-weight:600;">${formatCents(booking.totalCents)}</td></tr>
      </table>`),
  };
}

export function bookingReceivedEmail(booking: BookingInfo, customerName: string, services: string[]): { subject: string; html: string } {
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a");
  return {
    subject: `New Booking - ${customerName}`,
    html: buildEmailHtml("New Booking Received",
      `<p>You have a new booking from <strong>${customerName}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#64748b;">Customer</td><td style="padding:8px 0;font-weight:600;">${customerName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Services</td><td style="padding:8px 0;">${services.join(", ")}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Location</td><td style="padding:8px 0;">${booking.addressLine1}, ${booking.city}, ${booking.state}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Total</td><td style="padding:8px 0;font-weight:600;">${formatCents(booking.totalCents)}</td></tr>
      </table>
      <p>Log in to your dashboard to confirm or manage this booking.</p>`),
  };
}

const STATUS_SUBJECTS: Record<string, string> = {
  CONFIRMED: "Your booking has been confirmed",
  IN_PROGRESS: "Your technician is on the way",
  COMPLETED: "Service completed",
};

export function bookingStatusEmail(booking: BookingInfo, newStatus: string, technicianName: string): { subject: string; html: string } {
  const subject = STATUS_SUBJECTS[newStatus] ?? `Booking status: ${newStatus}`;
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a");
  return {
    subject,
    html: buildEmailHtml(subject,
      `<p>Your booking with <strong>${technicianName}</strong> on ${dateStr} has been updated.</p>
      <p style="font-size:16px;font-weight:600;color:#1e293b;">Status: ${newStatus}</p>`),
  };
}

export function bookingCancelledEmail(booking: BookingInfo): { subject: string; html: string } {
  const dateStr = format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a");
  return {
    subject: "Booking cancelled",
    html: buildEmailHtml("Booking Cancelled",
      `<p>The booking scheduled for ${dateStr} has been cancelled.</p>
      <p>If you have questions, please contact us through the platform.</p>`),
  };
}
