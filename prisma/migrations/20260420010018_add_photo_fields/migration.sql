-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("authorId", "bookingId", "comment", "createdAt", "id", "rating") SELECT "authorId", "bookingId", "comment", "createdAt", "id", "rating" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");
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
    "portfolioPhotos" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TechnicianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TechnicianProfile" ("addressLine1", "bio", "businessName", "certifications", "city", "createdAt", "id", "isActive", "isVerified", "latitude", "longitude", "onboardingStatus", "pianoTypes", "ptgMember", "rejectionReason", "serviceRadius", "state", "stripeAccountId", "travelFeeCents", "updatedAt", "userId", "yearsExperience", "zipCode") SELECT "addressLine1", "bio", "businessName", "certifications", "city", "createdAt", "id", "isActive", "isVerified", "latitude", "longitude", "onboardingStatus", "pianoTypes", "ptgMember", "rejectionReason", "serviceRadius", "state", "stripeAccountId", "travelFeeCents", "updatedAt", "userId", "yearsExperience", "zipCode" FROM "TechnicianProfile";
DROP TABLE "TechnicianProfile";
ALTER TABLE "new_TechnicianProfile" RENAME TO "TechnicianProfile";
CREATE UNIQUE INDEX "TechnicianProfile_userId_key" ON "TechnicianProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
