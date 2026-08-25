import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { format, startOfYear } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateRangeSchema } from "@/lib/validations/expense";
import {
  getIncomePayments,
  getExpensesForRange,
  getMileageLogsForRange,
} from "@/lib/queries/finance";
import { getFinanceReport } from "@/actions/finance-report";
import { formatCents, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseForm } from "@/components/finances/expense-form";
import { MileageForm } from "@/components/finances/mileage-form";
import { DeleteEntryButton } from "@/components/finances/delete-entry-button";
import { EditMileageButton } from "@/components/finances/edit-mileage-button";
import { Download, Receipt } from "lucide-react";

const TABS = [
  { key: "income", label: "Income" },
  { key: "expenses", label: "Expenses" },
  { key: "mileage", label: "Mileage" },
  { key: "reports", label: "Reports" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function exportUrl(type: string, from: string, to: string) {
  return `/api/finances/export?type=${type}&from=${from}&to=${to}`;
}

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  const defaultFrom = format(startOfYear(new Date()), "yyyy-MM-dd");
  const defaultTo = format(new Date(), "yyyy-MM-dd");
  let from = params.from ?? defaultFrom;
  let to = params.to ?? defaultTo;
  let range = dateRangeSchema.safeParse({ from, to });
  if (!range.success) {
    from = defaultFrom;
    to = defaultTo;
    range = dateRangeSchema.safeParse({ from, to });
  }
  if (!range.success) redirect("/dashboard/technician/finances");

  const tab: TabKey = TABS.some((t) => t.key === params.tab)
    ? (params.tab as TabKey)
    : "income";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finances</h1>
          <p className="mt-1 text-muted-foreground">
            Track income, expenses, and mileage — and hand your accountant a
            clean package.
          </p>
        </div>
        <form method="GET" className="flex items-end gap-2">
          <input type="hidden" name="tab" value={tab} />
          <div className="grid gap-1">
            <label htmlFor="from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input id="from" name="from" type="date" defaultValue={from} className="w-38" />
          </div>
          <div className="grid gap-1">
            <label htmlFor="to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input id="to" name="to" type="date" defaultValue={to} className="w-38" />
          </div>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
      </div>

      <div className="mt-6 flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/technician/finances?tab=${t.key}&from=${from}&to=${to}`}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {tab === "income" && <IncomeTab technicianId={profile.id} from={from} to={to} />}
        {tab === "expenses" && (
          <ExpensesTab technicianId={profile.id} from={from} to={to} />
        )}
        {tab === "mileage" && (
          <MileageTab technicianId={profile.id} from={from} to={to} />
        )}
        {tab === "reports" && <ReportsTab from={from} to={to} />}
      </div>
    </div>
  );
}

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

async function IncomeTab({
  technicianId,
  from,
  to,
}: {
  technicianId: string;
  from: string;
  to: string;
}) {
  const payments = await getIncomePayments(
    technicianId,
    parseLocalDate(from),
    parseLocalDate(to)
  );
  const totalCents = payments.reduce(
    (sum, p) => sum + p.amountCents + p.tipCents,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Paid bookings in this range, recorded on the service date. Income is
          pulled from platform payments — nothing to re-enter.
        </p>
        <a href={exportUrl("income", from, to)} download>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </a>
      </div>
      {payments.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No paid bookings in this date range.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Tip</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{format(p.booking.scheduledAt, "MMM d, yyyy")}</TableCell>
                <TableCell>{p.booking.customer.name ?? "Customer"}</TableCell>
                <TableCell>
                  {p.booking.services.map((s) => s.service.name).join(" + ")}
                </TableCell>
                <TableCell>{p.method ?? "—"}</TableCell>
                <TableCell className="text-right">{formatCents(p.amountCents)}</TableCell>
                <TableCell className="text-right">{formatCents(p.tipCents)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCents(p.amountCents + p.tipCents)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={6} className="font-medium">
                Total
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCents(totalCents)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
}

async function ExpensesTab({
  technicianId,
  from,
  to,
}: {
  technicianId: string;
  from: string;
  to: string;
}) {
  const expenses = await getExpensesForRange(
    technicianId,
    parseLocalDate(from),
    parseLocalDate(to)
  );
  const totalCents = expenses.reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <div className="space-y-6">
      <ExpenseForm />
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {expenses.length} expense{expenses.length === 1 ? "" : "s"} ·{" "}
          {formatCents(totalCents)}
        </p>
        <a href={exportUrl("expenses", from, to)} download>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </a>
      </div>
      {expenses.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No expenses recorded in this date range.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Deductible</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{format(e.date, "MMM d, yyyy")}</TableCell>
                <TableCell>{e.category}</TableCell>
                <TableCell>{e.vendor ?? "—"}</TableCell>
                <TableCell>{e.deductible ? "Yes" : "No"}</TableCell>
                <TableCell>
                  {e.receiptUrl ? (
                    <a
                      href={e.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Receipt className="h-4 w-4" />
                      View
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCents(e.amountCents)}</TableCell>
                <TableCell className="text-right">
                  <DeleteEntryButton id={e.id} kind="expense" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

async function MileageTab({
  technicianId,
  from,
  to,
}: {
  technicianId: string;
  from: string;
  to: string;
}) {
  const [logs, recentBookings] = await Promise.all([
    getMileageLogsForRange(technicianId, parseLocalDate(from), parseLocalDate(to)),
    prisma.booking.findMany({
      where: { technicianId },
      orderBy: { scheduledAt: "desc" },
      take: 50,
      include: { customer: { select: { name: true } } },
    }),
  ]);
  const totalMiles = logs.reduce((sum, l) => sum + l.miles, 0);

  return (
    <div className="space-y-6">
      <MileageForm
        bookings={recentBookings.map((b) => ({
          id: b.id,
          label: `${format(b.scheduledAt, "MMM d, yyyy")} — ${b.customer.name ?? "Customer"}`,
        }))}
      />
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {logs.length} trip{logs.length === 1 ? "" : "s"} · {totalMiles} miles
        </p>
        <a href={exportUrl("mileage", from, to)} download>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </a>
      </div>
      {logs.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No mileage logged in this date range.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead className="text-right">Miles</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{format(l.date, "MMM d, yyyy")}</TableCell>
                <TableCell>{l.purpose}</TableCell>
                <TableCell className="text-right">{l.miles}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <EditMileageButton
                      mileageId={l.id}
                      date={l.date}
                      miles={l.miles}
                      purpose={l.purpose}
                      autoCaptured={l.autoCaptured}
                    />
                    <DeleteEntryButton id={l.id} kind="mileage" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

async function ReportsTab({ from, to }: { from: string; to: string }) {
  const { report, error } = await getFinanceReport(from, to);
  if (error || !report) {
    return <p className="py-8 text-center text-muted-foreground">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          A summary of what you&apos;ve recorded, ready to hand to your
          accountant. No tax amounts are calculated here.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={exportUrl("transactions", from, to)} download>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Transactions CSV
            </Button>
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(report.incomeCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCents(report.expenseTotalCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net (income − expenses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-bold",
                report.netCents < 0 && "text-destructive"
              )}
            >
              {formatCents(report.netCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {report.expensesByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No expenses in this range.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.expensesByCategory.map((c) => (
                  <TableRow key={c.category}>
                    <TableCell>{c.category}</TableCell>
                    <TableCell className="text-right">{c.count}</TableCell>
                    <TableCell className="text-right">
                      {formatCents(c.totalCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Marked deductible: {formatCents(report.deductibleExpenseCents)} of{" "}
            {formatCents(report.expenseTotalCents)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mileage Deduction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.mileage.byYear.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No mileage logged in this range.
            </p>
          ) : (
            <>
              {report.mileage.byYear.map((line) => (
                <p key={line.year} className="text-sm">
                  {line.year}: {line.miles} miles
                  {line.rateCentsPerMile !== null ? (
                    <>
                      {" "}
                      × {line.rateCentsPerMile}¢/mile ={" "}
                      <span className="font-medium">
                        {formatCents(line.deductionCents!)}
                      </span>
                    </>
                  ) : (
                    <span className="text-destructive">
                      {" "}
                      — no IRS rate configured for {line.year}
                    </span>
                  )}
                </p>
              ))}
              <p className="text-sm font-medium">
                Total estimated deduction:{" "}
                {formatCents(report.mileage.totalDeductionCents)}
              </p>
              <p className="text-xs text-muted-foreground">
                Uses the IRS standard mileage rate for business use for each
                year (irs.gov). Your accountant decides how mileage is actually
                claimed.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        This report summarizes the income, expenses, and mileage recorded in
        Piano Finder for {from} to {to} so your accountant can work from it. It
        is not tax advice and does not calculate taxes owed. The transactions
        CSV has Date, Description, Amount, and Category columns — income
        positive, expenses negative, with IRS Schedule C or custom categories.
        Its first three columns match QuickBooks Online&apos;s bank-import
        format, so it can be uploaded there too (leave Category unmapped).
        QuickBooks does not support importing mileage, so use the mileage CSV
        from the Mileage tab.
      </p>
    </div>
  );
}
