import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, fixtures } from "../../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn((heading: string, bodyHtml: string) => `<html>${heading}${bodyHtml}</html>`),
}));

import { sendEmail } from "@/lib/email";
import { POST, isDueForAppointmentReminder } from "@/app/api/cron/appointment-reminders/route";

const mockSendEmail = vi.mocked(sendEmail);

function req(secret?: string) {
  return new Request("http://localhost:3000/api/cron/appointment-reminders", {
    method: "POST",
    headers: secret ? { "x-cron-secret": secret } : {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

describe("isDueForAppointmentReminder", () => {
  const now = new Date(2026, 0, 1, 12, 0, 0); // Jan 1, 2026 noon
  const offsetHours = 24;

  it("includes a booking scheduled exactly at now+offset", () => {
    const windowEnd = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);
    expect(isDueForAppointmentReminder(windowEnd, now, offsetHours)).toBe(true);
  });

  it("excludes a booking scheduled exactly at the window's near edge (now+offset-1h)", () => {
    const windowStart = new Date(now.getTime() + (offsetHours - 1) * 60 * 60 * 1000);
    expect(isDueForAppointmentReminder(windowStart, now, offsetHours)).toBe(false);
  });

  it("includes a booking 1ms after the near edge", () => {
    const justAfterStart = new Date(now.getTime() + (offsetHours - 1) * 60 * 60 * 1000 + 1);
    expect(isDueForAppointmentReminder(justAfterStart, now, offsetHours)).toBe(true);
  });

  it("excludes a booking 1ms after the far edge", () => {
    const justAfterEnd = new Date(now.getTime() + offsetHours * 60 * 60 * 1000 + 1);
    expect(isDueForAppointmentReminder(justAfterEnd, now, offsetHours)).toBe(false);
  });

  it("claims a boundary booking exactly once across two consecutive hourly runs", () => {
    const boundary = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

    const caughtThisHour = isDueForAppointmentReminder(boundary, now, offsetHours);
    const caughtNextHour = isDueForAppointmentReminder(boundary, nextHour, offsetHours);

    expect(caughtThisHour).toBe(true);
    expect(caughtNextHour).toBe(false);
  });
});

describe("POST /api/cron/appointment-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects a missing/invalid cron secret", async () => {
    const res = await POST(req("wrong"));
    expect(res.status).toBe(401);
  });

  it("sends a reminder for a CONFIRMED booking inside the default 24h window", async () => {
    const now = new Date();
    const scheduledAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    prismaMock.booking.findMany.mockResolvedValue([
      {
        ...fixtures.booking,
        status: "CONFIRMED",
        scheduledAt,
        customer: { name: "Jane Doe", email: "jane@example.com" },
        technician: { ...fixtures.technicianProfile, user: { name: "Mike Tuner" } },
      },
    ] as never);
    prismaMock.messageTemplate.findMany.mockResolvedValue([]);
    mockSendEmail.mockResolvedValue(undefined);

    const res = await POST(req("test-secret"));
    const data = await res.json();

    expect(data.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "jane@example.com" }));
  });

  it("skips a CONFIRMED booking outside the window", async () => {
    const now = new Date();
    const scheduledAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days out
    prismaMock.booking.findMany.mockResolvedValue([
      {
        ...fixtures.booking,
        status: "CONFIRMED",
        scheduledAt,
        customer: { name: "Jane Doe", email: "jane@example.com" },
        technician: { ...fixtures.technicianProfile, user: { name: "Mike Tuner" } },
      },
    ] as never);
    prismaMock.messageTemplate.findMany.mockResolvedValue([]);

    const res = await POST(req("test-secret"));
    const data = await res.json();

    expect(data.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("uses a technician's custom sendOffsetHours instead of the 24h default", async () => {
    const now = new Date();
    const scheduledAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48h out
    prismaMock.booking.findMany.mockResolvedValue([
      {
        ...fixtures.booking,
        status: "CONFIRMED",
        scheduledAt,
        customer: { name: "Jane Doe", email: "jane@example.com" },
        technician: { ...fixtures.technicianProfile, user: { name: "Mike Tuner" } },
      },
    ] as never);
    prismaMock.messageTemplate.findMany.mockResolvedValue([
      { ...fixtures.messageTemplate, type: "APPT_REMINDER", sendOffsetHours: 48 },
    ]);
    mockSendEmail.mockResolvedValue(undefined);

    const res = await POST(req("test-secret"));
    const data = await res.json();

    expect(data.sent).toBe(1);
  });
});
