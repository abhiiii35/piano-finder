"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerRecord } from "@/actions/customer-record";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createCustomerRecord(formData);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Customer record created");
      router.push("/dashboard/technician/customers");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">New Customer Record</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Name *</Label>
              <Input id="customerName" name="customerName" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input id="customerEmail" name="customerEmail" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input id="customerPhone" name="customerPhone" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Piano Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pianoMake">Make</Label>
                <Input id="pianoMake" name="pianoMake" placeholder="Steinway" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pianoModel">Model</Label>
                <Input id="pianoModel" name="pianoModel" placeholder="Model B" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" name="serialNumber" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pianoLocation">Piano Location</Label>
              <Input
                id="pianoLocation"
                name="pianoLocation"
                placeholder="Living room, 2nd floor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Service history, condition notes..."
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Record"}
        </Button>
      </form>
    </div>
  );
}
