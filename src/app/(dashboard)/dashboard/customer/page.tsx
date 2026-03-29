import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { CalendarDays, Clock, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CustomerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CUSTOMER") redirect("/dashboard");

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
  });

  const upcoming = bookings.filter(
    (b) => b.status === "CONFIRMED" || b.status === "PENDING"
  );
  const completed = bookings.filter((b) => b.status === "COMPLETED");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Welcome back, {session.user.name}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          subtitle="bookings"
          icon={CalendarDays}
          iconClassName="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Completed"
          value={completed.length}
          subtitle="past bookings"
          icon={Clock}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Total"
          value={bookings.length}
          subtitle="all bookings"
          icon={CalendarDays}
          iconClassName="bg-blue-50 text-blue-600"
        />
      </div>

      <div className="mt-8">
        <Link href="/search">
          <Button>
            <Search className="mr-2 h-4 w-4" />
            Find a Piano Tuner
          </Button>
        </Link>
      </div>
    </div>
  );
}
