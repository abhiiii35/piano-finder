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
    createMany: vi.fn(),
    updateMany: vi.fn(),
    aggregate: vi.fn(),
  };
}

export const prismaMock = {
  user: createMockModel(),
  account: createMockModel(),
  session: createMockModel(),
  technicianProfile: createMockModel(),
  service: createMockModel(),
  availabilitySlot: createMockModel(),
  availabilityException: createMockModel(),
  booking: createMockModel(),
  bookingService: createMockModel(),
  payment: createMockModel(),
  review: createMockModel(),
  customerRecord: createMockModel(),
  piano: createMockModel(),
  serviceLocation: createMockModel(),
  job: createMockModel(),
  jobApplication: createMockModel(),
  message: createMockModel(),
  verificationToken: createMockModel(),
  passwordResetToken: createMockModel(),
  expense: createMockModel(),
  mileageLog: createMockModel(),
  post: createMockModel(),
  tuneReminder: createMockModel(),
  rescheduleProposal: createMockModel(),
  messageTemplate: createMockModel(),
  contact: createMockModel(),
  serviceRecord: createMockModel(),
  webhookEvent: createMockModel(),
  // Interactive-transaction mock; tests typically override it to invoke the
  // callback with prismaMock itself (see booking.test.ts).
  $transaction: vi.fn(),
};

// ─── Session Helpers ─────────────────────────────────────────

export function mockCustomerSession(overrides?: { emailVerified?: Date | null }) {
  return {
    user: {
      id: "customer-1",
      name: "Jane Doe",
      email: "customer@example.com",
      role: "CUSTOMER",
      emailVerified: overrides && "emailVerified" in overrides ? overrides.emailVerified : new Date(),
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
      emailVerified: new Date(),
    },
  };
}

export function mockAdminSession() {
  return {
    user: {
      id: "admin-1",
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
      emailVerified: new Date(),
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
    pianoTypes: null,
    travelFeeCents: null,
    travelBufferMin: 30,
    calendarToken: null,
    ptgMember: false,
    stripeAccountId: null,
    isVerified: true,
    isActive: true,
    onboardingStatus: "APPROVED",
    rejectionReason: null,
    portfolioPhotos: "[]",
    invoiceLogoUrl: null,
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
    latitude: null,
    longitude: null,
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

  expense: {
    id: "expense-1",
    technicianId: "tech-profile-1",
    date: new Date(2026, 5, 2),
    category: "Tools & Equipment",
    amountCents: 4599,
    vendor: "Schaff",
    notes: null,
    receiptUrl: null,
    deductible: true,
    createdAt: new Date(),
  },

  mileageLog: {
    id: "mileage-1",
    technicianId: "tech-profile-1",
    date: new Date(2026, 5, 3),
    miles: 24.6,
    purpose: "Round trip to client",
    bookingId: null,
    createdAt: new Date(),
  },

  availabilitySlot: {
    id: "slot-1",
    technicianId: "tech-profile-1",
    dayOfWeek: 1, // Monday
    startTime: "09:00",
    endTime: "17:00",
  },

  availabilityException: {
    id: "exception-1",
    technicianId: "tech-profile-1",
    startsAt: new Date(2026, 3, 14, 0, 0),
    endsAt: new Date(2026, 3, 15, 0, 0),
    allDay: true,
    reason: "Vacation",
    createdAt: new Date(),
  },

  job: {
    id: "job-1",
    customerId: "customer-1",
    title: "Annual piano tuning - Steinway Model B",
    serviceType: "Tuning",
    description: "Need my Steinway Model B tuned. It was last tuned about 14 months ago.",
    budgetCents: 20000,
    city: "Boston",
    state: "MA",
    status: "OPEN",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  jobApplication: {
    id: "app-1",
    jobId: "job-1",
    techId: "tech-user-1",
    message: "I have 15 years of experience with Steinway grands.",
    createdAt: new Date(),
  },

  message: {
    id: "msg-1",
    threadId: "customer-1:tech-profile-1:booking-1",
    senderId: "customer-1",
    bookingId: "booking-1",
    technicianId: "tech-profile-1",
    customerId: "customer-1",
    content: "Hi, I wanted to confirm the appointment time.",
    isRead: false,
    createdAt: new Date(),
  },

  post: {
    id: "post-1",
    slug: "how-often-should-you-tune-your-piano",
    title: "How Often Should You Tune Your Piano?",
    excerpt: "Most pianos need tuning twice a year. Here's why.",
    contentHtml: "<h2>Tuning frequency</h2><p>Most pianos need tuning twice a year.</p>",
    coverImageUrl: null,
    category: "Tuning",
    tags: JSON.stringify(["tuning", "maintenance"]),
    status: "PUBLISHED",
    authorId: "admin-1",
    publishedAt: new Date("2026-06-01T12:00:00Z"),
    seoTitle: null,
    seoDescription: null,
    isHowTo: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  tuneReminder: {
    id: "reminder-1",
    technicianId: "tech-profile-1",
    customerRecordId: "record-1",
    customerEmail: "jane@example.com",
    reminderType: "6_MONTH",
    lastTuningDate: new Date("2025-12-15"),
    dueDate: new Date("2026-06-15"),
    sent: false,
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  piano: {
    id: "piano-1",
    customerRecordId: "record-1",
    serviceLocationId: null,
    type: "GRAND",
    make: "Steinway",
    model: "Model B",
    serialNumber: "SN12345",
    year: 1998,
    roomLocation: "Living room",
    tuningFrequencyMonths: 6,
    damppChaserInstalled: false,
    notes: null,
    photos: "[]",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  contact: {
    id: "contact-1",
    customerRecordId: "record-1",
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "617-555-0100",
    role: "Primary owner",
    isPrimary: true,
    createdAt: new Date(),
  },

  serviceLocation: {
    id: "location-1",
    customerRecordId: "record-1",
    label: "Home",
    addressLine1: "456 Oak Ave",
    city: "Boston",
    state: "MA",
    zipCode: "02215",
    latitude: null,
    longitude: null,
    isPrimary: true,
    createdAt: new Date(),
  },

  messageTemplate: {
    id: "template-1",
    technicianId: "tech-profile-1",
    type: "RECALL",
    subject: "Time to schedule your next piano tuning",
    body: "Hi {customerName}, it's time for {pianoMake}'s next tuning.",
    sendOffsetHours: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  serviceRecord: {
    id: "record-svc-1",
    pianoId: "piano-1",
    technicianId: "tech-profile-1",
    bookingId: null,
    date: new Date(2026, 5, 1),
    workPerformed: "Tuned to A440",
    pitchOffsetCents: 8,
    humidityPct: 45,
    temperatureF: 70,
    recommendations: "Consider a humidity control system.",
    notes: "Customer's cat likes to sit on the keys.",
    photos: "[]",
    source: "MANUAL",
    clientVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
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
