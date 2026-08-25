import { describe, it, expect } from "vitest";
import { Image } from "@react-pdf/renderer";
import { InvoicePDF, type InvoiceData } from "@/components/invoice/invoice-pdf";

// react-pdf elements are plain React elements ({ type, props }) — no DOM/PDF
// renderer needed to check render logic (which nodes/text are present).
function hasElementType(node: unknown, type: unknown): boolean {
  if (node == null || typeof node !== "object") return false;
  if ((node as { type?: unknown }).type === type) return true;
  const children = (node as { props?: { children?: unknown } }).props
    ?.children;
  if (Array.isArray(children)) {
    return children.some((c) => hasElementType(c, type));
  }
  return hasElementType(children, type);
}

function collectStrings(node: unknown, acc: string[] = []): string[] {
  if (node == null) return acc;
  if (typeof node === "string" || typeof node === "number") {
    acc.push(String(node));
    return acc;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectStrings(n, acc));
    return acc;
  }
  if (typeof node === "object" && "props" in (node as object)) {
    collectStrings((node as { props?: { children?: unknown } }).props?.children, acc);
  }
  return acc;
}

const baseData: InvoiceData = {
  bookingId: "booking-12345678",
  date: new Date(2026, 3, 15),
  technician: {
    name: "Mike Smith",
    email: "mike@example.com",
  },
  customer: {
    name: "Jane Doe",
    email: "jane@example.com",
  },
  services: [{ name: "Standard Tuning", durationMin: 90, priceCents: 17500 }],
  totalCents: 17500,
  isPaid: true,
};

describe("InvoicePDF render logic", () => {
  it("omits the logo image when technician.logoUrl is not set", () => {
    const element = InvoicePDF({ data: baseData });
    expect(hasElementType(element, Image)).toBe(false);
  });

  it("renders a logo image when technician.logoUrl is set", () => {
    const element = InvoicePDF({
      data: { ...baseData, technician: { ...baseData.technician, logoUrl: "https://cdn.example.com/logo.png" } },
    });
    expect(hasElementType(element, Image)).toBe(true);
  });

  it("hides the tip row when tipCents is 0 or unset", () => {
    const element = InvoicePDF({ data: baseData });
    const text = collectStrings(element).join(" ");
    expect(text).not.toContain("Tip");
    expect(text).not.toContain("Subtotal");
  });

  it("shows a tip row and the tip-inclusive total when tipCents > 0", () => {
    const element = InvoicePDF({ data: { ...baseData, tipCents: 500 } });
    const text = collectStrings(element).join(" ");
    expect(text).toContain("Tip");
    expect(text).toContain("Subtotal");
    expect(text).toContain("$175.00"); // subtotal
    expect(text).toContain("$5.00"); // tip
    expect(text).toContain("$180.00"); // total incl. tip
  });
});
