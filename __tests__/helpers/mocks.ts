import { vi } from "vitest";

// ─── Prisma Mock ─────────────────────────────────────────────

function createMockModel() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  };
}

export const prismaMock = {
  user: createMockModel(),
  account: createMockModel(),
  session: createMockModel(),
  technicianProfile: createMockModel(),
  service: createMockModel(),
  availabilitySlot: createMockModel(),
  booking: createMockModel(),
  bookingService: createMockModel(),
  payment: createMockModel(),
  review: createMockModel(),
  customerRecord: createMockModel(),
};

// ─── Session Helpers ─────────────────────────────────────────

export function mockCustomerSession() {
  return {
    user: {
      id: "customer-1",
      name: "Jane Doe",
      email: "customer@example.com",
      role: "CUSTOMER",
    },
  };
}

export function mockTechnicianSession() {
  return {
    user: {
      id: "tech-user-1",
      name: "Mike Tuner",
      email: "tech@example.com",
      role: "TECHNICIAN",
    },
  };
}

// ─── Test Fixtures ───────────────────────────────────────────

export const fixtures = {
  technicianProfile: {
    id: "tech-profile-1",
    userId: "tech-user-1",
    bio: "Experienced piano tuner",
    businessName: "Mike's Piano Service",
    yearsExperience: 15,
    certifications: JSON.stringify(["RPT"]),
    serviceRadius: 30,
    latitude: 42.36,
    longitude: -71.06,
    addressLine1: "123 Main St",
    city: "Boston",
    state: "MA",
    zipCode: "02108",
    stripeAccountId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  service: {
    id: "service-1",
    technicianId: "tech-profile-1",
    name: "Standard Tuning",
    description: "Full piano tuning",
    priceCents: 17500,
    durationMin: 90,
    isActive: true,
  },

  service2: {
    id: "service-2",
    technicianId: "tech-profile-1",
    name: "Pitch Raise",
    description: null,
    priceCents: 25000,
    durationMin: 120,
    isActive: true,
  },

  booking: {
    id: "booking-1",
    customerId: "customer-1",
    technicianId: "tech-profile-1",
    status: "PENDING",
    scheduledAt: new Date("2026-04-15T10:00:00Z"),
    durationMin: 90,
    addressLine1: "456 Oak Ave",
    addressLine2: null,
    city: "Boston",
    state: "MA",
    zipCode: "02215",
    notes: null,
    pianoType: "GRAND",
    pianoMake: "Steinway",
    pianoModel: "Model B",
    totalCents: 17500,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  user: {
    id: "customer-1",
    name: "Jane Doe",
    email: "customer@example.com",
    hashedPassword: "$2a$12$hashedpassword",
    role: "CUSTOMER",
    phone: null,
    image: null,
    emailVerified: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  review: {
    id: "review-1",
    bookingId: "booking-1",
    authorId: "customer-1",
    rating: 5,
    comment: "Great service!",
    createdAt: new Date(),
  },

  payment: {
    id: "payment-1",
    bookingId: "booking-1",
    stripePaymentId: null,
    amountCents: 17500,
    status: "PENDING",
    method: null,
    tipCents: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  customerRecord: {
    id: "record-1",
    technicianId: "tech-profile-1",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    customerPhone: "617-555-0100",
    pianoMake: "Steinway",
    pianoModel: "Model B",
    serialNumber: "SN12345",
    pianoLocation: "Living room",
    notes: "Annual tuning client",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  availabilitySlot: {
    id: "slot-1",
    technicianId: "tech-profile-1",
    dayOfWeek: 1, // Monday
    startTime: "09:00",
    endTime: "17:00",
  },
};

// ─── FormData Helper ─────────────────────────────────────────

export function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}
