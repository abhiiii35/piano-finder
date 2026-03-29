"use client";

import { useEffect, useState } from "react";
import { upsertAvailability } from "@/actions/technician";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type Slot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
};

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>(
    DAYS.map((_, i) => ({
      dayOfWeek: i,
      startTime: "09:00",
      endTime: "17:00",
      enabled: false,
    }))
  );
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/technician/availability")
      .then((r) => r.json())
      .then((data) => {
        if (data.slots) {
          setSlots((prev) =>
            prev.map((s) => {
              const existing = data.slots.find(
                (sl: { dayOfWeek: number }) => sl.dayOfWeek === s.dayOfWeek
              );
              return existing
                ? { ...s, ...existing, enabled: true }
                : s;
            })
          );
        }
      });
  }, []);

  async function handleSave(slot: Slot) {
    setSaving(slot.dayOfWeek);
    const formData = new FormData();
    formData.set("dayOfWeek", String(slot.dayOfWeek));
    formData.set("startTime", slot.startTime);
    formData.set("endTime", slot.endTime);
    formData.set("enabled", String(slot.enabled));

    const result = await upsertAvailability(formData);
    setSaving(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${DAYS[slot.dayOfWeek]} updated`);
    }
  }

  function updateSlot(index: number, updates: Partial<Slot>) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Availability</h1>
      <p className="mt-1 text-muted-foreground">
        Set your weekly availability for bookings
      </p>

      <div className="mt-8 space-y-4">
        {slots.map((slot, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-4">
              <Switch
                checked={slot.enabled}
                onCheckedChange={(checked) =>
                  updateSlot(i, { enabled: !!checked })
                }
              />
              <span className="w-28 font-medium">{DAYS[i]}</span>
              {slot.enabled ? (
                <>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`start-${i}`} className="sr-only">
                      Start
                    </Label>
                    <Input
                      id={`start-${i}`}
                      type="time"
                      value={slot.startTime}
                      onChange={(e) =>
                        updateSlot(i, { startTime: e.target.value })
                      }
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Label htmlFor={`end-${i}`} className="sr-only">
                      End
                    </Label>
                    <Input
                      id={`end-${i}`}
                      type="time"
                      value={slot.endTime}
                      onChange={(e) =>
                        updateSlot(i, { endTime: e.target.value })
                      }
                      className="w-32"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(slot)}
                    disabled={saving === slot.dayOfWeek}
                  >
                    {saving === slot.dayOfWeek ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">
                    Not available
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(slot)}
                    disabled={saving === slot.dayOfWeek}
                  >
                    Save
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
