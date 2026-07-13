import { prisma } from "@/lib/prisma";
import { PAYMENT_STATUS } from "@/lib/constants";
import { addDays } from "date-fns";

// All range queries take local-midnight dates and cover [from, to] inclusive
// by querying [from, to + 1 day). Income is recorded on the booking's service
// date (scheduledAt), which is also the date shown on invoices and exports.

export function getIncomePayments(technicianId: string, from: Date, to: Date) {
  return prisma.payment.findMany({
    where: {
      status: PAYMENT_STATUS.SUCCEEDED,
      booking: {
        technicianId,
        scheduledAt: { gte: from, lt: addDays(to, 1) },
      },
    },
    include: {
      booking: {
        include: {
          customer: { select: { name: true } },
          services: { include: { service: { select: { name: true } } } },
        },
      },
    },
    orderBy: { booking: { scheduledAt: "asc" } },
  });
}

export function getExpensesForRange(
  technicianId: string,
  from: Date,
  to: Date
) {
  return prisma.expense.findMany({
    where: { technicianId, date: { gte: from, lt: addDays(to, 1) } },
    orderBy: { date: "asc" },
  });
}

export function getMileageLogsForRange(
  technicianId: string,
  from: Date,
  to: Date
) {
  return prisma.mileageLog.findMany({
    where: { technicianId, date: { gte: from, lt: addDays(to, 1) } },
    orderBy: { date: "asc" },
  });
}
