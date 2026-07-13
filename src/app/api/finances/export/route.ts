import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateRangeSchema } from "@/lib/validations/expense";
import {
  getIncomePayments,
  getExpensesForRange,
  getMileageLogsForRange,
} from "@/lib/queries/finance";
import {
  incomeLedgerCsv,
  expenseLedgerCsv,
  mileageLedgerCsv,
  transactionsCsv,
  type TransactionRow,
} from "@/lib/finance/csv";
import { INCOME_CATEGORY } from "@/lib/constants";

const EXPORT_TYPES = ["income", "expenses", "mileage", "transactions"] as const;
type ExportType = (typeof EXPORT_TYPES)[number];

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return new Response("Profile not found", { status: 404 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") as ExportType | null;
  if (!type || !EXPORT_TYPES.includes(type)) {
    return new Response("Invalid export type", { status: 400 });
  }

  const range = dateRangeSchema.safeParse({
    from: url.searchParams.get("from") ?? "",
    to: url.searchParams.get("to") ?? "",
  });
  if (!range.success) {
    return new Response(range.error.issues[0].message, { status: 400 });
  }
  const { from, to } = range.data;

  let csv: string;
  switch (type) {
    case "income": {
      const payments = await getIncomePayments(profile.id, from, to);
      csv = incomeLedgerCsv(
        payments.map((p) => ({
          date: p.booking.scheduledAt,
          customerName: p.booking.customer.name ?? "Customer",
          services: p.booking.services.map((s) => s.service.name).join(" + "),
          method: p.method ?? "",
          amountCents: p.amountCents,
          tipCents: p.tipCents,
        }))
      );
      break;
    }
    case "expenses": {
      const expenses = await getExpensesForRange(profile.id, from, to);
      csv = expenseLedgerCsv(expenses);
      break;
    }
    case "mileage": {
      const logs = await getMileageLogsForRange(profile.id, from, to);
      csv = mileageLedgerCsv(logs);
      break;
    }
    case "transactions": {
      // One combined income + expense ledger: Date, Description, Amount
      // (positive in / negative out), Category. The first three columns match
      // QuickBooks Online's 3-column bank-transaction import; QBO has no CSV
      // import for mileage trips, so mileage stays in its own ledger export.
      const [payments, expenses] = await Promise.all([
        getIncomePayments(profile.id, from, to),
        getExpensesForRange(profile.id, from, to),
      ]);
      const transactions: TransactionRow[] = [
        ...payments.map(
          (p): TransactionRow => ({
            date: p.booking.scheduledAt,
            description: `${p.booking.services
              .map((s) => s.service.name)
              .join(" + ")} - ${p.booking.customer.name ?? "Customer"}`,
            amountCents: p.amountCents + p.tipCents,
            category: INCOME_CATEGORY,
          })
        ),
        ...expenses.map(
          (e): TransactionRow => ({
            date: e.date,
            description: e.vendor ?? e.notes ?? e.category,
            amountCents: -e.amountCents,
            category: e.category,
          })
        ),
      ];
      csv = transactionsCsv(transactions);
      break;
    }
  }

  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${fromParam}-to-${toParam}.csv"`,
    },
  });
}
