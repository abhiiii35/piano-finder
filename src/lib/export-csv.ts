// CSV builders for the "download everything" full data export. Every row
// carries the ids needed to re-import or cross-reference. Timestamps use
// full ISO 8601 (UTC) so re-import is unambiguous regardless of timezone.
//
// Deliberately excluded: shareToken / calendarToken and any other secret
// link — those are access credentials, not data the export is for.

import { toCsv, centsToDollarString } from "@/lib/finance/csv";

function iso(date: Date): string {
  return date.toISOString();
}

export type CustomerExportRow = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  billingAddressLine1: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;
  pianoMake: string | null;
  pianoModel: string | null;
  serialNumber: string | null;
  pianoLocation: string | null;
  createdAt: Date;
};

export function customersCsv(rows: CustomerExportRow[]): string {
  return toCsv([
    [
      "ID",
      "Customer Name",
      "Email",
      "Phone",
      "Notes",
      "Billing Address Line 1",
      "Billing City",
      "Billing State",
      "Billing Zip",
      "Legacy Piano Make",
      "Legacy Piano Model",
      "Legacy Serial Number",
      "Legacy Piano Location",
      "Created At",
    ],
    ...rows.map((r) => [
      r.id,
      r.customerName,
      r.customerEmail ?? "",
      r.customerPhone ?? "",
      r.notes ?? "",
      r.billingAddressLine1 ?? "",
      r.billingCity ?? "",
      r.billingState ?? "",
      r.billingZip ?? "",
      r.pianoMake ?? "",
      r.pianoModel ?? "",
      r.serialNumber ?? "",
      r.pianoLocation ?? "",
      iso(r.createdAt),
    ]),
  ]);
}

export type PianoExportRow = {
  id: string;
  customerRecordId: string;
  serviceLocationId: string | null;
  type: string | null;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
  year: number | null;
  roomLocation: string | null;
  tuningFrequencyMonths: number;
  damppChaserInstalled: boolean;
  notes: string | null;
  createdAt: Date;
};

export function pianosCsv(rows: PianoExportRow[]): string {
  return toCsv([
    [
      "ID",
      "Customer Record ID",
      "Service Location ID",
      "Type",
      "Make",
      "Model",
      "Serial Number",
      "Year",
      "Room Location",
      "Tuning Frequency (months)",
      "Dampp-Chaser Installed",
      "Notes",
      "Created At",
    ],
    ...rows.map((r) => [
      r.id,
      r.customerRecordId,
      r.serviceLocationId ?? "",
      r.type ?? "",
      r.make ?? "",
      r.model ?? "",
      r.serialNumber ?? "",
      r.year != null ? String(r.year) : "",
      r.roomLocation ?? "",
      String(r.tuningFrequencyMonths),
      r.damppChaserInstalled ? "Yes" : "No",
      r.notes ?? "",
      iso(r.createdAt),
    ]),
  ]);
}

export type ContactExportRow = {
  id: string;
  customerRecordId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
  createdAt: Date;
};

export function contactsCsv(rows: ContactExportRow[]): string {
  return toCsv([
    ["ID", "Customer Record ID", "Name", "Email", "Phone", "Role", "Is Primary", "Created At"],
    ...rows.map((r) => [
      r.id,
      r.customerRecordId,
      r.name,
      r.email ?? "",
      r.phone ?? "",
      r.role ?? "",
      r.isPrimary ? "Yes" : "No",
      iso(r.createdAt),
    ]),
  ]);
}

export type LocationExportRow = {
  id: string;
  customerRecordId: string;
  label: string;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  isPrimary: boolean;
  createdAt: Date;
};

export function locationsCsv(rows: LocationExportRow[]): string {
  return toCsv([
    [
      "ID",
      "Customer Record ID",
      "Label",
      "Address Line 1",
      "City",
      "State",
      "Zip",
      "Is Primary",
      "Created At",
    ],
    ...rows.map((r) => [
      r.id,
      r.customerRecordId,
      r.label,
      r.addressLine1 ?? "",
      r.city ?? "",
      r.state ?? "",
      r.zipCode ?? "",
      r.isPrimary ? "Yes" : "No",
      iso(r.createdAt),
    ]),
  ]);
}

export type ServiceHistoryExportRow = {
  id: string;
  pianoId: string;
  technicianId: string;
  bookingId: string | null;
  date: Date;
  workPerformed: string | null;
  pitchOffsetCents: number | null;
  humidityPct: number | null;
  temperatureF: number | null;
  recommendations: string | null;
  notes: string | null;
  source: string;
  clientVisible: boolean;
  createdAt: Date;
};

export function serviceHistoryCsv(rows: ServiceHistoryExportRow[]): string {
  return toCsv([
    [
      "ID",
      "Piano ID",
      "Technician ID",
      "Booking ID",
      "Date",
      "Work Performed",
      "Pitch Offset (cents)",
      "Humidity %",
      "Temperature F",
      "Recommendations",
      "Notes",
      "Source",
      "Client Visible",
      "Created At",
    ],
    ...rows.map((r) => [
      r.id,
      r.pianoId,
      r.technicianId,
      r.bookingId ?? "",
      iso(r.date),
      r.workPerformed ?? "",
      r.pitchOffsetCents != null ? String(r.pitchOffsetCents) : "",
      r.humidityPct != null ? String(r.humidityPct) : "",
      r.temperatureF != null ? String(r.temperatureF) : "",
      r.recommendations ?? "",
      r.notes ?? "",
      r.source,
      r.clientVisible ? "Yes" : "No",
      iso(r.createdAt),
    ]),
  ]);
}

export type BookingExportRow = {
  id: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  scheduledAt: Date;
  durationMin: number;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  pianoType: string | null;
  pianoMake: string | null;
  pianoModel: string | null;
  notes: string | null;
  serviceNames: string[];
  totalCents: number;
  createdAt: Date;
};

export function bookingsCsv(rows: BookingExportRow[]): string {
  return toCsv([
    [
      "ID",
      "Customer ID",
      "Customer Name",
      "Customer Email",
      "Status",
      "Scheduled At",
      "Duration (min)",
      "Address Line 1",
      "Address Line 2",
      "City",
      "State",
      "Zip",
      "Piano Type",
      "Piano Make",
      "Piano Model",
      "Notes",
      "Services",
      "Total",
      "Created At",
    ],
    ...rows.map((r) => [
      r.id,
      r.customerId,
      r.customerName ?? "",
      r.customerEmail ?? "",
      r.status,
      iso(r.scheduledAt),
      String(r.durationMin),
      r.addressLine1,
      r.addressLine2 ?? "",
      r.city,
      r.state,
      r.zipCode,
      r.pianoType ?? "",
      r.pianoMake ?? "",
      r.pianoModel ?? "",
      r.notes ?? "",
      r.serviceNames.join(" + "),
      centsToDollarString(r.totalCents),
      iso(r.createdAt),
    ]),
  ]);
}
