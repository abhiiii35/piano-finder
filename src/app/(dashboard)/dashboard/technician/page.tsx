import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, DollarSign, Star } from "lucide-react";
import { BookingFilter } from "@/components/dashboard/booking-filter";
import { format } from "date-fns";
import { formatCents } from "@/lib/utils";
import Link from "next/link";

export default async function TechnicianDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string }>;
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

  const [todayBookings, pendingBookings, completedBookings, reviews] =
    await Promise.all([
      prisma.booking.findMany({
        where: {
          technicianId: profile.id,
          scheduledAt: { gte: todayStart, lte: todayEnd },
          status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        },
      }),
      prisma.booking.findMany({
        where: { technicianId: profile.id, status: "PENDING" },
      }),
      prisma.booking.findMany({
        where: { technicianId: profile.id, status: "COMPLETED" },
        include: { payment: true },
      }),
      prisma.review.findMany({
        where: { booking: { technicianId: profile.id } },
      }),
    ]);

  const totalRevenue = completedBookings.reduce(
    (sum, b) => sum + (b.payment?.amountCents ?? 0),
    0
  );
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "0.0";

  // Tab content
  const activeTab = params.tab ?? "bookings";
  const filter = params.filter ?? "upcoming";

  // Bookings for the tab
  const bookingStatusFilter: Record<string, string[]> = {
    upcoming: ["CONFIRMED", "PENDING"],
    completed: ["COMPLETED"],
    cancelled: ["CANCELLED"],
    all: ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  };

  const tabBookings =
    activeTab === "bookings"
      ? await prisma.booking.findMany({
          where: {
            technicianId: profile.id,
            status: { in: bookingStatusFilter[filter] ?? bookingStatusFilter.upcoming },
          },
          include: {
            customer: { select: { name: true, email: true } },
            services: { include: { service: true } },
          },
          orderBy: { scheduledAt: filter === "completed" ? "desc" : "asc" },
          take: 20,
        })
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
          value={todayBookings.length}
          subtitle="appointments"
          icon={CalendarDays}
          iconClassName="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Pending"
          value={pendingBookings.length}
          subtitle="to confirm"
          icon={Clock}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Revenue"
          value={`$${(totalRevenue / 100).toFixed(0)}`}
          subtitle="total earned"
          icon={DollarSign}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Rating"
          value={avgRating}
          subtitle={`${reviews.length} reviews`}
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
            {/* Filter dropdown */}
            <BookingFilter currentFilter={filter} />

            {tabBookings.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <CalendarDays className="h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm text-slate-500">
                  No bookings in this category
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tabBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/dashboard/technician/bookings/${booking.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">
                          {booking.customer.name ?? booking.customer.email}
                        </p>
                        <p className="text-sm text-slate-500">
                          {format(
                            new Date(booking.scheduledAt),
                            "MMM d, yyyy 'at' h:mm a"
                          )}
                        </p>
                        <p className="text-xs text-slate-400">
                          {booking.services
                            .map((s) => s.service.name)
                            .join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCents(booking.totalCents)}
                        </span>
                        <Badge
                          className={
                            booking.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : booking.status === "CONFIRMED"
                                ? "bg-blue-100 text-blue-700"
                                : booking.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                          }
                        >
                          {booking.status.toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
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
                ${(totalRevenue / 100).toFixed(2)}
              </p>
              <p className="text-sm text-slate-500">
                from {completedBookings.length} completed booking
                {completedBookings.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
