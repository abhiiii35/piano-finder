import * as XLSX from "xlsx";

export type ParsedSheet = {
  headers: string[];
  rows: Record<string, string>[];
};

// Sentinel filename that tells the import action's parser the base64 payload
// is already {headers, rows} JSON (from importFromGoogle) rather than a file
// to parse. Lives outside actions/import.ts because a "use server" file may
// only export async functions — plain constants can't be re-exported there.
export const GOOGLE_ROWS_FILENAME = "__google-contacts__.json";

/**
 * Parses a CSV or Excel file buffer into headers + row objects keyed by the
 * original header string. xlsx.read auto-detects CSV vs. XLSX/XLS from the
 * buffer content, so both formats share this one code path (including
 * RFC 4180 quoted-comma handling for CSV).
 */
export function parseSpreadsheet(buffer: Buffer, _filename: string): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };

  const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  const [headerRow, ...dataRows] = grid;
  if (!headerRow) return { headers: [], rows: [] };

  const headers = headerRow.map((h) => String(h ?? "").trim());
  const rows = dataRows.map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = String(cells[i] ?? "").trim();
    });
    return row;
  });

  return { headers, rows };
}

type VcfContact = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
};

// Shared by parseVcf and the Google Contacts importer (src/actions/import.ts)
// — both produce rows keyed directly by target field name, so the mapping
// step's auto-guess is a trivial 1:1 match for either source.
export const CONTACT_HEADERS: (keyof VcfContact)[] = [
  "customerName",
  "customerEmail",
  "customerPhone",
  "addressLine1",
  "city",
  "state",
  "zipCode",
];

/** Unfolds vCard 3.0/4.0 line continuations (a leading space/tab means "same line as above"). */
function unfoldLines(text: string): string[] {
  const rawLines = text.split(/\r\n|\r|\n/);
  const unfolded: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }
  return unfolded;
}

/** Splits "GROUP.PROP;PARAM=VAL:value" into { name, value }, group/params stripped. */
function splitProperty(line: string): { name: string; value: string } | null {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return null;
  let head = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1);

  // Strip a leading "item1." style group prefix.
  const dotIndex = head.indexOf(".");
  if (dotIndex !== -1 && !head.slice(0, dotIndex).includes(";")) {
    head = head.slice(dotIndex + 1);
  }

  const name = head.split(";")[0].toUpperCase();
  return { name, value };
}

/**
 * Hand-parses vCard 3.0/4.0 text into contact rows (FN/N, first TEL, first
 * EMAIL, first ADR's street/city/state/zip). QUOTED-PRINTABLE values are left
 * as raw text rather than decoded — "ignored gracefully" per spec.
 */
export function parseVcf(text: string): ParsedSheet {
  const lines = unfoldLines(text);
  const rows: Record<string, string>[] = [];

  let current: VcfContact | null = null;
  let haveTel = false;
  let haveEmail = false;
  let haveAdr = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^BEGIN:VCARD$/i.test(line)) {
      current = {
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        addressLine1: "",
        city: "",
        state: "",
        zipCode: "",
      };
      haveTel = false;
      haveEmail = false;
      haveAdr = false;
      continue;
    }

    if (/^END:VCARD$/i.test(line)) {
      if (current && (current.customerName || current.customerEmail || current.customerPhone)) {
        rows.push({ ...current });
      }
      current = null;
      continue;
    }

    if (!current) continue;

    const prop = splitProperty(line);
    if (!prop) continue;

    switch (prop.name) {
      case "FN":
        current.customerName = prop.value.trim();
        break;
      case "N":
        if (!current.customerName) {
          // N = Family;Given;Additional;Prefix;Suffix
          const [family = "", given = ""] = prop.value.split(";");
          current.customerName = [given, family].filter(Boolean).join(" ").trim();
        }
        break;
      case "TEL":
        if (!haveTel) {
          current.customerPhone = prop.value.trim();
          haveTel = true;
        }
        break;
      case "EMAIL":
        if (!haveEmail) {
          current.customerEmail = prop.value.trim();
          haveEmail = true;
        }
        break;
      case "ADR":
        if (!haveAdr) {
          // ADR = PO Box;Extended;Street;City;Region;PostalCode;Country
          const parts = prop.value.split(";");
          current.addressLine1 = (parts[2] ?? "").trim();
          current.city = (parts[3] ?? "").trim();
          current.state = (parts[4] ?? "").trim();
          current.zipCode = (parts[5] ?? "").trim();
          haveAdr = true;
        }
        break;
      default:
        break;
    }
  }

  return { headers: CONTACT_HEADERS, rows };
}
