"use server";

import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedCustomerRecord(customerRecordId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    throw new Error("Unauthorized");
  }
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) throw new Error("Profile not found");

  const record = await prisma.customerRecord.findFirst({
    where: { id: customerRecordId, technicianId: profile.id },
  });
  return record;
}

export async function enableShareLink(customerRecordId: string) {
  const record = await getOwnedCustomerRecord(customerRecordId);
  if (!record) return { error: "Customer record not found" };
  if (record.shareToken) return { success: true, shareToken: record.shareToken };

  // 24 bytes hex = 48 chars, unguessable; collision odds are negligible so no
  // retry loop (ponytail: add a retry-on-unique-violation if this ever fires).
  const shareToken = randomBytes(24).toString("hex");
  await prisma.customerRecord.update({
    where: { id: customerRecordId },
    data: { shareToken },
  });

  revalidatePath(`/dashboard/technician/customers/${customerRecordId}`);
  return { success: true, shareToken };
}

export async function revokeShareLink(customerRecordId: string) {
  const record = await getOwnedCustomerRecord(customerRecordId);
  if (!record) return { error: "Customer record not found" };

  await prisma.customerRecord.update({
    where: { id: customerRecordId },
    data: { shareToken: null },
  });

  revalidatePath(`/dashboard/technician/customers/${customerRecordId}`);
  return { success: true };
}
