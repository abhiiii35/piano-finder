"use client";

export function PrintInvoiceButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
    >
      Print Invoice
    </button>
  );
}
