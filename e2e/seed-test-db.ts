/**
 * Seeds a test database for Playwright e2e tests.
 * Run via: npx tsx e2e/seed-test-db.ts
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(__dirname, "..", "test.db");

// Remove old test db
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

// Run migrations against test db
execSync("npx prisma migrate deploy", {
  cwd: path.join(__dirname, ".."),
  env: { ...process.env, DATABASE_URL: `file:${DB_PATH}` },
  stdio: "pipe",
});

const adapter = new PrismaBetterSqlite3({ url: `file:${DB_PATH}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await hash("password123", 12);

  // Customer
  await prisma.user.create({
    data: {
      id: "test-customer",
      name: "Test Customer",
      email: "customer@test.com",
      hashedPassword: password,
      role: "CUSTOMER",
    },
  });

  // Technician user
  const techUser = await prisma.user.create({
    data: {
      id: "test-tech-user",
      name: "Test Technician",
      email: "tech@test.com",
      hashedPassword: password,
      role: "TECHNICIAN",
      phone: "617-555-0200",
    },
  });

  // Technician profile
  const profile = await prisma.technicianProfile.create({
    data: {
      id: "test-tech-profile",
      userId: techUser.id,
      bio: "15 years of piano tuning experience in the Boston area.",
      businessName: "Test Piano Service",
      yearsExperience: 15,
      certifications: JSON.stringify(["RPT", "PTG Member"]),
      serviceRadius: 30,
      city: "Boston",
      state: "MA",
      zipCode: "02108",
      isVerified: true,
      isActive: true,
    },
  });

  // Services
  await prisma.service.create({
    data: {
      id: "test-service-tuning",
      technicianId: profile.id,
      name: "Standard Tuning",
      description: "Full piano tuning to A440 concert pitch",
      priceCents: 17500,
      durationMin: 90,
    },
  });

  await prisma.service.create({
    data: {
      id: "test-service-repair",
      technicianId: profile.id,
      name: "Repair",
      description: "Fix sticking keys, broken strings, pedal issues",
      priceCents: 12500,
      durationMin: 60,
    },
  });

  // Availability: Mon-Fri 9-5
  for (let day = 1; day <= 5; day++) {
    await prisma.availabilitySlot.create({
      data: {
        technicianId: profile.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "17:00",
      },
    });
  }

  // A completed booking with review (for the customer)
  await prisma.booking.create({
    data: {
      id: "test-booking-completed",
      customerId: "test-customer",
      technicianId: profile.id,
      status: "COMPLETED",
      scheduledAt: new Date("2026-03-15T10:00:00"),
      durationMin: 90,
      addressLine1: "123 Test St",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
      totalCents: 17500,
      pianoType: "GRAND",
      services: {
        create: {
          serviceId: "test-service-tuning",
          priceCents: 17500,
        },
      },
      payment: {
        create: {
          amountCents: 17500,
          status: "SUCCEEDED",
          method: "CARD",
        },
      },
      review: {
        create: {
          authorId: "test-customer",
          rating: 5,
          comment: "Excellent tuning!",
        },
      },
    },
  });

  // A job posting
  await prisma.job.create({
    data: {
      id: "test-job",
      customerId: "test-customer",
      title: "Annual piano tuning needed",
      serviceType: "Tuning",
      description: "Need my Steinway Model B tuned. Last tuned about 14 months ago.",
      budgetCents: 20000,
      city: "Boston",
      state: "MA",
      status: "OPEN",
    },
  });

  console.log("Test database seeded successfully.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
