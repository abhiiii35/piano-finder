import { buildEmailHtml } from "@/lib/email";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function profileApprovedEmail(technicianName: string): { subject: string; html: string } {
  return {
    subject: "Your profile is live!",
    html: buildEmailHtml("Your Profile Has Been Approved",
      `<p>Hi <strong>${escapeHtml(technicianName)}</strong>,</p>
      <p>Great news! Your technician profile has been approved and is now visible to customers in search results.</p>
      <p>Log in to your dashboard to manage your bookings, services, and availability.</p>`),
  };
}

export function profileRejectedEmail(technicianName: string, reason: string): { subject: string; html: string } {
  return {
    subject: "Your profile needs changes",
    html: buildEmailHtml("Your Profile Needs Changes",
      `<p>Hi <strong>${escapeHtml(technicianName)}</strong>,</p>
      <p>We've reviewed your profile and it needs some changes before it can go live.</p>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="font-weight:600;margin:0 0 4px;">Feedback:</p>
        <p style="margin:0;">${escapeHtml(reason)}</p>
      </div>
      <p>Please update your profile and resubmit for review.</p>`),
  };
}
