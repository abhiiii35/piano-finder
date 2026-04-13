"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createJob } from "@/actions/job";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function PostJobPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!session) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-foreground">
          Please sign in to post a job
        </p>
        <Button className="mt-4" onClick={() => router.push("/sign-in")}>
          Sign In
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createJob(formData);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Job posted!");
      router.push("/jobs");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Post a Job</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe what you need and set your budget
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Annual piano tuning - Steinway Model B"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <div className="relative">
                <select
                  id="serviceType"
                  name="serviceType"
                  required
                  className="w-full appearance-none rounded-lg border border-border bg-card py-2.5 pl-3 pr-8 text-sm text-foreground focus:border-border focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select a service</option>
                  <option value="Tuning">Tuning</option>
                  <option value="Repair">Repair</option>
                  <option value="Regulation">Regulation</option>
                  <option value="Voicing">Voicing</option>
                  <option value="Appraisal">Appraisal</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Describe your piano, its condition, and what you need..."
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="200"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" placeholder="Boston" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="MA"
                  maxLength={2}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? "Posting..." : "Post Job"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
