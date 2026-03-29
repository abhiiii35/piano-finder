import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";
import path from "path";

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.join(__dirname, "..", "dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create a customer
  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      name: "Jane Doe",
      email: "customer@example.com",
      hashedPassword: await hash("password123", 12),
      role: "CUSTOMER",
      phone: "617-555-0100",
    },
  });

  // Create a technician user
  const techUser = await prisma.user.upsert({
    where: { email: "tech@example.com" },
    update: {},
    create: {
      name: "Mike Tuner",
      email: "tech@example.com",
      hashedPassword: await hash("password123", 12),
      role: "TECHNICIAN",
      phone: "617-555-0200",
    },
  });

  // Create technician profile
  const techProfile = await prisma.technicianProfile.upsert({
    where: { userId: techUser.id },
    update: {},
    create: {
      userId: techUser.id,
      bio: "RPT with 15 years of experience tuning and repairing all piano types.",
      businessName: "Mike's Piano Service",
      yearsExperience: 15,
      certifications: JSON.stringify(["RPT", "PTG Member"]),
      serviceRadius: 30,
      latitude: 42.3601,
      longitude: -71.0589,
      addressLine1: "123 Tremont St",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
      isVerified: true,
    },
  });

  // Create services
  const tuning = await prisma.service.create({
    data: {
      technicianId: techProfile.id,
      name: "Standard Tuning",
      description: "Full piano tuning to A440 concert pitch.",
      priceCents: 17500,
      durationMin: 90,
    },
  });

  await prisma.service.create({
    data: {
      technicianId: techProfile.id,
      name: "Pitch Raise",
      description: "For pianos significantly below pitch, includes follow-up tuning.",
      priceCents: 25000,
      durationMin: 120,
    },
  });

  await prisma.service.create({
    data: {
      technicianId: techProfile.id,
      name: "Minor Repair",
      description: "Fix sticking keys, broken strings, pedal issues, etc.",
      priceCents: 12500,
      durationMin: 60,
    },
  });

  // Create availability slots (Mon-Fri, 9am-5pm)
  for (let day = 1; day <= 5; day++) {
    await prisma.availabilitySlot.create({
      data: {
        technicianId: techProfile.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "17:00",
      },
    });
  }

  // Create a sample booking
  const booking = await prisma.booking.create({
    data: {
      customerId: customer.id,
      technicianId: techProfile.id,
      status: "COMPLETED",
      scheduledAt: new Date("2026-03-15T10:00:00Z"),
      durationMin: 90,
      addressLine1: "456 Commonwealth Ave",
      city: "Boston",
      state: "MA",
      zipCode: "02215",
      pianoType: "GRAND",
      pianoMake: "Steinway",
      pianoModel: "Model B",
      totalCents: 17500,
      notes: "Living room, second floor. Ring doorbell.",
      services: {
        create: {
          serviceId: tuning.id,
          priceCents: 17500,
        },
      },
      payment: {
        create: {
          amountCents: 17500,
          status: "SUCCEEDED",
          method: "CARD",
          stripePaymentId: "pi_test_123",
        },
      },
      review: {
        create: {
          authorId: customer.id,
          rating: 5,
          comment: "Excellent tuning! My Steinway sounds beautiful. Very professional.",
        },
      },
    },
  });

  console.log("Seeded:", { customer: customer.id, technician: techProfile.id, booking: booking.id });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
