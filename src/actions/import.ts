"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseSpreadsheet,
  parseVcf,
  CONTACT_HEADERS,
  GOOGLE_ROWS_FILENAME,
  type ParsedSheet,
} from "@/lib/import/parse";
import { extractRow, type ColumnMapping, type TargetField } from "@/lib/import/mapping";

const MAX_IMPORT_ROWS = 2000;

async function getTechnicianProfile() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    throw new Error("Unauthorized");
  }
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) throw new Error("Profile not found");
  return profile;
}

function parseInput(fileBase64: string, filename: string): ParsedSheet {
  const buffer = Buffer.from(fileBase64, "base64");
  if (filename === GOOGLE_ROWS_FILENAME) {
    return JSON.parse(buffer.toString("utf-8")) as ParsedSheet;
  }
  if (filename.toLowerCase().endsWith(".vcf")) {
    return parseVcf(buffer.toString("utf-8"));
  }
  return parseSpreadsheet(buffer, filename);
}

const importRowSchema = z.object({
  // .optional().default("") so a wholly-missing column (not just an empty
  // cell) still produces the friendly "required" message below, instead of
  // zod's generic "expected string, received undefined" type error.
  customerName: z
    .string()
    .optional()
    .default("")
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "Customer name is required"),
  customerEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  customerPhone: z.string().trim().optional(),
  addressLine1: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  pianoMake: z.string().trim().optional(),
  pianoModel: z.string().trim().optional(),
  pianoSerial: z.string().trim().optional(),
  pianoYear: z.string().trim().optional(),
  pianoType: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  lastServiceDate: z.string().trim().optional(),
});

type ImportRowData = z.infer<typeof importRowSchema>;

type ExistingRecord = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
};

export type EvalRow = {
  row: number; // 1-based position in the (capped) row set
  data: Partial<Record<TargetField, string>>;
  action: "create" | "merge" | "invalid";
  reason?: string;
  matchedRecordId?: string;
};

// ponytail: duplicate detection only looks at records already in the DB, not
// at other rows in the same upload. Two rows sharing a new email in one file
// will both preview as "create"; the second fails at run time on the
// (technicianId, customerEmail) unique constraint and lands in `failed` with
// that reason — the per-row try/catch this spec already requires. Upgrade:
// track newly-created emails/name+phone within the run loop if that's ever
// reported as confusing.
function evaluateRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existing: ExistingRecord[]
): EvalRow[] {
  const byEmail = new Map<string, ExistingRecord>();
  for (const record of existing) {
    if (record.customerEmail) byEmail.set(record.customerEmail.toLowerCase(), record);
  }

  function findDuplicate(data: ImportRowData): ExistingRecord | null {
    if (data.customerEmail) {
      const hit = byEmail.get(data.customerEmail.toLowerCase());
      if (hit) return hit;
    }
    if (data.customerPhone) {
      const nameNorm = data.customerName.trim().toLowerCase();
      return (
        existing.find(
          (record) =>
            record.customerPhone === data.customerPhone &&
            record.customerName.trim().toLowerCase() === nameNorm
        ) ?? null
      );
    }
    return null;
  }

  return rows.map((rawRow, i) => {
    const row = i + 1;
    const data = extractRow(rawRow, mapping);
    const parsed = importRowSchema.safeParse(data);

    if (!parsed.success) {
      return { row, data, action: "invalid", reason: parsed.error.issues[0].message };
    }

    const dup = findDuplicate(parsed.data);
    if (dup) {
      return { row, data: parsed.data, action: "merge", matchedRecordId: dup.id };
    }
    return { row, data: parsed.data, action: "create" };
  });
}

function summarize(evaluated: EvalRow[]) {
  return {
    create: evaluated.filter((r) => r.action === "create").length,
    mergeDuplicate: evaluated.filter((r) => r.action === "merge").length,
    invalid: evaluated
      .filter((r) => r.action === "invalid")
      .map((r) => ({ row: r.row, reason: r.reason ?? "Invalid row" })),
  };
}

// Header discovery for the mapping step — a mapping can't be built until the
// UI knows the source's column names, and parsing (xlsx/vCard) only runs
// server-side. previewImport() also returns headers, but only alongside a
// real (mapping-dependent) validation pass; this is the cheap standalone version.
export async function parseImportFile(fileBase64: string, filename: string) {
  await getTechnicianProfile();
  const parsed = parseInput(fileBase64, filename);
  return {
    headers: parsed.headers,
    totalRows: Math.min(parsed.rows.length, MAX_IMPORT_ROWS),
    capped: parsed.rows.length > MAX_IMPORT_ROWS,
  };
}

export async function previewImport(
  fileBase64: string,
  filename: string,
  mapping: ColumnMapping
) {
  const profile = await getTechnicianProfile();
  const parsed = parseInput(fileBase64, filename);
  const capped = parsed.rows.length > MAX_IMPORT_ROWS;
  const rows = parsed.rows.slice(0, MAX_IMPORT_ROWS);

  const existing = await prisma.customerRecord.findMany({
    where: { technicianId: profile.id },
    select: { id: true, customerName: true, customerEmail: true, customerPhone: true },
  });

  const evaluated = evaluateRows(rows, mapping, existing);

  return {
    headers: parsed.headers,
    preview: evaluated.slice(0, 20),
    counts: summarize(evaluated),
    totalRows: rows.length,
    capped,
  };
}

export async function runImport(fileBase64: string, filename: string, mapping: ColumnMapping) {
  const profile = await getTechnicianProfile();
  const parsed = parseInput(fileBase64, filename);
  const capped = parsed.rows.length > MAX_IMPORT_ROWS;
  const rows = parsed.rows.slice(0, MAX_IMPORT_ROWS);

  const existing = await prisma.customerRecord.findMany({
    where: { technicianId: profile.id },
    include: { pianos: { select: { serialNumber: true } } },
  });

  const evaluated = evaluateRows(rows, mapping, existing);
  const existingById = new Map(existing.map((r) => [r.id, r]));

  let created = 0;
  let merged = 0;
  const failed: { row: number; reason: string }[] = [];

  for (const item of evaluated) {
    if (item.action === "invalid") {
      failed.push({ row: item.row, reason: item.reason ?? "Invalid row" });
      continue;
    }

    const data = item.data as ImportRowData;
    const notes =
      [data.notes, data.lastServiceDate ? `Last service: ${data.lastServiceDate}` : null]
        .filter(Boolean)
        .join(" | ") || null;
    const pianoYear = data.pianoYear ? parseInt(data.pianoYear, 10) : NaN;
    const hasPianoFields = Boolean(
      data.pianoMake || data.pianoModel || data.pianoSerial || data.pianoType || data.pianoYear
    );

    try {
      if (item.action === "merge") {
        const target = item.matchedRecordId ? existingById.get(item.matchedRecordId) : undefined;
        if (!target) throw new Error("Matched record not found");

        await prisma.customerRecord.update({
          where: { id: target.id },
          data: {
            customerEmail: target.customerEmail ?? (data.customerEmail || undefined),
            customerPhone: target.customerPhone ?? (data.customerPhone || undefined),
            notes: target.notes ?? (notes || undefined),
          },
        });

        const alreadyHasSerial =
          data.pianoSerial && target.pianos.some((p) => p.serialNumber === data.pianoSerial);
        if (data.pianoSerial && !alreadyHasSerial) {
          await prisma.piano.create({
            data: {
              customerRecordId: target.id,
              type: data.pianoType || null,
              make: data.pianoMake || null,
              model: data.pianoModel || null,
              serialNumber: data.pianoSerial || null,
              year: Number.isFinite(pianoYear) ? pianoYear : null,
            },
          });
        }
        merged++;
      } else {
        const record = await prisma.customerRecord.create({
          data: {
            technicianId: profile.id,
            customerName: data.customerName,
            customerEmail: data.customerEmail || null,
            customerPhone: data.customerPhone || null,
            notes,
          },
        });

        let serviceLocationId: string | null = null;
        if (data.addressLine1 || data.city || data.state || data.zipCode) {
          const location = await prisma.serviceLocation.create({
            data: {
              customerRecordId: record.id,
              label: "Home",
              addressLine1: data.addressLine1 || null,
              city: data.city || null,
              state: data.state || null,
              zipCode: data.zipCode || null,
              isPrimary: true,
            },
          });
          serviceLocationId = location.id;
        }

        if (hasPianoFields) {
          await prisma.piano.create({
            data: {
              customerRecordId: record.id,
              serviceLocationId,
              type: data.pianoType || null,
              make: data.pianoMake || null,
              model: data.pianoModel || null,
              serialNumber: data.pianoSerial || null,
              year: Number.isFinite(pianoYear) ? pianoYear : null,
            },
          });
        }
        created++;
      }
    } catch (err) {
      failed.push({
        row: item.row,
        reason: err instanceof Error ? err.message : "Import failed",
      });
    }
  }

  revalidatePath("/dashboard/technician/customers");
  return { created, merged, failed, capped };
}

// ─── Google Contacts ─────────────────────────────────────────

const GOOGLE_PEOPLE_URL = "https://people.googleapis.com/v1/people/me/connections";
const MAX_GOOGLE_CONTACTS = 1000;

type GooglePerson = {
  names?: { displayName?: string }[];
  emailAddresses?: { value?: string }[];
  phoneNumbers?: { value?: string }[];
  addresses?: { streetAddress?: string; city?: string; region?: string; postalCode?: string }[];
};

type GoogleImportResult =
  | { ok: true; headers: string[]; rows: Record<string, string>[] }
  | { ok: false; reconnect: boolean; message: string };

const RECONNECT_MESSAGE = "Reconnect Google to allow contact access.";

export async function importFromGoogle(): Promise<GoogleImportResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    throw new Error("Unauthorized");
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
    select: { access_token: true },
  });

  if (!account?.access_token) {
    return { ok: false, reconnect: true, message: RECONNECT_MESSAGE };
  }

  const rows: Record<string, string>[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(GOOGLE_PEOPLE_URL);
    url.searchParams.set("personFields", "names,emailAddresses,phoneNumbers,addresses");
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${account.access_token}` },
      });
    } catch {
      return { ok: false, reconnect: false, message: "Could not reach Google Contacts. Try again in a moment." };
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, reconnect: true, message: RECONNECT_MESSAGE };
    }
    if (!res.ok) {
      return { ok: false, reconnect: false, message: `Google Contacts request failed (${res.status})` };
    }

    const data: { connections?: GooglePerson[]; nextPageToken?: string } = await res.json();
    for (const person of data.connections ?? []) {
      const addr = person.addresses?.[0];
      rows.push({
        customerName: person.names?.[0]?.displayName?.trim() ?? "",
        customerEmail: person.emailAddresses?.[0]?.value?.trim() ?? "",
        customerPhone: person.phoneNumbers?.[0]?.value?.trim() ?? "",
        addressLine1: addr?.streetAddress?.trim() ?? "",
        city: addr?.city?.trim() ?? "",
        state: addr?.region?.trim() ?? "",
        zipCode: addr?.postalCode?.trim() ?? "",
      });
      if (rows.length >= MAX_GOOGLE_CONTACTS) break;
    }

    pageToken = rows.length < MAX_GOOGLE_CONTACTS ? data.nextPageToken : undefined;
  } while (pageToken);

  return { ok: true, headers: [...CONTACT_HEADERS], rows };
}
