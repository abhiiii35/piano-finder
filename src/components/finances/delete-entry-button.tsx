"use client";

import { useState } from "react";
import { deleteExpense, deleteMileageLog } from "@/actions/expense";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteEntryButton({
  id,
  kind,
}: {
  id: string;
  kind: "expense" | "mileage";
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result =
      kind === "expense" ? await deleteExpense(id) : await deleteMileageLog(id);
    setDeleting(false);
    if (result.success) {
      toast.success(kind === "expense" ? "Expense deleted" : "Mileage log deleted");
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
      aria-label="Delete entry"
    >
      {deleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
