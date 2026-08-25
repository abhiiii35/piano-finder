import { buildEmailHtml } from "@/lib/email";

export function passwordResetEmail(resetUrl: string): {
  subject: string;
  html: string;
} {
  return {
    subject: "Reset your BookATuner password",
    html: buildEmailHtml(
      "Reset your password",
      `<p>Someone asked to reset the password for your BookATuner account. If this was you, click the button below. The link works for 1 hour.</p>
       <p style="text-align:center;margin:24px 0;">
         <a href="${resetUrl}" style="background:#1e293b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Choose a new password</a>
       </p>
       <p>If you didn't ask for this, you can ignore this email — your password won't change.</p>`
    ),
  };
}
