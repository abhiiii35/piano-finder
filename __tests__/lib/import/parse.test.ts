import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseSpreadsheet, parseVcf } from "@/lib/import/parse";

describe("parseSpreadsheet", () => {
  it("parses CSV with quoted commas inside fields", () => {
    const csv =
      'Name,Notes\n"Smith, John","Tunes yearly, prefers mornings"\nJane Doe,No notes\n';
    const buffer = Buffer.from(csv, "utf-8");

    const { headers, rows } = parseSpreadsheet(buffer, "clients.csv");

    expect(headers).toEqual(["Name", "Notes"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ Name: "Smith, John", Notes: "Tunes yearly, prefers mornings" });
    expect(rows[1]).toEqual({ Name: "Jane Doe", Notes: "No notes" });
  });

  it("round-trips a workbook built with xlsx.utils", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Name", "Email", "Piano Make"],
      ["Jane Doe", "jane@example.com", "Steinway"],
      ["Bob Lee", "bob@example.com", "Yamaha"],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Clients");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const { headers, rows } = parseSpreadsheet(buffer, "clients.xlsx");

    expect(headers).toEqual(["Name", "Email", "Piano Make"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ Name: "Jane Doe", Email: "jane@example.com", "Piano Make": "Steinway" });
    expect(rows[1]).toEqual({ Name: "Bob Lee", Email: "bob@example.com", "Piano Make": "Yamaha" });
  });

  it("returns empty headers/rows for an empty sheet", () => {
    const buffer = Buffer.from("", "utf-8");
    const { headers, rows } = parseSpreadsheet(buffer, "empty.csv");
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
  });
});

describe("parseVcf", () => {
  it("parses multiple contacts and unfolds continuation lines", () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Jane Doe",
      "TEL:617-555-0100",
      "EMAIL:jane@example.com",
      "ADR:;;123 Main St;Boston;MA;021",
      " 08;USA",
      "END:VCARD",
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Lee;Bob;;;",
      "TEL:617-555-0200",
      "END:VCARD",
    ].join("\r\n");

    const { headers, rows } = parseVcf(vcf);

    expect(headers).toContain("customerName");
    expect(rows).toHaveLength(2);

    expect(rows[0].customerName).toBe("Jane Doe");
    expect(rows[0].customerPhone).toBe("617-555-0100");
    expect(rows[0].customerEmail).toBe("jane@example.com");
    // Folded ADR continuation line ("...MA;021" + " 08;USA") must rejoin into one field.
    expect(rows[0].addressLine1).toBe("123 Main St");
    expect(rows[0].city).toBe("Boston");
    expect(rows[0].state).toBe("MA");
    expect(rows[0].zipCode).toBe("02108");

    // Second contact has no FN — falls back to N (Given + Family).
    expect(rows[1].customerName).toBe("Bob Lee");
    expect(rows[1].customerPhone).toBe("617-555-0200");
  });

  it("ignores QUOTED-PRINTABLE encoding params gracefully instead of crashing", () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:2.1",
      "FN;ENCODING=QUOTED-PRINTABLE:Jane=20Doe",
      "END:VCARD",
    ].join("\n");

    const { rows } = parseVcf(vcf);

    expect(rows).toHaveLength(1);
    // Raw value kept as-is (not decoded) — no crash is the bar here.
    expect(rows[0].customerName).toBe("Jane=20Doe");
  });

  it("drops a vCard with no usable name/contact info", () => {
    const vcf = ["BEGIN:VCARD", "VERSION:3.0", "NOTE:just a note", "END:VCARD"].join("\n");
    const { rows } = parseVcf(vcf);
    expect(rows).toHaveLength(0);
  });
});
