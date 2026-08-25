"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { deleteServiceRecord } from "@/actions/service-record";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServiceRecordForm, type EditableServiceRecord } from "@/components/records/service-record-form";
import { formatCents } from "@/lib/utils";
import { Droplets, Thermometer, Music, Trash2, Pencil, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export type TimelineEntry = {
  id: string;
  date: string; // ISO
  source: "PLATFORM" | "MANUAL" | "IMPORT";
  bookingId?: string | null;
  workPerformed?: string | null;
  pitchOffsetCents?: number | null;
  humidityPct?: number | null;
  temperatureF?: number | null;
  recommendations?: string | null;
  notes?: string | null; // technician view only — never populated for client role
  photos: string[];
  clientVisible?: boolean;
  priceCents?: number | null; // client view only, PLATFORM entries
};

export type TimelineShow = {
  readings: boolean;
  photos: boolean;
  recommendations: boolean;
  internalNotes?: boolean;
  workPerformed?: boolean;
  prices?: boolean;
};

const SOURCE_LABEL: Record<TimelineEntry["source"], string> = {
  PLATFORM: "Booking",
  MANUAL: "Manual",
  IMPORT: "Imported",
};

export function Timeline({
  entries,
  show,
  role,
  pianoId,
  quickLogPresets,
}: {
  entries: TimelineEntry[];
  show: TimelineShow;
  role: "technician" | "client";
  pianoId?: string;
  quickLogPresets?: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TimelineEntry | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this service record? This can't be undone.")) return;
    const result = await deleteServiceRecord(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Entry deleted");
    router.refresh();
  }

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No service history yet{role === "technician" ? " — add your first entry above." : "."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const showWorkPerformed = show.workPerformed !== false && entry.workPerformed;
        const showRecommendations = show.recommendations && entry.recommendations;
        const showInternalNotes = role === "technician" && show.internalNotes && entry.notes;
        const showPhotos = show.photos && entry.photos.length > 0;
        const hasReadings =
          show.readings &&
          (entry.pitchOffsetCents != null || entry.humidityPct != null || entry.temperatureF != null);
        const showPrice = role === "client" && show.prices && entry.priceCents != null;
        const bookingHref =
          role === "technician"
            ? `/dashboard/technician/bookings/${entry.bookingId}`
            : `/dashboard/customer/bookings/${entry.bookingId}`;

        return (
          <Card key={entry.id}>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{format(new Date(entry.date), "MMMM d, yyyy")}</span>
                  <Badge variant="outline">{SOURCE_LABEL[entry.source]}</Badge>
                  {role === "technician" && entry.clientVisible === false && (
                    <Badge variant="secondary">Hidden from client</Badge>
                  )}
                </div>
                {role === "technician" && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(entry)} aria-label="Edit entry">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(entry.id)}
                      aria-label="Delete entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {showWorkPerformed && <p className="text-sm">{entry.workPerformed}</p>}

              {hasReadings && (
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {entry.pitchOffsetCents != null && (
                    <span className="flex items-center gap-1">
                      <Music className="h-3.5 w-3.5" />
                      {entry.pitchOffsetCents > 0 ? "+" : ""}
                      {entry.pitchOffsetCents}¢
                    </span>
                  )}
                  {entry.humidityPct != null && (
                    <span className="flex items-center gap-1">
                      <Droplets className="h-3.5 w-3.5" />
                      {entry.humidityPct}%
                    </span>
                  )}
                  {entry.temperatureF != null && (
                    <span className="flex items-center gap-1">
                      <Thermometer className="h-3.5 w-3.5" />
                      {entry.temperatureF}°F
                    </span>
                  )}
                </div>
              )}

              {showRecommendations && (
                <p className="rounded-md bg-muted/50 p-2 text-sm">
                  <span className="font-medium">Recommendation: </span>
                  {entry.recommendations}
                </p>
              )}

              {showInternalNotes && (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  <span className="font-medium">Internal: </span>
                  {entry.notes}
                </p>
              )}

              {showPrice && <p className="text-sm text-muted-foreground">Amount: {formatCents(entry.priceCents!)}</p>}

              {showPhotos && (
                <div className="flex flex-wrap gap-2">
                  {entry.photos.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="Service record attachment" className="h-16 w-16 rounded-md border object-cover" />
                  ))}
                </div>
              )}

              {entry.bookingId && (
                <Link href={bookingHref} className="flex items-center gap-1 text-xs text-muted-foreground underline">
                  <ExternalLink className="h-3 w-3" />
                  View booking
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })}

      {role === "technician" && pianoId && quickLogPresets && (
        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit entry</DialogTitle>
            </DialogHeader>
            {editing && (
              <ServiceRecordForm
                pianoId={pianoId}
                quickLogPresets={quickLogPresets}
                record={toEditableRecord(editing)}
                onSaved={() => setEditing(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function toEditableRecord(entry: TimelineEntry): EditableServiceRecord {
  return {
    id: entry.id,
    date: entry.date,
    workPerformed: entry.workPerformed ?? null,
    pitchOffsetCents: entry.pitchOffsetCents ?? null,
    humidityPct: entry.humidityPct ?? null,
    temperatureF: entry.temperatureF ?? null,
    recommendations: entry.recommendations ?? null,
    notes: entry.notes ?? null,
    photos: entry.photos,
    clientVisible: entry.clientVisible ?? true,
  };
}
