import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseClientViewPrefs, nextDueLabel } from "@/lib/service-history";
import { buildClientTimelineEntries } from "@/lib/client-timeline";
import { Timeline } from "@/components/records/timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MessageSquare, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Your piano page",
  robots: { index: false, follow: false },
};

export default async function ClientSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const customerRecord = await prisma.customerRecord.findUnique({
    where: { shareToken: token },
    include: {
      technician: { include: { user: { select: { name: true, email: true, phone: true } } } },
      pianos: {
        include: {
          serviceRecords: {
            select: {
              id: true,
              date: true,
              source: true,
              bookingId: true,
              workPerformed: true,
              pitchOffsetCents: true,
              humidityPct: true,
              temperatureF: true,
              recommendations: true,
              photos: true,
              clientVisible: true,
            },
          },
        },
      },
    },
  });

  if (!customerRecord) notFound();

  const { technician } = customerRecord;
  const businessName = technician.businessName || technician.user.name || "Your piano technician";
  const clientPrefs = parseClientViewPrefs(technician.clientViewPrefs);

  const pianos = await Promise.all(
    customerRecord.pianos.map(async (piano) => {
      const entries = await buildClientTimelineEntries(piano.serviceRecords, clientPrefs);
      const lastServiceDate = piano.serviceRecords.reduce<Date | null>(
        (latest, r) => (!latest || r.date > latest ? r.date : latest),
        null
      );
      return {
        piano,
        entries,
        dueLabel: nextDueLabel(lastServiceDate, piano.tuningFrequencyMonths),
      };
    })
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const customerEmail = customerRecord.customerEmail;
  const [unpaidBooking, reviewCandidate] = customerEmail
    ? await Promise.all([
        prisma.booking.findFirst({
          where: {
            technicianId: technician.id,
            status: "COMPLETED",
            customer: { email: customerEmail },
            payment: { status: "PENDING" },
          },
          orderBy: { scheduledAt: "desc" },
        }),
        prisma.booking.findFirst({
          where: {
            technicianId: technician.id,
            status: "COMPLETED",
            customer: { email: customerEmail },
            updatedAt: { gte: thirtyDaysAgo },
            review: null,
          },
          orderBy: { updatedAt: "desc" },
        }),
      ])
    : [null, null];

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">{businessName}</h1>
        <p className="text-muted-foreground">Piano service history for {customerRecord.customerName}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {technician.user.phone && (
          <>
            <a href={`tel:${technician.user.phone}`}>
              <Button variant="outline" size="sm">
                <Phone className="mr-2 h-4 w-4" />
                Call
              </Button>
            </a>
            <a href={`sms:${technician.user.phone}`}>
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                Text
              </Button>
            </a>
          </>
        )}
        {technician.user.email && (
          <a href={`mailto:${technician.user.email}`}>
            <Button variant="outline" size="sm">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
          </a>
        )}
      </div>

      {unpaidBooking && (
        <Card>
          <CardContent className="flex items-center justify-between pt-4">
            <p className="text-sm">You have an open invoice for your last appointment.</p>
            <Link href={`/dashboard/customer/bookings/${unpaidBooking.id}`}>
              <Button size="sm">Pay invoice</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {reviewCandidate && (
        <Card>
          <CardContent className="flex items-center justify-between pt-4">
            <p className="text-sm">How did your last appointment go?</p>
            <Link href={`/dashboard/customer/bookings/${reviewCandidate.id}/review`}>
              <Button size="sm" variant="outline">
                Leave a review
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {pianos.map(({ piano, entries, dueLabel }) => (
        <Card key={piano.id}>
          <CardHeader>
            <CardTitle>{[piano.make, piano.model].filter(Boolean).join(" ") || "Piano"}</CardTitle>
            {dueLabel && <p className="text-sm text-muted-foreground">{dueLabel}</p>}
          </CardHeader>
          <CardContent>
            <Timeline entries={entries} show={clientPrefs.show} role="client" />
          </CardContent>
        </Card>
      ))}

      <p className="border-t pt-4 text-center text-xs text-muted-foreground">
        Powered by{" "}
        <Link href="/" className="underline">
          Book A Piano Tuner
        </Link>{" "}
        — create an account to rebook online
      </p>
    </div>
  );
}
