import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseClientViewPrefs, nextDueLabel } from "@/lib/service-history";
import { buildClientTimelineEntries } from "@/lib/client-timeline";
import { Timeline } from "@/components/records/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CustomerPianosPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CUSTOMER") redirect("/dashboard");

  if (!session.user.email) {
    return (
      <div>
        <h1 className="text-2xl font-bold">My Pianos</h1>
        <p className="mt-8 text-center text-muted-foreground">
          Add an email to your account to see piano history technicians have logged for you.
        </p>
      </div>
    );
  }

  const customerRecords = await prisma.customerRecord.findMany({
    where: { customerEmail: session.user.email },
    include: {
      technician: { select: { businessName: true, clientViewPrefs: true, user: { select: { name: true } } } },
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

  const groups = await Promise.all(
    customerRecords.map(async (record) => {
      const clientPrefs = parseClientViewPrefs(record.technician.clientViewPrefs);
      const pianos = await Promise.all(
        record.pianos.map(async (piano) => {
          const entries = await buildClientTimelineEntries(piano.serviceRecords, clientPrefs);
          const lastServiceDate = piano.serviceRecords.reduce<Date | null>(
            (latest, r) => (!latest || r.date > latest ? r.date : latest),
            null
          );
          return { piano, entries, dueLabel: nextDueLabel(lastServiceDate, piano.tuningFrequencyMonths) };
        })
      );
      return {
        technicianName: record.technician.businessName || record.technician.user.name || "Your technician",
        clientPrefs,
        pianos,
      };
    })
  );

  const hasAnyPiano = groups.some((g) => g.pianos.length > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Pianos</h1>

      {!hasAnyPiano ? (
        <p className="py-12 text-center text-muted-foreground">
          No piano history yet. Once a technician logs a service visit, it will show up here.
        </p>
      ) : (
        groups.map(
          (group) =>
            group.pianos.length > 0 && (
              <div key={group.technicianName} className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground">Serviced by {group.technicianName}</h2>
                {group.pianos.map(({ piano, entries, dueLabel }) => (
                  <Card key={piano.id}>
                    <CardHeader>
                      <CardTitle>{[piano.make, piano.model].filter(Boolean).join(" ") || "Piano"}</CardTitle>
                      {dueLabel && <p className="text-sm text-muted-foreground">{dueLabel}</p>}
                    </CardHeader>
                    <CardContent>
                      <Timeline entries={entries} show={group.clientPrefs.show} role="client" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
        )
      )}
    </div>
  );
}
