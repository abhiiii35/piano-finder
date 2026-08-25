import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { optimizeRoute } from "@/lib/route-optimize";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, MapPin, Clock, Navigation } from "lucide-react";
import Link from "next/link";

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function RoutePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  // Default to today
  const today = new Date();
  const dateStr = params.date ?? formatDateForInput(today);
  const selectedDate = parseLocalDate(dateStr);

  // Load non-cancelled bookings for this day
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      technicianId: profile.id,
      scheduledAt: {
        gte: dayStart,
        lt: dayEnd,
      },
      status: { not: "CANCELLED" },
    },
    include: { customer: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  // Optimize route if we have a home base
  let optimized = null;
  let noHomeBase = false;

  if (!profile.latitude || !profile.longitude) {
    noHomeBase = true;
  } else {
    optimized = optimizeRoute(
      { lat: profile.latitude, lng: profile.longitude },
      bookings.map((b) => ({
        id: b.id,
        lat: b.latitude,
        lng: b.longitude,
      }))
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Route Planner</h1>
        <p className="mt-1 text-muted-foreground">
          Optimize your stops for the day. Nearest-neighbor algorithm.
        </p>
      </div>

      {/* Date picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex items-end gap-2">
            <div className="grid gap-1 flex-1 max-w-sm">
              <label htmlFor="route-date" className="text-xs text-muted-foreground">
                Date
              </label>
              <Input
                id="route-date"
                name="date"
                type="date"
                defaultValue={dateStr}
                className="w-full"
              />
            </div>
            <Button type="submit" variant="outline">
              Load
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* No home base warning */}
      {noHomeBase && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">Missing home base address</p>
                <p className="text-amber-700 mt-1">
                  Complete your profile address to optimize routes.{" "}
                  <Link href="/dashboard/technician/profile" className="underline hover:no-underline">
                    Go to profile
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No bookings */}
      {bookings.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              No bookings scheduled for {format(selectedDate, "MMMM d, yyyy")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Route summary and stops */}
      {bookings.length > 0 && optimized && (
        <>
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Navigation className="h-4 w-4" />
                Route Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Total distance:</span>
                  <span className="ml-2 font-medium">{optimized.totalMiles} miles</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Estimated driving time:</span>
                  <span className="ml-2 font-medium">~{optimized.totalMinutes} min</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stops list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Optimized Stop Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimized.order.map((bookingId, idx) => {
                  const booking = bookings.find((b) => b.id === bookingId)!;
                  const leg = optimized.legs[idx];
                  const nextLeg = optimized.legs[idx + 1];

                  return (
                    <div key={bookingId} className="pb-4 border-b last:border-b-0 last:pb-0">
                      <div className="flex gap-4">
                        <div className="text-2xl font-bold text-primary w-10 text-center">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {format(booking.scheduledAt, "h:mm a")} —{" "}
                            {booking.customer.name || "Customer"}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>
                              {booking.addressLine1}, {booking.city}, {booking.state} {booking.zipCode}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {leg ? `${leg.miles} mi from ${leg.fromId ? "previous stop" : "home"}` : ""}
                            </span>
                          </div>
                          {nextLeg && nextLeg.toId !== "home" && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {nextLeg.miles} mi to next stop
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-14">
                        <Link
                          href={`/dashboard/technician/bookings?bookingId=${bookingId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View booking details →
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* Return home */}
                <div className="pt-4 border-t">
                  <div className="flex gap-4">
                    <div className="text-2xl font-bold text-muted-foreground w-10 text-center">
                      ↵
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-muted-foreground">Return to home base</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {optimized.legs[optimized.legs.length - 1]?.miles} mi from last stop
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unrouted stops */}
          {optimized.unrouted.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Unrouted Stops
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-800 mb-3">
                  These bookings are missing coordinates and weren&apos;t included in the route optimization:
                </p>
                <ul className="space-y-2">
                  {optimized.unrouted.map((id) => {
                    const booking = bookings.find((b) => b.id === id);
                    return (
                      <li key={id} className="text-sm">
                        <span className="font-medium">{format(booking!.scheduledAt, "h:mm a")}</span>
                        {" — "}
                        {booking!.customer.name || "Customer"}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
