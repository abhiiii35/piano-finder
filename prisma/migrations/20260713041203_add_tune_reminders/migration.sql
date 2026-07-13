-- CreateTable
CREATE TABLE "TuneReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technicianId" TEXT NOT NULL,
    "customerRecordId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL DEFAULT '6_MONTH',
    "lastTuningDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TuneReminder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "TechnicianProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TuneReminder_customerRecordId_fkey" FOREIGN KEY ("customerRecordId") REFERENCES "CustomerRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TuneReminder_technicianId_sent_idx" ON "TuneReminder"("technicianId", "sent");

-- CreateIndex
CREATE INDEX "TuneReminder_dueDate_sent_idx" ON "TuneReminder"("dueDate", "sent");

-- CreateIndex
CREATE UNIQUE INDEX "TuneReminder_customerRecordId_reminderType_key" ON "TuneReminder"("customerRecordId", "reminderType");
