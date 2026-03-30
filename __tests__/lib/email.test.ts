import { describe, it, expect, vi } from "vitest";
import { buildEmailHtml, sendEmail } from "@/lib/email";

describe("buildEmailHtml", () => {
  it("includes heading and body content", () => {
    const html = buildEmailHtml("Test Heading", "<p>Test body</p>");
    expect(html).toContain("Test Heading");
    expect(html).toContain("<p>Test body</p>");
  });

  it("includes PianoTune branding", () => {
    const html = buildEmailHtml("Hi", "<p>Content</p>");
    expect(html).toContain("PianoTune");
  });

  it("includes footer", () => {
    const html = buildEmailHtml("Hi", "<p>Content</p>");
    expect(html).toContain("All rights reserved");
  });
});

describe("sendEmail", () => {
  it("logs to console when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("[EMAIL]"),
      expect.objectContaining({ to: "test@example.com", subject: "Test" })
    );
    spy.mockRestore();
  });
});
