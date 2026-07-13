/**
 * Backfills Booking.latitude/longitude for rows created before travel
 * feasibility existed, using the free Nominatim geocoding path.
 *
 * Run via: npx tsx prisma/backfill-booking-coords.ts
 * Target a different SQLite file with: DATABASE_FILE=/path/to.db
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { geocode } from "../src/lib/geocoding";
import path from "path";

const dbFile =
  process.env.DATABASE_FILE ?? path.join(__dirname, "..", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbFile}` });
const prisma = new PrismaClient({ adapter });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const bookings = await prisma.booking.findMany({
    where: { latitude: null },
    select: {
      id: true,
      addressLine1: true,
      city: true,
      state: true,
      zipCode: true,
    },
  });

  console.log(`${bookings.length} booking(s) missing coordinates in ${dbFile}`);

  let updated = 0;
  let failed = 0;
  for (const b of bookings) {
    const geo =
      (await geocode(`${b.addressLine1}, ${b.city}, ${b.state} ${b.zipCode}`)) ??
      (await geocode(`${b.city}, ${b.state} ${b.zipCode}`));

    if (geo) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { latitude: geo.lat, longitude: geo.lng },
      });
      updated++;
      console.log(`  ${b.id}: ${geo.lat}, ${geo.lng}`);
    } else {
      failed++;
      console.log(`  ${b.id}: could not geocode "${b.city}, ${b.state}"`);
    }

    // Nominatim usage policy: max 1 request/second
    await sleep(1100);
  }

  console.log(`Done. Updated ${updated}, failed ${failed}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
