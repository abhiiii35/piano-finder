"use client";

import { useRef, useState } from "react";
import { createMileageLog } from "@/actions/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const NO_BOOKING = "none";

export function MileageForm({
  bookings,
}: {
  bookings: { id: string; label: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [bookingId, setBookingId] = useState<string>(NO_BOOKING);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    if (bookingId !== NO_BOOKING) formData.set("bookingId", bookingId);

    const result = await createMileageLog(formData);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Mileage logged");
    formRef.current?.reset();
    setBookingId(NO_BOOKING);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Mileage</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="mileage-date">Date</Label>
            <Input id="mileage-date" name="date" type="date" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mileage-miles">Miles</Label>
            <Input
              id="mileage-miles"
              name="miles"
              inputMode="decimal"
              placeholder="24.6"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mileage-purpose">Purpose</Label>
            <Input
              id="mileage-purpose"
              name="purpose"
              placeholder="Round trip to client"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Related booking (optional)</Label>
            <Select value={bookingId} onValueChange={(v) => v && setBookingId(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_BOOKING}>None</SelectItem>
                {bookings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Mileage
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
