"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Star,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Piano as PianoIcon,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateCustomerRecord, deleteCustomerRecord } from "@/actions/customer-record";
import { createContact, updateContact, deleteContact } from "@/actions/contact";
import {
  createServiceLocation,
  updateServiceLocation,
  deleteServiceLocation,
} from "@/actions/service-location";
import { createPiano } from "@/actions/piano";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
};

type ServiceLocation = {
  id: string;
  label: string;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  isPrimary: boolean;
};

type Piano = {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  serialNumber: string | null;
  roomLocation: string | null;
  tuningFrequencyMonths: number;
  serviceLocation: { label: string } | null;
};

export type CustomerRecordDetail = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  pianoMake: string | null;
  pianoModel: string | null;
  serialNumber: string | null;
  pianoLocation: string | null;
  notes: string | null;
  billingAddressLine1: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;
  contacts: Contact[];
  serviceLocations: ServiceLocation[];
  pianos: Piano[];
};

// Every field the customerRecord update action validates. Any panel that
// edits a subset of these must submit the rest unchanged, or it would wipe
// them out (they're all optional on the wire, so an absent field saves null).
function buildRecordFormData(
  record: CustomerRecordDetail,
  overrides: Record<string, string>
): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    customerName: record.customerName,
    customerEmail: record.customerEmail ?? "",
    customerPhone: record.customerPhone ?? "",
    pianoMake: record.pianoMake ?? "",
    pianoModel: record.pianoModel ?? "",
    serialNumber: record.serialNumber ?? "",
    pianoLocation: record.pianoLocation ?? "",
    notes: record.notes ?? "",
    billingAddressLine1: record.billingAddressLine1 ?? "",
    billingCity: record.billingCity ?? "",
    billingState: record.billingState ?? "",
    billingZip: record.billingZip ?? "",
    ...overrides,
  };
  for (const [key, value] of Object.entries(base)) fd.set(key, value);
  return fd;
}

export function CustomerDetailTabs({ record }: { record: CustomerRecordDetail }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteRecord() {
    if (!confirm(`Delete ${record.customerName}? This cannot be undone.`)) return;
    setDeleting(true);
    await deleteCustomerRecord(record.id);
    toast.success("Customer record deleted");
    router.push("/dashboard/technician/customers");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{record.customerName}</h1>
        <Button variant="destructive" size="sm" onClick={handleDeleteRecord} disabled={deleting}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="pianos">Pianos</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewPanel record={record} />
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <ContactsPanel record={record} />
        </TabsContent>
        <TabsContent value="locations" className="mt-4">
          <LocationsPanel record={record} />
        </TabsContent>
        <TabsContent value="pianos" className="mt-4">
          <PianosPanel record={record} />
        </TabsContent>
        <TabsContent value="billing" className="mt-4">
          <BillingPanel record={record} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NotesPanel record={record} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────

function OverviewPanel({ record }: { record: CustomerRecordDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const formData = buildRecordFormData(record, {
      customerName: String(fd.get("customerName") ?? ""),
      customerEmail: String(fd.get("customerEmail") ?? ""),
      customerPhone: String(fd.get("customerPhone") ?? ""),
    });
    const result = await updateCustomerRecord(record.id, formData);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Contact info updated");
    setEditing(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contact Info</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
          <Pencil className="mr-2 h-4 w-4" />
          {editing ? "Cancel" : "Edit"}
        </Button>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
        ) : (
          <div className="space-y-2 text-sm">
            {record.customerPhone && (
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href={`tel:${record.customerPhone}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-4 w-4" /> {record.customerPhone}
                </a>
                <a
                  href={`sms:${record.customerPhone}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <MessageSquare className="h-4 w-4" /> Text
                </a>
              </div>
            )}
            {record.customerEmail && (
              <a
                href={`mailto:${record.customerEmail}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Mail className="h-4 w-4" /> {record.customerEmail}
              </a>
            )}
            {!record.customerPhone && !record.customerEmail && (
              <p className="text-muted-foreground">No contact info on file.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Contacts ────────────────────────────────────────────────

function ContactsPanel({ record }: { record: CustomerRecordDetail }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  function openCreate() {
    setEditingContact(null);
    setDialogOpen(true);
  }
  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setDialogOpen(true);
  }

  async function handleDelete(contactId: string) {
    if (!confirm("Delete this contact?")) return;
    const result = await deleteContact(contactId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Contact deleted");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contacts</CardTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Contact
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {record.contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No additional contacts yet.</p>
        ) : (
          record.contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-start justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{contact.name}</p>
                  {contact.isPrimary && (
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 fill-current" /> Primary
                    </Badge>
                  )}
                  {contact.role && (
                    <span className="text-xs text-muted-foreground">{contact.role}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="hover:text-foreground">
                      {contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="hover:text-foreground">
                      {contact.email}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(contact)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(contact.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customerRecordId={record.id}
        contact={editingContact}
      />
    </Card>
  );
}

function ContactDialog({
  open,
  onOpenChange,
  customerRecordId,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerRecordId: string;
  contact: Contact | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const result = contact
      ? await updateContact(contact.id, formData)
      : await createContact(customerRecordId, formData);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(contact ? "Contact updated" : "Contact added");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>
        <form key={contact?.id ?? "new"} onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="contact-name">Name *</Label>
            <Input id="contact-name" name="name" defaultValue={contact?.name ?? ""} required />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                defaultValue={contact?.email ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" name="phone" defaultValue={contact?.phone ?? ""} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact-role">Role</Label>
            <Input
              id="contact-role"
              name="role"
              placeholder="e.g. Facilities manager"
              defaultValue={contact?.role ?? ""}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPrimary"
              defaultChecked={contact?.isPrimary ?? false}
              className="h-4 w-4 accent-primary"
            />
            Primary contact
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Locations ───────────────────────────────────────────────

function LocationsPanel({ record }: { record: CustomerRecordDetail }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ServiceLocation | null>(null);

  function openCreate() {
    setEditingLocation(null);
    setDialogOpen(true);
  }
  function openEdit(location: ServiceLocation) {
    setEditingLocation(location);
    setDialogOpen(true);
  }

  async function handleDelete(locationId: string) {
    if (!confirm("Delete this location?")) return;
    const result = await deleteServiceLocation(locationId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Location deleted");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Service Locations</CardTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Location
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {record.serviceLocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No service locations yet.</p>
        ) : (
          record.serviceLocations.map((location) => (
            <div
              key={location.id}
              className="flex items-start justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{location.label}</p>
                  {location.isPrimary && (
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 fill-current" /> Primary
                    </Badge>
                  )}
                </div>
                {(location.addressLine1 || location.city) && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {[location.addressLine1, location.city, location.state, location.zipCode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(location)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(location.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
      <LocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customerRecordId={record.id}
        location={editingLocation}
      />
    </Card>
  );
}

function LocationDialog({
  open,
  onOpenChange,
  customerRecordId,
  location,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerRecordId: string;
  location: ServiceLocation | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const result = location
      ? await updateServiceLocation(location.id, formData)
      : await createServiceLocation(customerRecordId, formData);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(location ? "Location updated" : "Location added");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{location ? "Edit Location" : "Add Location"}</DialogTitle>
        </DialogHeader>
        <form key={location?.id ?? "new"} onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="location-label">Label *</Label>
            <Input
              id="location-label"
              name="label"
              placeholder="e.g. Home, Sanctuary, Recital hall"
              defaultValue={location?.label ?? ""}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location-address">Address</Label>
            <Input
              id="location-address"
              name="addressLine1"
              defaultValue={location?.addressLine1 ?? ""}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="location-city">City</Label>
              <Input id="location-city" name="city" defaultValue={location?.city ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location-state">State</Label>
              <Input id="location-state" name="state" defaultValue={location?.state ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location-zip">Zip</Label>
              <Input id="location-zip" name="zipCode" defaultValue={location?.zipCode ?? ""} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPrimary"
              defaultChecked={location?.isPrimary ?? false}
              className="h-4 w-4 accent-primary"
            />
            Primary location
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pianos ──────────────────────────────────────────────────

function PianosPanel({ record }: { record: CustomerRecordDetail }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pianos</CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Piano
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {record.pianos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pianos on file yet.</p>
        ) : (
          record.pianos.map((piano) => (
            <Link
              key={piano.id}
              href={`/dashboard/technician/customers/${record.id}/pianos/${piano.id}`}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <PianoIcon className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {[piano.make, piano.model, piano.year ? `(${piano.year})` : null]
                    .filter(Boolean)
                    .join(" ") || "Piano"}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {piano.serialNumber && <span>SN {piano.serialNumber}</span>}
                  {piano.serviceLocation && (
                    <Badge variant="outline">{piano.serviceLocation.label}</Badge>
                  )}
                  <Badge variant="outline">every {piano.tuningFrequencyMonths} months</Badge>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
      <AddPianoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customerRecordId={record.id}
        serviceLocations={record.serviceLocations}
      />
    </Card>
  );
}

function AddPianoDialog({
  open,
  onOpenChange,
  customerRecordId,
  serviceLocations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerRecordId: string;
  serviceLocations: ServiceLocation[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const result = await createPiano(customerRecordId, formData);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Piano added");
    onOpenChange(false);
    router.push(`/dashboard/technician/customers/${customerRecordId}/pianos/${result.piano!.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Piano</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="piano-make">Make</Label>
              <Input id="piano-make" name="make" placeholder="Steinway" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="piano-model">Model</Label>
              <Input id="piano-model" name="model" placeholder="Model B" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="piano-year">Year</Label>
              <Input id="piano-year" name="year" inputMode="numeric" placeholder="1998" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="piano-serial">Serial Number</Label>
              <Input id="piano-serial" name="serialNumber" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="piano-room">Room Location</Label>
              <Input id="piano-room" name="roomLocation" placeholder="Living room" />
            </div>
          </div>
          {serviceLocations.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="piano-service-location">Service Location</Label>
              <select
                id="piano-service-location"
                name="serviceLocationId"
                defaultValue=""
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="">None</option>
                {serviceLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="piano-tuning-frequency">Tuning Frequency (months)</Label>
            <Input
              id="piano-tuning-frequency"
              name="tuningFrequencyMonths"
              inputMode="numeric"
              defaultValue="6"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="damppChaserInstalled"
              className="h-4 w-4 accent-primary"
            />
            Dampp-Chaser installed
          </label>
          <div className="grid gap-2">
            <Label htmlFor="piano-notes">Notes</Label>
            <Textarea id="piano-notes" name="notes" rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Piano"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Billing ─────────────────────────────────────────────────

function BillingPanel({ record }: { record: CustomerRecordDetail }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const formData = buildRecordFormData(record, {
      billingAddressLine1: String(fd.get("billingAddressLine1") ?? ""),
      billingCity: String(fd.get("billingCity") ?? ""),
      billingState: String(fd.get("billingState") ?? ""),
      billingZip: String(fd.get("billingZip") ?? ""),
    });
    const result = await updateCustomerRecord(record.id, formData);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Billing address updated");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Address</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billingAddressLine1">Address</Label>
            <Input
              id="billingAddressLine1"
              name="billingAddressLine1"
              defaultValue={record.billingAddressLine1 ?? ""}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="billingCity">City</Label>
              <Input id="billingCity" name="billingCity" defaultValue={record.billingCity ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingState">State</Label>
              <Input
                id="billingState"
                name="billingState"
                defaultValue={record.billingState ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingZip">Zip</Label>
              <Input id="billingZip" name="billingZip" defaultValue={record.billingZip ?? ""} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Used on invoices when set; otherwise the service address is used.
          </p>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Notes ───────────────────────────────────────────────────

function NotesPanel({ record }: { record: CustomerRecordDetail }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const formData = buildRecordFormData(record, {
      notes: String(fd.get("notes") ?? ""),
    });
    const result = await updateCustomerRecord(record.id, formData);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Notes updated");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea id="notes" name="notes" rows={5} defaultValue={record.notes ?? ""} />
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
