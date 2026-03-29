import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { CalendarDays, DollarSign, Star, Users } from "lucide-react";

export default async function TechnicianDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      bookings: {
        where: { status: { in: ["CONFIRMED", "PENDING"] } },
      },
      customerRecords: true,
    },
  });

  if (!profile) redirect("/dashboard");

  const reviews = await prisma.review.findMany({
    where: { booking: { technicianId: profile.id } },
  });

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "N/A";

  const completedBookings = await prisma.booking.findMany({
    where: { technicianId: profile.id, status: "COMPLETED" },
    include: { payment: true },
  });

  const totalRevenue = completedBookings.reduce(
    (sum, b) => sum + (b.payment?.amountCents ?? 0),
    0
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Welcome back, {session.user.name}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Upcoming Bookings"
          value={profile.bookings.length}
          icon={CalendarDays}
        />
        <StatCard
          label="Total Revenue"
          value={`$${(totalRevenue / 100).toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard label="Avg Rating" value={avgRating} icon={Star} />
        <StatCard
          label="Customers"
          value={profile.customerRecords.length}
          icon={Users}
        />
      </div>
    </div>
  );
}
