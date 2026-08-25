-- CreateTable
CREATE TABLE "AvailabilityException" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technicianId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvailabilityException_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "TechnicianProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RescheduleProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "slots" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "chosenSlot" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RescheduleProposal_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MileageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technicianId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "miles" REAL NOT NULL,
    "purpose" TEXT NOT NULL,
    "bookingId" TEXT,
    "autoCaptured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MileageLog_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "TechnicianProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MileageLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MileageLog" ("bookingId", "createdAt", "date", "id", "miles", "purpose", "technicianId") SELECT "bookingId", "createdAt", "date", "id", "miles", "purpose", "technicianId" FROM "MileageLog";
DROP TABLE "MileageLog";
ALTER TABLE "new_MileageLog" RENAME TO "MileageLog";
CREATE INDEX "MileageLog_technicianId_date_idx" ON "MileageLog"("technicianId", "date");
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
INSERT INTO "new_TechnicianProfile" ("addressLine1", "bio", "businessName", "certifications", "city", "createdAt", "id", "isActive", "isVerified", "latitude", "longitude", "onboardingStatus", "pianoTypes", "portfolioPhotos", "ptgMember", "rejectionReason", "serviceRadius", "state", "stripeAccountId", "travelBufferMin", "travelFeeCents", "updatedAt", "userId", "yearsExperience", "zipCode") SELECT "addressLine1", "bio", "businessName", "certifications", "city", "createdAt", "id", "isActive", "isVerified", "latitude", "longitude", "onboardingStatus", "pianoTypes", "portfolioPhotos", "ptgMember", "rejectionReason", "serviceRadius", "state", "stripeAccountId", "travelBufferMin", "travelFeeCents", "updatedAt", "userId", "yearsExperience", "zipCode" FROM "TechnicianProfile";
DROP TABLE "TechnicianProfile";
ALTER TABLE "new_TechnicianProfile" RENAME TO "TechnicianProfile";
CREATE UNIQUE INDEX "TechnicianProfile_userId_key" ON "TechnicianProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AvailabilityException_technicianId_startsAt_idx" ON "AvailabilityException"("technicianId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "RescheduleProposal_token_key" ON "RescheduleProposal"("token");

-- CreateIndex
CREATE INDEX "RescheduleProposal_bookingId_status_idx" ON "RescheduleProposal"("bookingId", "status");
