import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { PITCH_RAISE_LOW, PITCH_RAISE_HIGH, formatRange } from "@/lib/seo/city-cost-data";

export function PitchRaiseDisclosure() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/30 dark:bg-amber-900/10">
      <div className="flex gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Pitch raise may apply
          </p>
          <p className="text-amber-800 dark:text-amber-300">
            If your piano hasn&apos;t been tuned in 2+ years, a pitch raise
            service may be needed ({formatRange(PITCH_RAISE_LOW, PITCH_RAISE_HIGH)} extra).
            Your technician will confirm before starting work.{" "}
            <Link href="/piano-tuning-cost/pitch-raise" className="underline underline-offset-2">
              Learn why
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
