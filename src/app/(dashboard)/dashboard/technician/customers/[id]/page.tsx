"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  updateCustomerRecord,
  deleteCustomerRecord,
} from "@/actions/customer-record";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type CustomerRecord = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  pianoMake: string | null;
  pianoModel: string | null;
  serialNumber: string | null;
  pianoLocation: string | null;
  notes: string | null;
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [record, setRecord] = useState<CustomerRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/technician/customers/${params.id}`)
      .then((r) => r.json())
      .then((data) => setRecord(data.record));
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateCustomerRecord(params.id as string, formData);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Record updated");
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this customer record?")) return;
    await deleteCustomerRecord(params.id as string);
    toast.success("Record deleted");
    router.push("/dashboard/technician/customers");
  }

  if (!record) return <p>Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Customer Record</h1>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Name *</Label>
              <Input
                id="customerName"
                name="customerName"
                defaultValue={record.customerName}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  defaultValue={record.customerEmail ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  name="customerPhone"
                  defaultValue={record.customerPhone ?? ""}
                />
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
                <Input
                  id="pianoMake"
                  name="pianoMake"
                  defaultValue={record.pianoMake ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pianoModel">Model</Label>
                <Input
                  id="pianoModel"
                  name="pianoModel"
                  defaultValue={record.pianoModel ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  name="serialNumber"
                  defaultValue={record.serialNumber ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pianoLocation">Piano Location</Label>
              <Input
                id="pianoLocation"
                name="pianoLocation"
                defaultValue={record.pianoLocation ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={record.notes ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
