"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export type RunResult = {
  created: number;
  merged: number;
  failed: { row: number; reason: string }[];
};

export function ResultsStep({ result }: { result: RunResult }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-4 py-3">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
        <p>
          Added <strong>{result.created}</strong> new customer{result.created === 1 ? "" : "s"} and
          updated <strong>{result.merged}</strong> existing{" "}
          {result.merged === 1 ? "record" : "records"}.
        </p>
      </div>

      {result.failed.length > 0 && (
        <div>
          <p className="font-medium text-destructive">
            {result.failed.length} row{result.failed.length === 1 ? "" : "s"} could not be
            imported:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {result.failed.map((f) => (
              <li key={f.row}>
                Row {f.row}: {f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href="/dashboard/technician/customers">
        <Button>Go to Customers</Button>
      </Link>
    </div>
  );
}
