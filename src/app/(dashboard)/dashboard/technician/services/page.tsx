"use client";

import { useEffect, useState } from "react";
import { createService, updateService, deleteService } from "@/actions/technician";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMin: number;
  isActive: boolean;
};

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/technician/services")
      .then((r) => r.json())
      .then((data) => setServices(data.services ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const result = editingService
      ? await updateService(editingService.id, formData)
      : await createService(formData);

    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(editingService ? "Service updated" : "Service created");
      setDialogOpen(false);
      setEditingService(null);
      router.refresh();
      // Refresh the list
      fetch("/api/technician/services")
        .then((r) => r.json())
        .then((data) => setServices(data.services ?? []));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this service?")) return;
    await deleteService(id);
    toast.success("Service deleted");
    setServices((s) => s.filter((svc) => svc.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="mt-1 text-muted-foreground">
            Manage the services you offer to customers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingService(null);
        }}>
          <DialogTrigger>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "New Service"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editingService?.name ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingService?.description ?? ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={
                      editingService
                        ? (editingService.priceCents / 100).toFixed(2)
                        : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationMin">Duration (min)</Label>
                  <Input
                    id="durationMin"
                    name="durationMin"
                    type="number"
                    min="15"
                    step="15"
                    required
                    defaultValue={editingService?.durationMin ?? ""}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : editingService ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8">
        {services.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            No services yet. Add your first service to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((svc) => (
                <TableRow key={svc.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{svc.name}</p>
                      {svc.description && (
                        <p className="text-sm text-muted-foreground">
                          {svc.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>${(svc.priceCents / 100).toFixed(2)}</TableCell>
                  <TableCell>{svc.durationMin} min</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingService(svc);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(svc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
