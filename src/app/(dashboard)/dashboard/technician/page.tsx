import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { CalendarDays, Clock, DollarSign, Star } from "lucide-react";
import { BookingFilter } from "@/components/dashboard/booking-filter";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { formatCents } from "@/lib/utils";
import Link from "next/link";
import { Calendar, type CalendarBooking } from "@/components/dashboard/calendar";

export default async function TechnicianDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string; view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  // Stats queries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [todayCount, pendingCount, revenueAgg, reviewAgg] =
    await Promise.all([
      prisma.booking.count({
        where: {
          technicianId: profile.id,
          scheduledAt: { gte: todayStart, lte: todayEnd },
          status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        },
      }),
      prisma.booking.count({
        where: { technicianId: profile.id, status: "PENDING" },
      }),
      prisma.payment.aggregate({
        _sum: { amountCents: true },
        where: {
          status: "SUCCEEDED",
          booking: { technicianId: profile.id },
        },
      }),
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: true,
        where: { booking: { technicianId: profile.id } },
      }),
    ]);

  const totalRevenue = revenueAgg._sum.amountCents ?? 0;
  const avgRating = reviewAgg._avg.rating
    ? reviewAgg._avg.rating.toFixed(1)
    : "0.0";
  const reviewCount = reviewAgg._count;

  // Tab content
  const activeTab = params.tab ?? "bookings";
  const filter = params.filter ?? "upcoming";

  const calendarView = (params.view ?? "week") as "day" | "week" | "month";
  const calendarDate = params.date ? new Date(params.date) : new Date();

  // Bookings for the tab
  let dateStart: Date;
  let dateEnd: Date;
  if (calendarView === "day") {
    dateStart = new Date(calendarDate);
    dateStart.setHours(0, 0, 0, 0);
    dateEnd = new Date(calendarDate);
    dateEnd.setHours(23, 59, 59, 999);
  } else if (calendarView === "week") {
    dateStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
    dateEnd = endOfWeek(calendarDate, { weekStartsOn: 1 });
  } else {
    const ms = startOfMonth(calendarDate);
    dateStart = startOfWeek(ms, { weekStartsOn: 1 });
    const me = endOfMonth(calendarDate);
    dateEnd = endOfWeek(me, { weekStartsOn: 1 });
  }

  const statusFilter: Record<string, string[]> = {
    upcoming: ["CONFIRMED", "PENDING", "IN_PROGRESS"],
    completed: ["COMPLETED"],
    cancelled: ["CANCELLED"],
    all: ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  };

  const tabBookings: CalendarBooking[] =
    activeTab === "bookings"
      ? (
          await prisma.booking.findMany({
            where: {
              technicianId: profile.id,
              scheduledAt: { gte: dateStart, lte: dateEnd },
              status: { in: statusFilter[filter] ?? statusFilter.upcoming },
            },
            include: {
              customer: { select: { name: true, email: true } },
              services: { include: { service: true } },
            },
            orderBy: { scheduledAt: "asc" },
          })
        ).map((b) => ({
          id: b.id,
          scheduledAt: b.scheduledAt.toISOString(),
          durationMin: b.durationMin,
          status: b.status,
          customerName: b.customer.name ?? b.customer.email ?? "Customer",
          serviceName: b.services.map((s) => s.service.name).join(", "),
          totalCents: b.totalCents,
        }))
      : [];

  // Customers for tab
  const tabCustomers =
    activeTab === "customers"
      ? await prisma.customerRecord.findMany({
          where: { technicianId: profile.id },
          orderBy: { updatedAt: "desc" },
          take: 20,
        })
      : [];

  const tabs = [
    { key: "bookings", label: "Bookings" },
    { key: "customers", label: "Customers" },
    { key: "invoices", label: "Invoices" },
    { key: "revenue", label: "Revenue" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {session.user.name}
          </p>
        </div>
        <Link
          href="/dashboard/technician/profile"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          View Profile
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={todayCount}
          subtitle="appointments"
          icon={CalendarDays}
          iconClassName="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Pending"
          value={pendingCount}
          subtitle="to confirm"
          icon={Clock}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Revenue"
          value={formatCents(totalRevenue)}
          subtitle="total earned"
          icon={DollarSign}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Rating"
          value={avgRating}
          subtitle={`${reviewCount} reviews`}
          icon={Star}
          iconClassName="bg-amber-50 text-amber-500"
        />
      </div>

      {/* Tabs */}
      <div className="mt-8 flex items-center gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/technician?tab=${tab.key}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "bookings" && (
          <>
            <BookingFilter currentFilter={filter} />
            <Calendar
              bookings={tabBookings}
              initialDate={format(calendarDate, "yyyy-MM-dd")}
              initialView={calendarView}
            />
          </>
        )}

        {activeTab === "customers" && (
          <>
            {tabCustomers.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <CalendarDays className="h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm text-slate-500">
                  No customer records yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tabCustomers.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/technician/customers/${c.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm">
                      <div>
                        <p className="font-medium text-slate-900">
                          {c.customerName}
                        </p>
                        <p className="text-sm text-slate-500">
                          {[c.customerEmail, c.pianoMake]
                            .filter(Boolean)
                            .join(" - ")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "invoices" && (
          <div className="flex flex-col items-center py-16 text-center">
            <DollarSign className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">
              Invoices are available on individual booking pages
            </p>
          </div>
        )}

        {activeTab === "revenue" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900">Revenue Summary</h3>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {formatCents(totalRevenue)}
              </p>
              <p className="text-sm text-slate-500">
                total earned
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
