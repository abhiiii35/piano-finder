export type TargetField =
  | "customerName"
  | "customerEmail"
  | "customerPhone"
  | "addressLine1"
  | "city"
  | "state"
  | "zipCode"
  | "pianoMake"
  | "pianoModel"
  | "pianoSerial"
  | "pianoYear"
  | "pianoType"
  | "notes"
  | "lastServiceDate";

export const TARGET_FIELDS: { key: TargetField; label: string; required?: boolean }[] = [
  { key: "customerName", label: "Customer name", required: true },
  { key: "customerEmail", label: "Email" },
  { key: "customerPhone", label: "Phone" },
  { key: "addressLine1", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zipCode", label: "Zip code" },
  { key: "pianoMake", label: "Piano make" },
  { key: "pianoModel", label: "Piano model" },
  { key: "pianoSerial", label: "Piano serial number" },
  { key: "pianoYear", label: "Piano year" },
  { key: "pianoType", label: "Piano type" },
  { key: "notes", label: "Notes" },
  { key: "lastServiceDate", label: "Last service date" },
];

/** Header (as it appears in the source file) -> target field, or null if unmapped. */
export type ColumnMapping = Record<string, TargetField | null>;

function normalize(header: string): string {
  return header.toLowerCase().replace(/[^a-z]/g, "");
}

// Candidate header spellings per target field, matched after normalize().
// Includes Gazelle's export wording (see GAZELLE_HEADERS) so the general
// guesser already recognizes it — GAZELLE_PRESET below exists to detect and
// label that case in the UI, not to run a second matching algorithm.
const CANDIDATES: Record<TargetField, string[]> = {
  customerName: ["customername", "name", "fullname", "clientname", "firstname", "lastname"],
  customerEmail: ["email", "emailaddress", "customeremail"],
  customerPhone: ["phone", "phonenumber", "telephone", "customerphone", "mobile", "cell"],
  addressLine1: ["address", "street", "streetaddress", "addressline", "addressline1"],
  city: ["city"],
  state: ["state", "province"],
  zipCode: ["zip", "zipcode", "postalcode", "postcode"],
  pianoMake: ["pianomake", "make", "brand"],
  pianoModel: ["pianomodel", "model"],
  pianoSerial: ["pianoserial", "serialnumber", "serial"],
  pianoYear: ["pianoyear", "year", "yearmanufactured"],
  pianoType: ["pianotype", "type"],
  notes: ["notes", "comments", "description"],
  lastServiceDate: ["lastservicedate", "lastservice", "lasttuned", "lasttuningdate"],
};

/** Best-guess column -> target field mapping from header names alone. Unrecognized headers map to null. */
export function autoGuessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const norm = normalize(header);
    let match: TargetField | null = null;
    for (const [field, candidates] of Object.entries(CANDIDATES) as [TargetField, string[]][]) {
      if (candidates.includes(norm)) {
        match = field;
        break;
      }
    }
    mapping[header] = match;
  }
  return mapping;
}

// Known Gazelle CRM export headers, used to detect "this looks like a Gazelle
// export" for the UI hint. The actual field guesses come from autoGuessMapping
// above (its candidate lists already cover these spellings) — this is just
// the reference list, not a separate mapping pass.
export const GAZELLE_HEADERS = [
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Address",
  "City",
  "State",
  "Zip",
  "Piano Make",
  "Piano Model",
  "Serial Number",
  "Last Service",
];

export const GAZELLE_PRESET: ColumnMapping = autoGuessMapping(GAZELLE_HEADERS);

/** Heuristic: at least half of GAZELLE_HEADERS' normalized names appear in the uploaded headers. */
export function looksLikeGazelleExport(headers: string[]): boolean {
  const normalizedHeaders = new Set(headers.map(normalize));
  const hits = GAZELLE_HEADERS.filter((h) => normalizedHeaders.has(normalize(h))).length;
  return hits >= Math.ceil(GAZELLE_HEADERS.length / 2);
}

/**
 * Builds a target-field-keyed row from a raw row + column mapping. When more
 * than one column maps to the same field (e.g. "First Name" + "Last Name"
 * both -> customerName), values are joined with a space in header order.
 */
export function extractRow(
  rawRow: Record<string, string>,
  mapping: ColumnMapping
): Partial<Record<TargetField, string>> {
  const out: Partial<Record<TargetField, string>> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (!field) continue;
    const value = (rawRow[header] ?? "").trim();
    if (!value) continue;
    out[field] = out[field] ? `${out[field]} ${value}` : value;
  }
  return out;
}
