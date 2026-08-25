"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EditMileageDialog } from "./edit-mileage-dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";

interface EditMileageButtonProps {
  mileageId: string;
  date: Date;
  miles: number;
  purpose: string;
  autoCaptured?: boolean;
}

export function EditMileageButton({
  mileageId,
  date,
  miles,
  purpose,
  autoCaptured,
}: EditMileageButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        {autoCaptured && (
          <Badge variant="secondary" className="text-xs">
            Auto
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          aria-label="Edit mileage"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      <EditMileageDialog
        open={open}
        onOpenChange={setOpen}
        mileageId={mileageId}
        initialDate={date}
        initialMiles={miles}
        initialPurpose={purpose}
      />
    </>
  );
}
