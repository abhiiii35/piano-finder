import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/utils";
import {
  monthlyRevenue,
  monthsOfHistory,
  yoyGrowth,
  revenueByServiceType,
  avgJobValue,
  seasonality,
  profitMarginTrend,
  repeatClientRate,
  avgClientTenureMonths,
  clientLifetimeValue,
  revenueByCity,
  slippingAway,
  type RevenuePayment,
} from "@/lib/insights";
import {
  RevenueTrendChart,
  MarginTrendChart,
  RevenueByServiceChart,
  SeasonalityChart,
} from "@/components/insights/insight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FALLBACK_FREQUENCY_MONTHS = 6; // matches src/actions/reminders.ts's convention for multi/no-piano records

function formatPercent(v: number | null): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

export default async function InsightsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  const technicianId = profile.id;
  const now = new Date();

  const [rawPayments, bookingServiceRows, services, expenses, bookings, customerRecords, completedForSlipping] =
    await Promise.all([
      prisma.payment.findMany({
        where: { booking: { technicianId } },
        select: {
          amountCents: true,
          tipCents: true,
          status: true,
          method: true,
          booking: { select: { scheduledAt: true, city: true, customerId: true } },
        },
      }),
      prisma.bookingService.findMany({
        where: { booking: { technicianId } },
        select: {
          serviceId: true,
          priceCents: true,
          booking: { select: { payment: { select: { status: true, method: true } } } },
        },
      }),
      prisma.service.findMany({ where: { technicianId }, select: { id: true, name: true } }),
      prisma.expense.findMany({ where: { technicianId }, select: { amountCents: true, date: true } }),
      prisma.booking.findMany({
        where: { technicianId },
        select: { customerId: true, status: true, scheduledAt: true },
      }),
      prisma.customerRecord.findMany({
        where: { technicianId },
        select: {
          id: true,
          customerName: true,
          customerEmail: true,
          pianos: { select: { tuningFrequencyMonths: true } },
        },
      }),
      prisma.booking.findMany({
        where: { technicianId, status: "COMPLETED" },
        select: { scheduledAt: true, customer: { select: { email: true } } },
      }),
    ]);

  const revenuePayments: RevenuePayment[] = rawPayments.map((p) => ({
    amountCents: p.amountCents,
    tipCents: p.tipCents,
    status: p.status,
    method: p.method,
    date: p.booking.scheduledAt,
  }));

  const history = monthsOfHistory(revenuePayments);
  if (history < 3) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Business Insights</h1>
        <p className="mt-6 text-muted-foreground">
          Not enough history yet — insights fill in as you complete bookings.
        </p>
      </div>
    );
  }

  const monthly = monthlyRevenue(revenuePayments, now);
  const yoy = yoyGrowth(revenuePayments, now);
  const avgJob = avgJobValue(revenuePayments);
  const byService = revenueByServiceType(
    bookingServiceRows.map((bs) => ({
      serviceId: bs.serviceId,
      priceCents: bs.priceCents,
      paymentStatus: bs.booking.payment?.status ?? "",
      paymentMethod: bs.booking.payment?.method ?? null,
    })),
    services
  );
  const bySeason = seasonality(revenuePayments);
  const margin = profitMarginTrend(revenuePayments, expenses, now);

  const repeatRate = repeatClientRate(
    bookings.map((b) => ({ customerKey: b.customerId, status: b.status }))
  );
  const tenure = avgClientTenureMonths(
    bookings
      .filter((b) => b.status === "COMPLETED")
      .map((b) => ({ customerKey: b.customerId, completedAt: b.scheduledAt }))
  );
  const clv = clientLifetimeValue(
    rawPayments.map((p) => ({
      amountCents: p.amountCents,
      tipCents: p.tipCents,
      status: p.status,
      method: p.method,
      date: p.booking.scheduledAt,
      customerKey: p.booking.customerId,
    }))
  );
  const byCity = revenueByCity(
    rawPayments.map((p) => ({
      amountCents: p.amountCents,
      tipCents: p.tipCents,
      status: p.status,
      method: p.method,
      date: p.booking.scheduledAt,
      city: p.booking.city,
    }))
  );

  const lastCompletedByEmail = new Map<string, Date>();
  for (const b of completedForSlipping) {
    const email = b.customer.email?.toLowerCase();
    if (!email) continue;
    const existing = lastCompletedByEmail.get(email);
    if (!existing || b.scheduledAt > existing) lastCompletedByEmail.set(email, b.scheduledAt);
  }
  const slippingRows = customerRecords.flatMap((c) => {
    const email = c.customerEmail?.toLowerCase();
    const lastCompleted = email ? lastCompletedByEmail.get(email) : undefined;
    if (!lastCompleted) return [];
    const frequencyMonths =
      c.pianos.length === 1 ? c.pianos[0].tuningFrequencyMonths : FALLBACK_FREQUENCY_MONTHS;
    return [{ id: c.id, customerName: c.customerName, lastCompleted, frequencyMonths }];
  });
  const slipping = slippingAway(slippingRows, now);

  const statTiles = [
    { label: "Revenue (12 mo)", value: formatCents(monthly.reduce((s, m) => s + m.revenueCents, 0)) },
    { label: "YoY growth", value: formatPercent(yoy) },
    { label: "Avg job value", value: avgJob == null ? "—" : formatCents(avgJob) },
    { label: "Repeat client rate", value: repeatRate == null ? "—" : `${(repeatRate * 100).toFixed(0)}%` },
    { label: "Avg client value", value: clv == null ? "—" : formatCents(clv) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Insights</h1>
        <p className="mt-1 text-muted-foreground">
          How your business is trending — revenue, seasonality, and client retention.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statTiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader>
              <CardTitle className="text-xs font-medium text-muted-foreground">{tile.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueTrendChart data={monthly} />
        <RevenueByServiceChart data={byService} />
        <SeasonalityChart data={bySeason} />
        <MarginTrendChart data={margin} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by city</CardTitle>
        </CardHeader>
        <CardContent>
          {byCity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not enough history yet — insights fill in as you complete bookings.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCity.map((c) => (
                  <TableRow key={c.city}>
                    <TableCell>{c.city}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.bookingCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCents(c.revenueCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clients slipping away</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Customers overdue for their next tuning based on their piano&apos;s usual frequency. Check the{" "}
            <Link href="/dashboard/technician/reminders" className="text-primary hover:underline">
              Reminders queue
            </Link>{" "}
            to send them a nudge.
          </p>
          {slipping.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients are overdue right now.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Last completed</TableHead>
                  <TableHead className="text-right">Months overdue</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {slipping.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.customerName}</TableCell>
                    <TableCell>{format(s.lastCompleted, "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.monthsOverdue.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/technician/customers/${s.id}`}
                        className="text-primary hover:underline"
                      >
                        View record
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Average client tenure: {tenure == null ? "—" : `${tenure.toFixed(1)} months`}.
      </p>
    </div>
  );
}
