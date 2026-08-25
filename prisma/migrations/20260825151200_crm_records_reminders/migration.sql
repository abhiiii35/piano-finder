-- AlterTable
ALTER TABLE "CustomerRecord" ADD COLUMN "billingAddressLine1" TEXT;
ALTER TABLE "CustomerRecord" ADD COLUMN "billingCity" TEXT;
ALTER TABLE "CustomerRecord" ADD COLUMN "billingState" TEXT;
ALTER TABLE "CustomerRecord" ADD COLUMN "billingZip" TEXT;
ALTER TABLE "CustomerRecord" ADD COLUMN "shareToken" TEXT;

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerRecordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_customerRecordId_fkey" FOREIGN KEY ("customerRecordId") REFERENCES "CustomerRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerRecordId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceLocation_customerRecordId_fkey" FOREIGN KEY ("customerRecordId") REFERENCES "CustomerRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Piano" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerRecordId" TEXT NOT NULL,
    "serviceLocationId" TEXT,
    "type" TEXT,
    "make" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "year" INTEGER,
    "roomLocation" TEXT,
    "tuningFrequencyMonths" INTEGER NOT NULL DEFAULT 6,
    "damppChaserInstalled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Piano_customerRecordId_fkey" FOREIGN KEY ("customerRecordId") REFERENCES "CustomerRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Piano_serviceLocationId_fkey" FOREIGN KEY ("serviceLocationId") REFERENCES "ServiceLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pianoId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "bookingId" TEXT,
    "date" DATETIME NOT NULL,
    "workPerformed" TEXT,
    "pitchOffsetCents" REAL,
    "humidityPct" REAL,
    "temperatureF" REAL,
    "recommendations" TEXT,
    "notes" TEXT,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "clientVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceRecord_pianoId_fkey" FOREIGN KEY ("pianoId") REFERENCES "Piano" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technicianId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sendOffsetHours" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TechnicianProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "businessName" TEXT,
    "yearsExperience" INTEGER,
    "certifications" TEXT,
    "serviceRadius" INTEGER,
    "latitude" REAL,
    "longitude" REAL,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "pianoTypes" TEXT,
    "travelFeeCents" INTEGER,
    "travelBufferMin" INTEGER NOT NULL DEFAULT 30,
    "rescheduleCutoffHours" INTEGER NOT NULL DEFAULT 48,
    "proposeTimesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderMode" TEXT NOT NULL DEFAULT 'REVIEW',
    "historyViewPrefs" TEXT NOT NULL DEFAULT '{}',
    "clientViewPrefs" TEXT NOT NULL DEFAULT '{}',
    "invoiceLogoUrl" TEXT,
    "calendarToken" TEXT,
    "ptgMember" BOOLEAN NOT NULL DEFAULT false,
    "stripeAccountId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onboardingStatus" TEXT NOT NULL DEFAULT 'WIZARD_PENDING',
    "rejectionReason" TEXT,
    "portfolioPhotos" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TechnicianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TechnicianProfile" ("addressLine1", "bio", "businessName", "certifications", "city", "createdAt", "id", "isActive", "isVerified", "latitude", "longitude", "onboardingStatus", "pianoTypes", "portfolioPhotos", "proposeTimesEnabled", "ptgMember", "rejectionReason", "rescheduleCutoffHours", "serviceRadius", "state", "stripeAccountId", "travelBufferMin", "travelFeeCents", "updatedAt", "userId", "yearsExperience", "zipCode") SELECT "addressLine1", "bio", "businessName", "certifications", "city", "createdAt", "id", "isActive", "isVerified", "latitude", "longitude", "onboardingStatus", "pianoTypes", "portfolioPhotos", "proposeTimesEnabled", "ptgMember", "rejectionReason", "rescheduleCutoffHours", "serviceRadius", "state", "stripeAccountId", "travelBufferMin", "travelFeeCents", "updatedAt", "userId", "yearsExperience", "zipCode" FROM "TechnicianProfile";
DROP TABLE "TechnicianProfile";
ALTER TABLE "new_TechnicianProfile" RENAME TO "TechnicianProfile";
CREATE UNIQUE INDEX "TechnicianProfile_userId_key" ON "TechnicianProfile"("userId");
CREATE UNIQUE INDEX "TechnicianProfile_calendarToken_key" ON "TechnicianProfile"("calendarToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Contact_customerRecordId_idx" ON "Contact"("customerRecordId");

-- CreateIndex
CREATE INDEX "ServiceLocation_customerRecordId_idx" ON "ServiceLocation"("customerRecordId");

-- CreateIndex
CREATE INDEX "Piano_customerRecordId_idx" ON "Piano"("customerRecordId");

-- CreateIndex
CREATE INDEX "ServiceRecord_pianoId_date_idx" ON "ServiceRecord"("pianoId", "date");

-- CreateIndex
CREATE INDEX "ServiceRecord_technicianId_date_idx" ON "ServiceRecord"("technicianId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_technicianId_type_key" ON "MessageTemplate"("technicianId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRecord_shareToken_key" ON "CustomerRecord"("shareToken");

