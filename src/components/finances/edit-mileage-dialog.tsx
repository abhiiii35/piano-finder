"use client";

import { useState } from "react";
import { updateMileageLog } from "@/actions/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface EditMileageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mileageId: string;
  initialDate: Date;
  initialMiles: number;
  initialPurpose: string;
}

export function EditMileageDialog({
  open,
  onOpenChange,
  mileageId,
  initialDate,
  initialMiles,
  initialPurpose,
}: EditMileageDialogProps) {
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(format(initialDate, "yyyy-MM-dd"));
  const [miles, setMiles] = useState(String(initialMiles));
  const [purpose, setPurpose] = useState(initialPurpose);

  async function handleSave() {
    setSaving(true);
    const result = await updateMileageLog(mileageId, { date, miles, purpose });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Mileage updated");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Mileage Log</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-date">Date</Label>
            <Input
              id="edit-date"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-miles">Miles</Label>
            <Input
              id="edit-miles"
              name="miles"
              inputMode="decimal"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-purpose">Purpose</Label>
            <Input
              id="edit-purpose"
              name="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
