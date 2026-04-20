/**
 * Seeds the production database with realistic demo data.
 * Run via: npx tsx prisma/seed-production.ts
 *
 * Creates:
 * - 2 customer accounts
 * - 1 admin account
 * - 5 technicians across different cities with full profiles
 * - Services, availability, bookings, reviews, messages
 *
 * All demo accounts use password: "demo1234"
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";
import path from "path";

// Use Turso if available, otherwise local SQLite
function createAdapter() {
  if (process.env.TURSO_DATABASE_URL) {
    return new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return new PrismaBetterSqlite3({
    url: `file:${path.join(__dirname, "..", "dev.db")}`,
  });
}

const prisma = new PrismaClient({ adapter: createAdapter() });

const DEMO_PASSWORD = "demo1234";

async function main() {
  const pw = await hash(DEMO_PASSWORD, 12);
  const now = new Date();

  console.log("Seeding production database...");

  // ─── Customers ─────────────────────────────────────────
  const sarah = await prisma.user.upsert({
    where: { email: "sarah.mitchell@demo.com" },
    update: {},
    create: {
      name: "Sarah Mitchell",
      email: "sarah.mitchell@demo.com",
      hashedPassword: pw,
      role: "CUSTOMER",
      phone: "617-555-1001",
      emailVerified: now,
    },
  });

  const david = await prisma.user.upsert({
    where: { email: "david.chen@demo.com" },
    update: {},
    create: {
      name: "David Chen",
      email: "david.chen@demo.com",
      hashedPassword: pw,
      role: "CUSTOMER",
      phone: "312-555-2002",
      emailVerified: now,
    },
  });

  // ─── Admin ─────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "admin@bookatuner.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@bookatuner.com",
      hashedPassword: pw,
      role: "ADMIN",
      emailVerified: now,
    },
  });

  console.log("  Created customers and admin");

  // ─── Technicians ───────────────────────────────────────

  const technicians = [
    {
      user: {
        name: "James Rothwell",
        email: "james.rothwell@demo.com",
        phone: "617-555-3001",
      },
      profile: {
        businessName: "Rothwell Piano Care",
        bio: "Third-generation piano technician with 22 years of experience. Specializing in concert preparation, restoration, and voicing for Steinway, Bösendorfer, and Yamaha instruments. Trusted by the Boston Symphony Orchestra and New England Conservatory.",
        yearsExperience: 22,
        certifications: JSON.stringify(["RPT", "PTG Master Technician", "Steinway Certified"]),
        serviceRadius: 35,
        latitude: 42.3601,
        longitude: -71.0589,
        addressLine1: "147 Tremont St",
        city: "Boston",
        state: "MA",
        zipCode: "02111",
        ptgMember: true,
      },
      services: [
        { name: "Concert Tuning", description: "Precision tuning to A440 with temperament adjustments for performance settings.", priceCents: 22500, durationMin: 120 },
        { name: "Standard Tuning", description: "Full piano tuning for home instruments.", priceCents: 17500, durationMin: 90 },
        { name: "Voicing", description: "Hammer reshaping and needle work to adjust tone quality.", priceCents: 30000, durationMin: 150 },
        { name: "Regulation", description: "Complete action regulation for optimal touch response.", priceCents: 45000, durationMin: 240 },
      ],
      availability: [
        { dayOfWeek: 1, startTime: "08:00", endTime: "18:00" },
        { dayOfWeek: 2, startTime: "08:00", endTime: "18:00" },
        { dayOfWeek: 3, startTime: "08:00", endTime: "18:00" },
        { dayOfWeek: 4, startTime: "08:00", endTime: "18:00" },
        { dayOfWeek: 5, startTime: "08:00", endTime: "16:00" },
        { dayOfWeek: 6, startTime: "09:00", endTime: "13:00" },
      ],
    },
    {
      user: {
        name: "Maria Santos",
        email: "maria.santos@demo.com",
        phone: "312-555-3002",
      },
      profile: {
        businessName: "Santos Piano Studio",
        bio: "Classically trained pianist and certified technician. I bring a musician's ear to every tuning. Specializing in grand pianos and historical instrument restoration. Bilingual — English and Spanish.",
        yearsExperience: 12,
        certifications: JSON.stringify(["RPT", "PTG Member"]),
        serviceRadius: 25,
        latitude: 41.8781,
        longitude: -87.6298,
        addressLine1: "2250 N Lincoln Ave",
        city: "Chicago",
        state: "IL",
        zipCode: "60614",
        ptgMember: true,
      },
      services: [
        { name: "Standard Tuning", description: "Precise tuning for all piano types.", priceCents: 16000, durationMin: 90 },
        { name: "Pitch Raise", description: "For pianos significantly below pitch. Includes follow-up fine tuning.", priceCents: 22000, durationMin: 120 },
        { name: "Minor Repair", description: "Sticking keys, broken strings, pedal adjustments.", priceCents: 10000, durationMin: 45 },
      ],
      availability: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 3, startTime: "10:00", endTime: "15:00" },
        { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
      ],
    },
    {
      user: {
        name: "Robert Kim",
        email: "robert.kim@demo.com",
        phone: "415-555-3003",
      },
      profile: {
        businessName: "Bay Area Piano Tech",
        bio: "Serving the San Francisco Bay Area for 8 years. Factory-trained on Yamaha and Kawai instruments. Known for reliability, punctuality, and transparent pricing. All work guaranteed.",
        yearsExperience: 8,
        certifications: JSON.stringify(["RPT", "Yamaha Certified"]),
        serviceRadius: 40,
        latitude: 37.7749,
        longitude: -122.4194,
        addressLine1: "550 Montgomery St",
        city: "San Francisco",
        state: "CA",
        zipCode: "94111",
        ptgMember: false,
      },
      services: [
        { name: "Standard Tuning", description: "Professional tuning for uprights and grands.", priceCents: 19500, durationMin: 90 },
        { name: "Pitch Raise", description: "Double-pass tuning for neglected pianos.", priceCents: 27500, durationMin: 120 },
        { name: "Action Repair", description: "Comprehensive action repair and parts replacement.", priceCents: 15000, durationMin: 90 },
        { name: "Cleaning & Detailing", description: "Deep cleaning of keys, soundboard, and case.", priceCents: 12000, durationMin: 60 },
      ],
      availability: [
        { dayOfWeek: 1, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 2, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 3, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 4, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 5, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 6, startTime: "09:00", endTime: "14:00" },
      ],
    },
    {
      user: {
        name: "Emily Woodward",
        email: "emily.woodward@demo.com",
        phone: "512-555-3004",
      },
      profile: {
        businessName: "Woodward Piano Services",
        bio: "Family-friendly piano care in the Austin area. I specialize in helping families keep their pianos in great shape. Patient, thorough, and always happy to answer questions about piano maintenance.",
        yearsExperience: 6,
        certifications: JSON.stringify(["PTG Member"]),
        serviceRadius: 20,
        latitude: 30.2672,
        longitude: -97.7431,
        addressLine1: "1100 Congress Ave",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        ptgMember: true,
      },
      services: [
        { name: "Standard Tuning", description: "Friendly, thorough tuning for home pianos.", priceCents: 14500, durationMin: 75 },
        { name: "Minor Repair", description: "Quick fixes for common issues.", priceCents: 8500, durationMin: 45 },
        { name: "Piano Assessment", description: "Full condition evaluation with written report.", priceCents: 7500, durationMin: 60 },
      ],
      availability: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "16:00" },
        { dayOfWeek: 2, startTime: "09:00", endTime: "16:00" },
        { dayOfWeek: 3, startTime: "09:00", endTime: "16:00" },
        { dayOfWeek: 4, startTime: "09:00", endTime: "16:00" },
        { dayOfWeek: 5, startTime: "09:00", endTime: "14:00" },
      ],
    },
    {
      user: {
        name: "Thomas Grant",
        email: "thomas.grant@demo.com",
        phone: "212-555-3005",
      },
      profile: {
        businessName: "Grant & Sons Piano",
        bio: "Established in 2005, Grant & Sons has tuned over 10,000 pianos across the New York metro area. From Juilliard practice rooms to Brooklyn brownstones, we handle it all. Same-week appointments available.",
        yearsExperience: 18,
        certifications: JSON.stringify(["RPT", "PTG Master Technician", "Bösendorfer Certified"]),
        serviceRadius: 30,
        latitude: 40.7128,
        longitude: -74.0060,
        addressLine1: "350 Fifth Ave",
        city: "New York",
        state: "NY",
        zipCode: "10118",
        ptgMember: true,
      },
      services: [
        { name: "Standard Tuning", description: "Expert tuning for all makes and models.", priceCents: 22000, durationMin: 90 },
        { name: "Concert Preparation", description: "Performance-level tuning and regulation.", priceCents: 35000, durationMin: 180 },
        { name: "Restoration Consultation", description: "Evaluation and planning for full piano restoration.", priceCents: 15000, durationMin: 90 },
        { name: "Humidity Control Install", description: "Dampp-Chaser climate system installation.", priceCents: 55000, durationMin: 180 },
      ],
      availability: [
        { dayOfWeek: 1, startTime: "07:00", endTime: "19:00" },
        { dayOfWeek: 2, startTime: "07:00", endTime: "19:00" },
        { dayOfWeek: 3, startTime: "07:00", endTime: "19:00" },
        { dayOfWeek: 4, startTime: "07:00", endTime: "19:00" },
        { dayOfWeek: 5, startTime: "07:00", endTime: "19:00" },
        { dayOfWeek: 6, startTime: "08:00", endTime: "15:00" },
        { dayOfWeek: 0, startTime: "10:00", endTime: "14:00" },
      ],
    },
  ];

  const techProfiles: { id: string; userId: string; services: { id: string; priceCents: number }[] }[] = [];

  for (const tech of technicians) {
    const user = await prisma.user.upsert({
      where: { email: tech.user.email },
      update: {},
      create: {
        name: tech.user.name,
        email: tech.user.email,
        hashedPassword: pw,
        role: "TECHNICIAN",
        phone: tech.user.phone,
        emailVerified: now,
      },
    });

    const profile = await prisma.technicianProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        isVerified: true,
        isActive: true,
        onboardingStatus: "APPROVED",
        ...tech.profile,
      },
    });

    const serviceRecords: { id: string; priceCents: number }[] = [];
    for (const svc of tech.services) {
      const s = await prisma.service.create({
        data: { technicianId: profile.id, ...svc },
      });
      serviceRecords.push({ id: s.id, priceCents: s.priceCents });
    }

    for (const slot of tech.availability) {
      await prisma.availabilitySlot.create({
        data: { technicianId: profile.id, ...slot },
      });
    }

    techProfiles.push({ id: profile.id, userId: user.id, services: serviceRecords });
    console.log(`  Created technician: ${tech.user.name} (${tech.profile.city}, ${tech.profile.state})`);
  }

  // ─── Bookings & Reviews ────────────────────────────────

  const reviewData = [
    // Sarah's bookings with James (Boston)
    {
      customerId: sarah.id,
      techIdx: 0,
      status: "COMPLETED",
      scheduledAt: new Date("2026-02-10T10:00:00"),
      piano: { type: "GRAND", make: "Steinway", model: "Model B" },
      address: { addressLine1: "88 Beacon St", city: "Boston", state: "MA", zipCode: "02108" },
      review: { rating: 5, comment: "James is phenomenal. My Steinway hasn't sounded this good since we bought it. He took the time to explain everything he was doing and gave me tips on maintaining humidity levels. Highly recommend." },
    },
    {
      customerId: sarah.id,
      techIdx: 0,
      status: "COMPLETED",
      scheduledAt: new Date("2026-03-20T14:00:00"),
      piano: { type: "GRAND", make: "Steinway", model: "Model B" },
      address: { addressLine1: "88 Beacon St", city: "Boston", state: "MA", zipCode: "02108" },
      review: { rating: 5, comment: "Second tuning with James. Consistent excellence. He noticed a minor regulation issue I hadn't even detected and fixed it on the spot." },
    },
    // Sarah's booking with Thomas (NYC visit)
    {
      customerId: sarah.id,
      techIdx: 4,
      status: "COMPLETED",
      scheduledAt: new Date("2026-01-15T11:00:00"),
      piano: { type: "UPRIGHT", make: "Yamaha", model: "U3" },
      address: { addressLine1: "200 W 72nd St", city: "New York", state: "NY", zipCode: "10023" },
      review: { rating: 4, comment: "Very professional and efficient. Tuned my upright quickly and it sounds great. Would have liked a bit more explanation of what he found, but the results speak for themselves." },
    },
    // David's bookings with Maria (Chicago)
    {
      customerId: david.id,
      techIdx: 1,
      status: "COMPLETED",
      scheduledAt: new Date("2026-03-05T09:00:00"),
      piano: { type: "GRAND", make: "Yamaha", model: "C7" },
      address: { addressLine1: "1500 N Lake Shore Dr", city: "Chicago", state: "IL", zipCode: "60610" },
      review: { rating: 5, comment: "Maria is a true artist. As a fellow musician, she understood exactly what I was looking for in the tone. She spent extra time voicing the treble section and the result is beautiful. Worth every penny." },
    },
    {
      customerId: david.id,
      techIdx: 1,
      status: "COMPLETED",
      scheduledAt: new Date("2026-01-20T10:00:00"),
      piano: { type: "GRAND", make: "Yamaha", model: "C7" },
      address: { addressLine1: "1500 N Lake Shore Dr", city: "Chicago", state: "IL", zipCode: "60610" },
      review: { rating: 5, comment: "Pitch raise on a piano that hadn't been tuned in 3 years. Maria was patient and thorough. Piano sounds incredible now." },
    },
    // David's booking with Robert (SF visit)
    {
      customerId: david.id,
      techIdx: 2,
      status: "COMPLETED",
      scheduledAt: new Date("2026-02-28T13:00:00"),
      piano: { type: "UPRIGHT", make: "Kawai", model: "K-500" },
      address: { addressLine1: "780 Mission St", city: "San Francisco", state: "CA", zipCode: "94105" },
      review: { rating: 4, comment: "Robert was punctual and did a solid job on my Kawai. Clean work, fair price. The deep cleaning service was a nice touch — keys look brand new." },
    },
    // More reviews for variety
    {
      customerId: sarah.id,
      techIdx: 2,
      status: "COMPLETED",
      scheduledAt: new Date("2026-03-10T10:00:00"),
      piano: { type: "UPRIGHT", make: "Baldwin", model: "Acrosonic" },
      address: { addressLine1: "450 Sutter St", city: "San Francisco", state: "CA", zipCode: "94108" },
      review: { rating: 3, comment: "Good tuning but had to reschedule twice. The actual work was fine once he arrived." },
    },
    {
      customerId: david.id,
      techIdx: 3,
      status: "COMPLETED",
      scheduledAt: new Date("2026-03-15T09:00:00"),
      piano: { type: "UPRIGHT", make: "Yamaha", model: "P22" },
      address: { addressLine1: "600 Congress Ave", city: "Austin", state: "TX", zipCode: "78701" },
      review: { rating: 5, comment: "Emily is wonderful! She was so patient with my kids who wanted to watch the whole process. She even showed them how the hammers work. Our piano sounds great and the kids learned something new." },
    },
    {
      customerId: sarah.id,
      techIdx: 4,
      status: "COMPLETED",
      scheduledAt: new Date("2026-02-20T09:00:00"),
      piano: { type: "GRAND", make: "Bösendorfer", model: "185" },
      address: { addressLine1: "1 Lincoln Center", city: "New York", state: "NY", zipCode: "10023" },
      review: { rating: 5, comment: "Thomas tuned our Bösendorfer for a private recital. Absolute perfection. He has an extraordinary ear and the patience to get every note exactly right." },
    },
  ];

  for (const rd of reviewData) {
    const tech = techProfiles[rd.techIdx];
    const svc = tech.services[0]; // Use first service for all demo bookings

    const booking = await prisma.booking.create({
      data: {
        customerId: rd.customerId,
        technicianId: tech.id,
        status: rd.status,
        scheduledAt: rd.scheduledAt,
        durationMin: 90,
        totalCents: svc.priceCents,
        pianoType: rd.piano.type,
        pianoMake: rd.piano.make,
        pianoModel: rd.piano.model,
        ...rd.address,
        services: {
          create: { serviceId: svc.id, priceCents: svc.priceCents },
        },
        payment: {
          create: {
            amountCents: svc.priceCents,
            status: "SUCCEEDED",
            method: "CARD",
          },
        },
        review: {
          create: {
            authorId: rd.customerId,
            rating: rd.review.rating,
            comment: rd.review.comment,
          },
        },
      },
    });

    console.log(`  Created booking + review: ${rd.review.rating}★ for tech #${rd.techIdx + 1}`);
  }

  // ─── Upcoming Bookings (for dashboard testing) ─────────

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(10, 0, 0, 0);

  await prisma.booking.create({
    data: {
      customerId: sarah.id,
      technicianId: techProfiles[0].id,
      status: "CONFIRMED",
      scheduledAt: nextWeek,
      durationMin: 90,
      totalCents: techProfiles[0].services[0].priceCents,
      addressLine1: "88 Beacon St",
      city: "Boston",
      state: "MA",
      zipCode: "02108",
      pianoType: "GRAND",
      pianoMake: "Steinway",
      pianoModel: "Model B",
      services: {
        create: { serviceId: techProfiles[0].services[0].id, priceCents: techProfiles[0].services[0].priceCents },
      },
    },
  });
  console.log("  Created upcoming booking for Sarah");

  // ─── Job Postings ──────────────────────────────────────

  await prisma.job.create({
    data: {
      customerId: sarah.id,
      title: "Annual piano tuning — Steinway Model B",
      serviceType: "Tuning",
      description: "Need my Steinway Model B tuned. It was last tuned about 6 months ago and is in good condition. Located in Back Bay, Boston. Flexible on scheduling.",
      budgetCents: 20000,
      city: "Boston",
      state: "MA",
      status: "OPEN",
    },
  });

  await prisma.job.create({
    data: {
      customerId: david.id,
      title: "Piano repair — sticky keys on Yamaha upright",
      serviceType: "Repair",
      description: "Several keys on my Yamaha P22 are sticking, especially in the middle register. The piano is about 15 years old. Looking for someone experienced with Yamaha uprights.",
      budgetCents: 15000,
      city: "Chicago",
      state: "IL",
      status: "OPEN",
    },
  });

  console.log("  Created job postings");

  console.log("\n✓ Production seed complete!");
  console.log("\nDemo accounts (password: demo1234):");
  console.log("  Customer: sarah.mitchell@demo.com");
  console.log("  Customer: david.chen@demo.com");
  console.log("  Admin:    admin@bookatuner.com");
  console.log("  Tech:     james.rothwell@demo.com (Boston)");
  console.log("  Tech:     maria.santos@demo.com (Chicago)");
  console.log("  Tech:     robert.kim@demo.com (San Francisco)");
  console.log("  Tech:     emily.woodward@demo.com (Austin)");
  console.log("  Tech:     thomas.grant@demo.com (New York)");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
