"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyToJob } from "@/actions/job";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export function ApplyButton({
  jobId,
  hasApplied,
}: {
  jobId: string;
  hasApplied: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (hasApplied) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        You&apos;ve applied to this job
      </div>
    );
  }

  async function handleApply() {
    setLoading(true);
    const result = await applyToJob(jobId, message || undefined);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Application submitted!");
      router.refresh();
    }
  }

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        className="bg-primary hover:bg-primary/90"
      >
        Apply to this Job
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="message">Message (optional)</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself and describe your relevant experience..."
            rows={3}
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleApply}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? "Submitting..." : "Submit Application"}
          </Button>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
