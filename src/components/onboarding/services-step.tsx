"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createService, updateService, deleteService } from "@/actions/technician";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMin: number;
  isActive: boolean;
};

type Props = {
  initialServices: Service[];
  onComplete: () => void;
  loading: boolean;
};

export function ServicesStep({ initialServices, onComplete, loading }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  async function refreshServices() {
    const res = await fetch("/api/technician/services");
    const data = await res.json();
    setServices(data.services ?? []);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);

    const result = editingService
      ? await updateService(editingService.id, formData)
      : await createService(formData);

    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(editingService ? "Service updated" : "Service added");
      setDialogOpen(false);
      setEditingService(null);
      await refreshServices();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this service?")) return;
    await deleteService(id);
    toast.success("Service deleted");
    setServices((s) => s.filter((svc) => svc.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Review your services below. You can add, edit, or remove them.
        </p>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingService(null);
        }}>
          <DialogTrigger>
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input id="name" name="name" required defaultValue={editingService?.name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={editingService?.description ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input id="price" name="price" type="number" step="0.01" min="0" required
                    defaultValue={editingService ? (editingService.priceCents / 100).toFixed(2) : ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationMin">Duration (min)</Label>
                  <Input id="durationMin" name="durationMin" type="number" min="15" step="15" required
                    defaultValue={editingService?.durationMin ?? ""} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : editingService ? "Update" : "Add Service"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No services yet. Add at least one service.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => (
            <div key={svc.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <p className="font-medium text-foreground">{svc.name}</p>
                {svc.description && <p className="text-sm text-muted-foreground">{svc.description}</p>}
                <p className="mt-1 text-sm text-muted-foreground">
                  ${(svc.priceCents / 100).toFixed(2)} &middot; {svc.durationMin} min
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => { setEditingService(svc); setDialogOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(svc.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button onClick={onComplete} className="w-full" disabled={services.length === 0 || loading}>
        {loading ? "Finishing..." : "Complete Setup"}
      </Button>
    </div>
  );
}
