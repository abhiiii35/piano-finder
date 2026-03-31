"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitForReview } from "@/actions/onboarding";
import { toast } from "sonner";

export function SubmitForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    const result = await submitForReview();
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile submitted for review!");
      router.push("/dashboard/technician");
    }
  }

  return (
    <Button onClick={handleSubmit} className="w-full" disabled={loading}>
      {loading ? "Submitting..." : "Submit for Review"}
    </Button>
  );
}
