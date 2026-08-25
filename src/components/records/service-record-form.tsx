"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceRecord, updateServiceRecord } from "@/actions/service-record";
import { uploadPhoto, deletePhoto } from "@/actions/photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ImagePlus, X, Loader2 } from "lucide-react";

const MAX_PHOTOS = 8;

function toLocalDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type EditableServiceRecord = {
  id: string;
  date: string; // ISO
  workPerformed: string | null;
  pitchOffsetCents: number | null;
  humidityPct: number | null;
  temperatureF: number | null;
  recommendations: string | null;
  notes: string | null;
  photos: string[];
  clientVisible: boolean;
};

type UploadedPhoto = { url: string; publicId: string | null };

export function ServiceRecordForm({
  pianoId,
  quickLogPresets,
  record,
  onSaved,
}: {
  pianoId: string;
  quickLogPresets: string[];
  record?: EditableServiceRecord;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [workPerformed, setWorkPerformed] = useState(record?.workPerformed ?? "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>(
    (record?.photos ?? []).map((url) => ({ url, publicId: null }))
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    setUploading(true);
    for (const file of Array.from(files).slice(0, remaining)) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("folder", "service-records");
      const result = await uploadPhoto(fd);
      if (result.error) toast.error(result.error);
      else if (result.url) setPhotos((prev) => [...prev, { url: result.url!, publicId: result.publicId ?? null }]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemovePhoto(photo: UploadedPhoto) {
    setPhotos((prev) => prev.filter((p) => p.url !== photo.url));
    if (photo.publicId) await deletePhoto(photo.publicId);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("workPerformed", workPerformed);
    fd.set("photosJson", JSON.stringify(photos.map((p) => p.url)));

    const result = record
      ? await updateServiceRecord(record.id, fd)
      : await createServiceRecord(pianoId, fd);

    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(record ? "Entry updated" : "Entry added");
    router.refresh();
    if (record) {
      onSaved?.();
    } else {
      e.currentTarget.reset();
      setWorkPerformed("");
      setPhotos([]);
      onSaved?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Quick log</Label>
        <div className="flex flex-wrap gap-2">
          {quickLogPresets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setWorkPerformed(preset)}
              className="rounded-full border border-input px-3 py-1 text-xs hover:bg-muted"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            max={toLocalDateInputValue(new Date())}
            defaultValue={
              record ? toLocalDateInputValue(new Date(record.date)) : toLocalDateInputValue(new Date())
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workPerformed">Work performed</Label>
          <Input
            id="workPerformed"
            name="workPerformed"
            value={workPerformed}
            onChange={(e) => setWorkPerformed(e.target.value)}
            placeholder="e.g. Tuned to A440"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="pitchOffsetCents">Pitch offset (cents)</Label>
          <Input
            id="pitchOffsetCents"
            name="pitchOffsetCents"
            type="number"
            step="1"
            min={-200}
            max={200}
            defaultValue={record?.pitchOffsetCents ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="humidityPct">Humidity (%)</Label>
          <Input
            id="humidityPct"
            name="humidityPct"
            type="number"
            step="1"
            min={0}
            max={100}
            defaultValue={record?.humidityPct ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="temperatureF">Temperature (°F)</Label>
          <Input
            id="temperatureF"
            name="temperatureF"
            type="number"
            step="1"
            min={20}
            max={120}
            defaultValue={record?.temperatureF ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recommendations">Recommendations (client-visible)</Label>
        <Textarea
          id="recommendations"
          name="recommendations"
          rows={2}
          defaultValue={record?.recommendations ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Internal notes (never shown to clients)</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={record?.notes ?? ""} />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="hideFromClient"
          name="hideFromClient"
          type="checkbox"
          defaultChecked={record ? !record.clientVisible : false}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="hideFromClient" className="font-normal">
          Hide this entry from the client entirely
        </Label>
      </div>

      <div className="space-y-2">
        <Label>Photos</Label>
        <div className="flex flex-wrap gap-3">
          {photos.map((photo) => (
            <div key={photo.url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="Service record attachment" className="h-20 w-20 rounded-md border object-cover" />
              <button
                type="button"
                onClick={() => handleRemovePhoto(photo)}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <Button type="submit" disabled={loading || uploading}>
        {loading ? "Saving..." : record ? "Save changes" : "Add entry"}
      </Button>
    </form>
  );
}
