"use client";

import { useState } from "react";
import { emailInvoice } from "@/actions/invoice";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

export function EmailInvoiceButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await emailInvoice(bookingId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Invoice emailed to the customer.");
      }
    } catch {
      toast.error("Failed to send invoice email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline">
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Mail className="mr-2 h-4 w-4" />
      )}
      Email Invoice
    </Button>
  );
}
