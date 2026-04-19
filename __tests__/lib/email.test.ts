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

  it("catches and logs errors when Resend throws", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const { Resend } = await import("resend");
    // Mock Resend to throw
    vi.spyOn(Resend.prototype, "constructor" as never);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // We need to re-import to pick up the API key. Since the module is already
    // cached, we mock resend at the module level instead.
    const mockSend = vi.fn().mockRejectedValue(new Error("API error"));
    vi.doMock("resend", () => ({
      Resend: class {
        emails = { send: mockSend };
      },
    }));

    // Clear cached module so sendEmail re-evaluates
    vi.resetModules();
    const { sendEmail: freshSendEmail } = await import("@/lib/email");

    await freshSendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[EMAIL] Failed to send:",
      expect.any(Error)
    );
    errorSpy.mockRestore();
    delete process.env.RESEND_API_KEY;
  });
});
