import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline, type TimelineEntry } from "@/components/records/timeline";
import { TrendCharts, type TrendRecord } from "@/components/records/trend-charts";
import { ServiceRecordForm } from "@/components/records/service-record-form";
import { DEFAULT_QUICK_LOG_PRESETS, parseHistoryViewPrefs } from "@/lib/service-history";
import { ArrowLeft } from "lucide-react";

function parsePhotos(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default async function PianoDetailPage({
  params,
}: {
  params: Promise<{ id: string; pianoId: string }>;
}) {
  const { id: customerRecordId, pianoId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  const piano = await prisma.piano.findUnique({
    where: { id: pianoId },
    include: {
      customerRecord: true,
      serviceRecords: { orderBy: { date: "desc" } },
    },
  });

  if (!piano || piano.customerRecord.technicianId !== profile.id || piano.customerRecordId !== customerRecordId) {
    notFound();
  }

  const historyPrefs = parseHistoryViewPrefs(profile.historyViewPrefs);
  const quickLogPresets = [...DEFAULT_QUICK_LOG_PRESETS, ...historyPrefs.quickLogPresets];

  const sortedRecords =
    historyPrefs.order === "oldest"
      ? [...piano.serviceRecords].sort((a, b) => a.date.getTime() - b.date.getTime())
      : piano.serviceRecords; // already desc from the query

  const entries: TimelineEntry[] = sortedRecords.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    source: r.source as TimelineEntry["source"],
    bookingId: r.bookingId,
    workPerformed: r.workPerformed,
    pitchOffsetCents: r.pitchOffsetCents,
    humidityPct: r.humidityPct,
    temperatureF: r.temperatureF,
    recommendations: r.recommendations,
    notes: r.notes,
    photos: parsePhotos(r.photos),
    clientVisible: r.clientVisible,
  }));

  const trendRecords: TrendRecord[] = [...piano.serviceRecords]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((r) => ({
      date: r.date.toISOString(),
      humidityPct: r.humidityPct,
      pitchOffsetCents: r.pitchOffsetCents,
      temperatureF: r.temperatureF,
    }));

  // Environment alert reflects the true latest reading, independent of the
  // technician's display-order preference.
  const latestWithHumidity = piano.serviceRecords
    .filter((r) => r.humidityPct != null)
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  const latestHumidity = latestWithHumidity?.humidityPct ?? null;
  const humidityAlert =
    latestHumidity != null && (latestHumidity < 40 || latestHumidity > 60)
      ? latestHumidity < 40
        ? `Last reading ${latestHumidity}% — dry environment can destabilize tuning. Consider humidity control.`
        : `Last reading ${latestHumidity}% — humid environment can destabilize tuning. Consider humidity control.`
      : null;

  const title = [piano.make, piano.model].filter(Boolean).join(" ") || "Piano";

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/technician/customers/${customerRecordId}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {piano.customerRecord.customerName}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
            {title}
            {piano.year && <span className="text-muted-foreground">· {piano.year}</span>}
            {piano.damppChaserInstalled && <Badge variant="secondary">Dampp-Chaser</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          {piano.serialNumber && <span>SN: {piano.serialNumber}</span>}
          {piano.roomLocation && <span>{piano.roomLocation}</span>}
          <span>Tuned every {piano.tuningFrequencyMonths} months</span>
        </CardContent>
      </Card>

      {humidityAlert && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {humidityAlert}
        </div>
      )}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="add-entry">Add entry</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Timeline
            entries={entries}
            show={historyPrefs.show}
            role="technician"
            pianoId={piano.id}
            quickLogPresets={quickLogPresets}
          />
        </TabsContent>

        <TabsContent value="add-entry" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <ServiceRecordForm pianoId={piano.id} quickLogPresets={quickLogPresets} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          {trendRecords.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No readings logged yet. Add an entry with humidity, pitch, or temperature to see trends here.
            </p>
          ) : (
            <TrendCharts records={trendRecords} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
