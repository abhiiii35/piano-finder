import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prismaMock, mockTechnicianSession, fixtures } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { previewImport, runImport, importFromGoogle } from "@/actions/import";
import { GOOGLE_ROWS_FILENAME } from "@/lib/import/parse";
import type { ColumnMapping } from "@/lib/import/mapping";

const mockGetSession = vi.mocked(getServerSession);

function setupTechSession() {
  mockGetSession.mockResolvedValue(mockTechnicianSession());
  prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
}

function rowsFile(headers: string[], rows: Record<string, string>[]) {
  const base64 = Buffer.from(JSON.stringify({ headers, rows }), "utf-8").toString("base64");
  return { fileBase64: base64, filename: GOOGLE_ROWS_FILENAME };
}

const CONTACT_MAPPING: ColumnMapping = {
  customerName: "customerName",
  customerEmail: "customerEmail",
  customerPhone: "customerPhone",
  addressLine1: "addressLine1",
  city: "city",
  state: "state",
  zipCode: "zipCode",
  pianoSerial: "pianoSerial",
  pianoMake: "pianoMake",
};

describe("previewImport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts new rows as create when nothing matches an existing record", async () => {
    setupTechSession();
    prismaMock.customerRecord.findMany.mockResolvedValue([]);

    const { fileBase64, filename } = rowsFile(
      ["customerName", "customerEmail"],
      [{ customerName: "Jane Doe", customerEmail: "jane@example.com" }]
    );

    const result = await previewImport(fileBase64, filename, {
      customerName: "customerName",
      customerEmail: "customerEmail",
    });

    expect(result.counts.create).toBe(1);
    expect(result.counts.mergeDuplicate).toBe(0);
    expect(result.counts.invalid).toEqual([]);
  });

  it("flags an existing (technicianId, customerEmail) match as a merge, not a create", async () => {
    setupTechSession();
    prismaMock.customerRecord.findMany.mockResolvedValue([
      { id: "record-1", customerName: "Jane Doe", customerEmail: "jane@example.com", customerPhone: null },
    ]);

    const { fileBase64, filename } = rowsFile(
      ["customerName", "customerEmail"],
      [{ customerName: "Jane D.", customerEmail: "jane@example.com" }]
    );

    const result = await previewImport(fileBase64, filename, {
      customerName: "customerName",
      customerEmail: "customerEmail",
    });

    expect(result.counts.create).toBe(0);
    expect(result.counts.mergeDuplicate).toBe(1);
    expect(result.preview[0].matchedRecordId).toBe("record-1");
  });

  it("flags an exact name+phone match (no email) as a merge", async () => {
    setupTechSession();
    prismaMock.customerRecord.findMany.mockResolvedValue([
      { id: "record-2", customerName: "Bob Lee", customerEmail: null, customerPhone: "617-555-0200" },
    ]);

    const { fileBase64, filename } = rowsFile(
      ["customerName", "customerPhone"],
      [{ customerName: "Bob Lee", customerPhone: "617-555-0200" }]
    );

    const result = await previewImport(fileBase64, filename, {
      customerName: "customerName",
      customerPhone: "customerPhone",
    });

    expect(result.counts.mergeDuplicate).toBe(1);
  });

  it("reports rows missing a required field as invalid, with row number and reason", async () => {
    setupTechSession();
    prismaMock.customerRecord.findMany.mockResolvedValue([]);

    const { fileBase64, filename } = rowsFile(
      ["customerName", "customerEmail"],
      [
        { customerName: "Jane Doe", customerEmail: "jane@example.com" },
        { customerName: "", customerEmail: "no-name@example.com" },
      ]
    );

    const result = await previewImport(fileBase64, filename, {
      customerName: "customerName",
      customerEmail: "customerEmail",
    });

    expect(result.counts.create).toBe(1);
    expect(result.counts.invalid).toHaveLength(1);
    expect(result.counts.invalid[0].row).toBe(2);
    expect(result.counts.invalid[0].reason).toMatch(/name/i);
  });

  it("caps rows at 2000 per import", async () => {
    setupTechSession();
    prismaMock.customerRecord.findMany.mockResolvedValue([]);

    const rows = Array.from({ length: 2001 }, (_, i) => ({
      customerName: `Customer ${i}`,
    }));
    const { fileBase64, filename } = rowsFile(["customerName"], rows);

    const result = await previewImport(fileBase64, filename, { customerName: "customerName" });

    expect(result.totalRows).toBe(2000);
    expect(result.capped).toBe(true);
  });
});

describe("runImport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a customer, service location, and piano for a new row", async () => {
    setupTechSession();
    prismaMock.customerRecord.findMany.mockResolvedValue([]);
    prismaMock.customerRecord.create.mockResolvedValue({ id: "new-record-1" });
    prismaMock.serviceLocation.create.mockResolvedValue({ id: "loc-1" });
    prismaMock.piano.create.mockResolvedValue({ id: "piano-1" });

    const { fileBase64, filename } = rowsFile(
      ["customerName", "customerEmail", "addressLine1", "pianoMake", "pianoSerial"],
      [
        {
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          addressLine1: "123 Main St",
          pianoMake: "Steinway",
          pianoSerial: "SN1",
        },
      ]
    );

    const result = await runImport(fileBase64, filename, CONTACT_MAPPING);

    expect(result.created).toBe(1);
    expect(result.merged).toBe(0);
    expect(result.failed).toEqual([]);
    expect(prismaMock.customerRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          technicianId: "tech-profile-1",
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
        }),
      })
    );
    expect(prismaMock.serviceLocation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerRecordId: "new-record-1", isPrimary: true }),
      })
    );
    expect(prismaMock.piano.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerRecordId: "new-record-1",
          serviceLocationId: "loc-1",
          serialNumber: "SN1",
        }),
      })
    );
  });

  it("merges into an existing record: fills a blank phone and adds a piano with a new serial", async () => {
    setupTechSession();
    prismaMock.customerRecord.findMany.mockResolvedValue([
      {
        id: "record-1",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerPhone: null,
        notes: null,
        pianos: [{ serialNumber: "OLD-SERIAL" }],
      },
    ]);
    prismaMock.customerRecord.update.mockResolvedValue({});
    prismaMock.piano.create.mockResolvedValue({ id: "piano-2" });

    const { fileBase64, filename } = rowsFile(
      ["customerName", "customerEmail", "customerPhone", "pianoSerial"],
      [
        {
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          customerPhone: "617-555-0100",
          pianoSerial: "NEW-SERIAL",
        },
      ]
    );

    const result = await runImport(fileBase64, filename, CONTACT_MAPPING);

    expect(result.merged).toBe(1);
    expect(result.created).toBe(0);
    expect(prismaMock.customerRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "record-1" },
        data: expect.objectContaining({ customerPhone: "617-555-0100" }),
      })
    );
    expect(prismaMock.piano.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerRecordId: "record-1", serialNumber: "NEW-SERIAL" }),
      })
    );
  });

  it("does not add a duplicate piano when the serial is already on file", async () => {
    setupTechSession();
    prismaMock.customerRecord.findMany.mockResolvedValue([
      {
        id: "record-1",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerPhone: "617-555-0100",
        notes: null,
        pianos: [{ serialNumber: "SN1" }],
      },
    ]);
    prismaMock.customerRecord.update.mockResolvedValue({});

    const { fileBase64, filename } = rowsFile(
      ["customerName", "customerEmail", "pianoSerial"],
      [{ customerName: "Jane Doe", customerEmail: "jane@example.com", pianoSerial: "SN1" }]
    );

    const result = await runImport(fileBase64, filename, CONTACT_MAPPING);

    expect(result.merged).toBe(1);
    expect(prismaMock.piano.create).not.toHaveBeenCalled();
  });

  it("continues past a per-row failure and reports it", async () => {
    setupTechSession();
    prismaMock.customerRecord.findMany.mockResolvedValue([]);
    prismaMock.customerRecord.create
      .mockRejectedValueOnce(new Error("Unique constraint failed"))
      .mockResolvedValueOnce({ id: "record-2" });

    const { fileBase64, filename } = rowsFile(
      ["customerName", "customerEmail"],
      [
        { customerName: "Bad Row", customerEmail: "dup@example.com" },
        { customerName: "Good Row", customerEmail: "good@example.com" },
      ]
    );

    const result = await runImport(fileBase64, filename, {
      customerName: "customerName",
      customerEmail: "customerEmail",
    });

    expect(result.created).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toEqual({ row: 1, reason: "Unique constraint failed" });
  });
});

describe("importFromGoogle", () => {
  const originalFetch = global.fetch;

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns a reconnect error on a 403 from the People API", async () => {
    setupTechSession();
    prismaMock.account.findFirst.mockResolvedValue({ access_token: "expired-token" });
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch;

    const result = await importFromGoogle();

    expect(result).toEqual({
      ok: false,
      reconnect: true,
      message: "Reconnect Google to allow contact access.",
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns a reconnect error when there's no linked Google account", async () => {
    setupTechSession();
    prismaMock.account.findFirst.mockResolvedValue(null);

    const result = await importFromGoogle();

    expect(result).toEqual({
      ok: false,
      reconnect: true,
      message: "Reconnect Google to allow contact access.",
    });
  });

  it("maps People API connections into contact rows", async () => {
    setupTechSession();
    prismaMock.account.findFirst.mockResolvedValue({ access_token: "good-token" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        connections: [
          {
            names: [{ displayName: "Jane Doe" }],
            emailAddresses: [{ value: "jane@example.com" }],
            phoneNumbers: [{ value: "617-555-0100" }],
            addresses: [{ streetAddress: "123 Main St", city: "Boston", region: "MA", postalCode: "02108" }],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await importFromGoogle();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toEqual([
        {
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          customerPhone: "617-555-0100",
          addressLine1: "123 Main St",
          city: "Boston",
          state: "MA",
          zipCode: "02108",
        },
      ]);
    }
  });
});
