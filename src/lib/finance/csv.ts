// CSV builders for the finance exports. All money stays integer cents until
// the final string formatting here at the output boundary.

export function centsToDollarString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${dollars}.${String(remainder).padStart(2, "0")}`;
}

function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type IncomeLedgerRow = {
  date: Date;
  customerName: string;
  services: string;
  method: string;
  amountCents: number;
  tipCents: number;
};

export function incomeLedgerCsv(rows: IncomeLedgerRow[]): string {
  return toCsv([
    ["Date", "Customer", "Services", "Method", "Amount", "Tip", "Total"],
    ...rows.map((row) => [
      isoDate(row.date),
      row.customerName,
      row.services,
      row.method,
      centsToDollarString(row.amountCents),
      centsToDollarString(row.tipCents),
      centsToDollarString(row.amountCents + row.tipCents),
    ]),
  ]);
}

export type ExpenseLedgerRow = {
  date: Date;
  category: string;
  vendor: string | null;
  notes: string | null;
  deductible: boolean;
  receiptUrl: string | null;
  amountCents: number;
};

export function expenseLedgerCsv(rows: ExpenseLedgerRow[]): string {
  return toCsv([
    ["Date", "Category", "Vendor", "Notes", "Deductible", "Receipt URL", "Amount"],
    ...rows.map((row) => [
      isoDate(row.date),
      row.category,
      row.vendor ?? "",
      row.notes ?? "",
      row.deductible ? "Yes" : "No",
      row.receiptUrl ?? "",
      centsToDollarString(row.amountCents),
    ]),
  ]);
}

// Transactions CSV: Date, Description, Amount, Category.
//
// The first three columns follow Intuit's 3-column bank-transaction import
// format ("Format CSV files in Excel to get bank transactions into
// QuickBooks", L4BjLWckq_US_en_US; "Manually upload transactions",
// L0rE9OXBz_US_en_US): MM/DD/YYYY dates, positive Amount = money in,
// negative = money out, plain numbers with no symbols or thousands
// separators. Category is this app's column — an IRS Schedule C category or
// a custom label — which QuickBooks simply leaves unmapped at import.
export type TransactionRow = {
  date: Date;
  description: string;
  // Signed integer cents: positive = money in (income), negative = money out
  // (expense).
  amountCents: number;
  category: string;
};

function transactionDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${m}/${d}/${date.getFullYear()}`;
}

// Intuit's "common errors" doc (L02IgW462_US_en_US) says special characters
// in fields can fail the import; keep fields plain and comma-free so nothing
// needs quoting.
function plainTextField(value: string): string {
  return value
    .replaceAll("&", "and")
    .replace(/[#%,"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function transactionsCsv(transactions: TransactionRow[]): string {
  const sorted = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  return toCsv([
    ["Date", "Description", "Amount", "Category"],
    ...sorted.map((t) => [
      transactionDate(t.date),
      plainTextField(t.description),
      centsToDollarString(t.amountCents),
      plainTextField(t.category),
    ]),
  ]);
}

export type MileageLedgerRow = {
  date: Date;
  purpose: string;
  miles: number;
  bookingId: string | null;
};

export function mileageLedgerCsv(rows: MileageLedgerRow[]): string {
  return toCsv([
    ["Date", "Purpose", "Miles", "Booking"],
    ...rows.map((row) => [
      isoDate(row.date),
      row.purpose,
      String(row.miles),
      row.bookingId ?? "",
    ]),
  ]);
}
