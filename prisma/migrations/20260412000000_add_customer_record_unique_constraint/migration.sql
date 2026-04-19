-- CreateIndex
CREATE UNIQUE INDEX "CustomerRecord_technicianId_customerEmail_key" ON "CustomerRecord"("technicianId", "customerEmail");
