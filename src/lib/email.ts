import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<void> {
  const client = getResend();

  if (!client) {
    console.log("[EMAIL] Dev mode — no RESEND_API_KEY set.", {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  try {
    await client.emails.send({
      from: "PianoTune <notifications@pianotune.com>",
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
  } catch (error) {
    console.error("[EMAIL] Failed to send:", error);
  }
}

export function buildEmailHtml(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:20px;font-weight:700;color:#1e293b;">PianoTune</span>
      </div>
      <h1 style="font-size:20px;font-weight:600;color:#1e293b;margin:0 0 16px;">${heading}</h1>
      <div style="font-size:14px;line-height:1.6;color:#475569;">
        ${bodyHtml}
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;font-size:12px;color:#94a3b8;">
      &copy; ${new Date().getFullYear()} PianoTune. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}
