import { buildEmailHtml } from "@/lib/email";

export function verificationEmail(verifyUrl: string) {
  const html = buildEmailHtml(
    "Verify Your Email",
    `<p>Welcome to PianoTune! Please verify your email address.</p>
    <p style="margin: 24px 0;">
      <a href="${verifyUrl}" style="background-color: #0f1729; color: #f5f0e8; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify Email Address</a>
    </p>
    <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>`
  );
  return { subject: "Verify your email — PianoTune", html };
}
