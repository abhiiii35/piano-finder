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
    "ptgMember" BOOLEAN NOT NULL DEFAULT false,
    "stripeAccountId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onboardingStatus" TEXT NOT NULL DEFAULT 'WIZARD_PENDING',
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TechnicianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TechnicianProfile" ("addressLine1", "bio", "businessName", "certifications", "city", "createdAt", "id", "isActive", "isVerified", "latitude", "longitude", "pianoTypes", "ptgMember", "serviceRadius", "state", "stripeAccountId", "travelFeeCents", "updatedAt", "userId", "yearsExperience", "zipCode") SELECT "addressLine1", "bio", "businessName", "certifications", "city", "createdAt", "id", "isActive", "isVerified", "latitude", "longitude", "pianoTypes", "ptgMember", "serviceRadius", "state", "stripeAccountId", "travelFeeCents", "updatedAt", "userId", "yearsExperience", "zipCode" FROM "TechnicianProfile";
DROP TABLE "TechnicianProfile";
ALTER TABLE "new_TechnicianProfile" RENAME TO "TechnicianProfile";
CREATE UNIQUE INDEX "TechnicianProfile_userId_key" ON "TechnicianProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
