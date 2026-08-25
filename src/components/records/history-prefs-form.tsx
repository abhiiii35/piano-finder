"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveHistoryViewPrefs, saveClientViewPrefs } from "@/actions/service-record";
import type { HistoryViewPrefs, ClientViewPrefs } from "@/lib/service-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";

export function HistoryPrefsForm({
  initialHistoryPrefs,
  initialClientPrefs,
  damppChaserStat,
}: {
  initialHistoryPrefs: HistoryViewPrefs;
  initialClientPrefs: ClientViewPrefs;
  damppChaserStat: { withDampChaser: number; withoutDampChaser: number } | null;
}) {
  const router = useRouter();
  const [historyPrefs, setHistoryPrefs] = useState(initialHistoryPrefs);
  const [clientPrefs, setClientPrefs] = useState(initialClientPrefs);
  const [newPreset, setNewPreset] = useState("");
  const [savingHistory, setSavingHistory] = useState(false);
  const [savingClient, setSavingClient] = useState(false);

  function addPreset() {
    const trimmed = newPreset.trim();
    if (!trimmed) return;
    if (historyPrefs.quickLogPresets.includes(trimmed)) {
      toast.error("That preset already exists");
      return;
    }
    setHistoryPrefs((prev) => ({ ...prev, quickLogPresets: [...prev.quickLogPresets, trimmed] }));
    setNewPreset("");
  }

  function removePreset(preset: string) {
    setHistoryPrefs((prev) => ({
      ...prev,
      quickLogPresets: prev.quickLogPresets.filter((p) => p !== preset),
    }));
  }

  async function handleSaveHistory() {
    setSavingHistory(true);
    const result = await saveHistoryViewPrefs(historyPrefs);
    setSavingHistory(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Timeline preferences saved");
    router.refresh();
  }

  async function handleSaveClient() {
    setSavingClient(true);
    const result = await saveClientViewPrefs(clientPrefs);
    setSavingClient(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Client view preferences saved");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your timeline view</CardTitle>
          <CardDescription>Controls how service history looks on your own piano pages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Order</Label>
            <Select
              value={historyPrefs.order}
              onValueChange={(v) => v && setHistoryPrefs((prev) => ({ ...prev, order: v as "newest" | "oldest" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ShowToggleRow
            label="Readings (pitch, humidity, temperature)"
            checked={historyPrefs.show.readings}
            onChange={(v) => setHistoryPrefs((prev) => ({ ...prev, show: { ...prev.show, readings: v } }))}
          />
          <ShowToggleRow
            label="Photos"
            checked={historyPrefs.show.photos}
            onChange={(v) => setHistoryPrefs((prev) => ({ ...prev, show: { ...prev.show, photos: v } }))}
          />
          <ShowToggleRow
            label="Recommendations"
            checked={historyPrefs.show.recommendations}
            onChange={(v) =>
              setHistoryPrefs((prev) => ({ ...prev, show: { ...prev.show, recommendations: v } }))
            }
          />
          <ShowToggleRow
            label="Internal notes"
            checked={historyPrefs.show.internalNotes}
            onChange={(v) => setHistoryPrefs((prev) => ({ ...prev, show: { ...prev.show, internalNotes: v } }))}
          />

          <div className="space-y-2">
            <Label>Quick-log presets</Label>
            <div className="flex flex-wrap gap-2">
              {historyPrefs.quickLogPresets.map((preset) => (
                <Badge key={preset} variant="secondary" className="gap-1">
                  {preset}
                  <button type="button" onClick={() => removePreset(preset)} aria-label={`Remove ${preset}`}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {historyPrefs.quickLogPresets.length === 0 && (
                <p className="text-sm text-muted-foreground">No custom presets yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newPreset}
                onChange={(e) => setNewPreset(e.target.value)}
                placeholder="e.g. Voicing touch-up"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPreset();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addPreset}>
                Add
              </Button>
            </div>
          </div>

          <Button onClick={handleSaveHistory} disabled={savingHistory}>
            {savingHistory ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What clients can see</CardTitle>
          <CardDescription>
            Applies to the customer dashboard and the client share page. Internal notes are never shown to
            clients, regardless of these settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ShowToggleRow
            label="Readings (pitch, humidity, temperature)"
            checked={clientPrefs.show.readings}
            onChange={(v) => setClientPrefs((prev) => ({ ...prev, show: { ...prev.show, readings: v } }))}
          />
          <ShowToggleRow
            label="Photos"
            checked={clientPrefs.show.photos}
            onChange={(v) => setClientPrefs((prev) => ({ ...prev, show: { ...prev.show, photos: v } }))}
          />
          <ShowToggleRow
            label="Recommendations"
            checked={clientPrefs.show.recommendations}
            onChange={(v) =>
              setClientPrefs((prev) => ({ ...prev, show: { ...prev.show, recommendations: v } }))
            }
          />
          <ShowToggleRow
            label="Work performed"
            checked={clientPrefs.show.workPerformed}
            onChange={(v) =>
              setClientPrefs((prev) => ({ ...prev, show: { ...prev.show, workPerformed: v } }))
            }
          />
          <ShowToggleRow
            label="Prices"
            checked={clientPrefs.show.prices}
            onChange={(v) => setClientPrefs((prev) => ({ ...prev, show: { ...prev.show, prices: v } }))}
          />

          <Button onClick={handleSaveClient} disabled={savingClient}>
            {savingClient ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>

      {damppChaserStat && (
        <Card>
          <CardHeader>
            <CardTitle>Dampp-Chaser impact</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Pianos with a Dampp-Chaser installed average{" "}
              <span className="font-medium text-foreground">{damppChaserStat.withDampChaser.toFixed(1)}¢</span>{" "}
              off pitch at each visit, vs.{" "}
              <span className="font-medium text-foreground">{damppChaserStat.withoutDampChaser.toFixed(1)}¢</span>{" "}
              for pianos without one.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ShowToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
