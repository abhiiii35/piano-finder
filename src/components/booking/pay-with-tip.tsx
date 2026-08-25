"use client";

import { useState } from "react";
import { createCheckoutSession } from "@/actions/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents, toCents } from "@/lib/utils";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

type TipPreset = "none" | "10" | "15" | "20" | "custom";

function redirectTo(url: string) {
  window.location.href = url;
}

const PRESETS: { key: TipPreset; label: string }[] = [
  { key: "none", label: "No tip" },
  { key: "10", label: "10%" },
  { key: "15", label: "15%" },
  { key: "20", label: "20%" },
  { key: "custom", label: "Custom" },
];

export function PayWithTipButton({
  bookingId,
  totalCents,
}: {
  bookingId: string;
  totalCents: number;
}) {
  const [preset, setPreset] = useState<TipPreset>("none");
  const [customDollars, setCustomDollars] = useState("");
  const [loading, setLoading] = useState(false);

  const tipCents =
    preset === "none"
      ? 0
      : preset === "custom"
        ? Math.min(Math.max(toCents(Number(customDollars) || 0), 0), totalCents)
        : Math.round((totalCents * Number(preset)) / 100);

  async function handlePay() {
    setLoading(true);
    const result = await createCheckoutSession(bookingId, tipCents);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else if (result.url) {
      redirectTo(result.url);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">Add a tip for your technician?</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.key}
              type="button"
              size="sm"
              variant={preset === p.key ? "default" : "outline"}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={customDollars}
              onChange={(e) => setCustomDollars(e.target.value)}
              className="w-28"
              placeholder="0.00"
            />
          </div>
        )}
        {tipCents > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Tip: {formatCents(tipCents)} · Total: {formatCents(totalCents + tipCents)}
          </p>
        )}
      </div>
      <Button onClick={handlePay} disabled={loading}>
        <CreditCard className="mr-2 h-4 w-4" />
        {loading ? "Processing..." : "Pay Now"}
      </Button>
    </div>
  );
}
