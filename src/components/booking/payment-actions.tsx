"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCheckoutSession, markCashPayment } from "@/actions/payment";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, Banknote } from "lucide-react";

export function PayButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    const result = await createCheckoutSession(bookingId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else if (result.url) {
      window.location.href = result.url;
    }
  }

  return (
    <Button onClick={handlePay} disabled={loading}>
      <CreditCard className="mr-2 h-4 w-4" />
      {loading ? "Processing..." : "Pay Now"}
    </Button>
  );
}

export function MarkCashButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCash() {
    setLoading(true);
    const result = await markCashPayment(bookingId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Payment recorded");
      router.refresh();
    }
  }

  return (
    <Button variant="outline" onClick={handleCash} disabled={loading}>
      <Banknote className="mr-2 h-4 w-4" />
      {loading ? "Recording..." : "Mark as Cash"}
    </Button>
  );
}
