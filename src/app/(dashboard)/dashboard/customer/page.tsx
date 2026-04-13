import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalendarDays, Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default async function CustomerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CUSTOMER") redirect("/dashboard");

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    include: {
      technician: {
        select: {
          id: true,
          businessName: true,
          user: { select: { name: true } },
        },
      },
      services: {
        include: { service: { select: { name: true } } },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  const upcoming = bookings.filter(
    (b) => b.status === "CONFIRMED" || b.status === "PENDING"
  );
  const past = bookings
    .filter((b) => b.status === "COMPLETED")
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back, {session.user.name}
      </p>

      {/* Upcoming booking hero */}
      <div className="mt-8">
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((booking) => {
              const techName =
                booking.technician.businessName ||
                booking.technician.user.name ||
                "Technician";
              const techInitials = techName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const serviceName = booking.services
                .map((s) => s.service.name)
                .join(", ");
              const relativeTime = formatDistanceToNow(booking.scheduledAt, {
                addSuffix: true,
              });

              return (
                <div
                  key={booking.id}
                  className="rounded-xl border border-border border-l-4 border-l-accent bg-card p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {booking.status === "PENDING" ? "Pending" : "Upcoming"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                      {techInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">
                        {techName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {serviceName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.scheduledAt.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {booking.scheduledAt.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/customer/bookings/${booking.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">
              No upcoming appointments
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Find a technician and book your next tuning
            </p>
            <Link href="/search" className="mt-4 inline-block">
              <Button>
                <Search className="mr-2 h-4 w-4" />
                Find a Piano Tuner
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Past bookings with rebook */}
      {past.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Past Bookings
            </h2>
            <Link
              href="/dashboard/customer/bookings"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {past.map((booking) => {
              const techName =
                booking.technician.businessName ||
                booking.technician.user.name ||
                "Technician";
              const techInitials = techName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const serviceName = booking.services
                .map((s) => s.service.name)
                .join(", ");

              return (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-foreground">
                    {techInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{techName}</p>
                    <p className="text-sm text-muted-foreground">
                      {serviceName} &middot;{" "}
                      {booking.scheduledAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Link
                    href={`/technicians/${booking.technician.id}/book`}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
                  >
                    Rebook
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
