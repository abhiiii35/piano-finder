"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateRangeSchema } from "@/lib/validations/expense";
import {
  getIncomePayments,
  getExpensesForRange,
  getMileageLogsForRange,
} from "@/lib/queries/finance";
import { buildProfitAndLoss, type ProfitAndLoss } from "@/lib/finance/report";

async function getTechnicianProfile() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    throw new Error("Unauthorized");
  }
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) throw new Error("Profile not found");
  return profile;
}

export async function getFinanceReport(
  from: string,
  to: string
): Promise<{ report?: ProfitAndLoss; error?: string }> {
  const profile = await getTechnicianProfile();

  const range = dateRangeSchema.safeParse({ from, to });
  if (!range.success) {
    return { error: range.error.issues[0].message };
  }

  const [payments, expenses, mileageLogs] = await Promise.all([
    getIncomePayments(profile.id, range.data.from, range.data.to),
    getExpensesForRange(profile.id, range.data.from, range.data.to),
    getMileageLogsForRange(profile.id, range.data.from, range.data.to),
  ]);

  return { report: buildProfitAndLoss({ payments, expenses, mileageLogs }) };
}
