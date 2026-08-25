/**
 * Backfills a Piano row from each CustomerRecord's legacy single-piano
 * fields (pianoMake/pianoModel/serialNumber/pianoLocation), which are
 * superseded by the Piano model. Idempotent: skips any record that already
 * has at least one Piano row.
 *
 * Run via: npm run backfill:pianos
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

type LegacyRecord = {
  id: string;
  pianoMake: string | null;
  pianoModel: string | null;
  serialNumber: string | null;
  pianoLocation: string | null;
};

export function hasLegacyPianoData(record: LegacyRecord): boolean {
  return Boolean(
    record.pianoMake || record.pianoModel || record.serialNumber || record.pianoLocation
  );
}

export function legacyPianoData(record: LegacyRecord) {
  return {
    customerRecordId: record.id,
    make: record.pianoMake,
    model: record.pianoModel,
    serialNumber: record.serialNumber,
    roomLocation: record.pianoLocation,
  };
}

// A record needs backfilling when it has legacy piano data AND no Piano row
// yet — re-running the script is a no-op for records already backfilled.
export function selectRecordsToBackfill<T extends LegacyRecord & { pianos: unknown[] }>(
  records: T[]
): T[] {
  return records.filter((record) => hasLegacyPianoData(record) && record.pianos.length === 0);
}

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: `file:${path.join(__dirname, "..", "dev.db")}`,
  });
  const prisma = new PrismaClient({ adapter });

  const records = await prisma.customerRecord.findMany({
    include: { pianos: { select: { id: true }, take: 1 } },
  });

  const toBackfill = selectRecordsToBackfill(records);

  for (const record of toBackfill) {
    await prisma.piano.create({ data: legacyPianoData(record) });
  }

  console.log(`Backfilled ${toBackfill.length} piano record(s).`);
  await prisma.$disconnect();
}

const isDirectRun = Boolean(process.argv[1]?.endsWith("backfill-pianos.ts"));
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
