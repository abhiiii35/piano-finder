-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technicianId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "vendor" TEXT,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "deductible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "TechnicianProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MileageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technicianId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "miles" REAL NOT NULL,
    "purpose" TEXT NOT NULL,
    "bookingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MileageLog_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "TechnicianProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MileageLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Expense_technicianId_date_idx" ON "Expense"("technicianId", "date");

-- CreateIndex
CREATE INDEX "MileageLog_technicianId_date_idx" ON "MileageLog"("technicianId", "date");
