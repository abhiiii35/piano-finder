import { describe, it, expect } from "vitest";
import {
  centsToDollarString,
  toCsv,
  incomeLedgerCsv,
  expenseLedgerCsv,
  mileageLedgerCsv,
  transactionsCsv,
} from "@/lib/finance/csv";

describe("centsToDollarString", () => {
  it("formats integer cents as a plain decimal string", () => {
    expect(centsToDollarString(17500)).toBe("175.00");
    expect(centsToDollarString(5)).toBe("0.05");
    expect(centsToDollarString(0)).toBe("0.00");
  });

  it("formats negative cents", () => {
    expect(centsToDollarString(-4250)).toBe("-42.50");
  });

  it("never uses currency symbols or thousands separators", () => {
    expect(centsToDollarString(123456789)).toBe("1234567.89");
  });
});

describe("toCsv", () => {
  it("joins rows with CRLF and fields with commas", () => {
    expect(
      toCsv([
        ["a", "b"],
        ["c", "d"],
      ])
    ).toBe("a,b\r\nc,d\r\n");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    expect(toCsv([["hello, world", 'say "hi"', "line1\nline2"]])).toBe(
      '"hello, world","say ""hi""","line1\nline2"\r\n'
    );
  });

  it("leaves plain fields unquoted", () => {
    expect(toCsv([["plain", "123.45"]])).toBe("plain,123.45\r\n");
  });
});

describe("incomeLedgerCsv", () => {
  it("emits header and one row per payment with amounts in dollars", () => {
    const csv = incomeLedgerCsv([
      {
        date: new Date(2026, 3, 15),
        customerName: "Jane Doe",
        services: "Standard Tuning",
        method: "CARD",
        amountCents: 17500,
        tipCents: 2000,
      },
    ]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[0]).toBe("Date,Customer,Services,Method,Amount,Tip,Total");
    expect(lines[1]).toBe(
      "2026-04-15,Jane Doe,Standard Tuning,CARD,175.00,20.00,195.00"
    );
  });
});

describe("expenseLedgerCsv", () => {
  it("emits header and rows, escaping free-text fields", () => {
    const csv = expenseLedgerCsv([
      {
        date: new Date(2026, 5, 2),
        category: "Tools & Equipment",
        vendor: "Schaff, Inc.",
        notes: null,
        deductible: true,
        receiptUrl: "https://res.cloudinary.com/x/r.jpg",
        amountCents: 4599,
      },
    ]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[0]).toBe(
      "Date,Category,Vendor,Notes,Deductible,Receipt URL,Amount"
    );
    expect(lines[1]).toBe(
      '2026-06-02,Tools & Equipment,"Schaff, Inc.",,Yes,https://res.cloudinary.com/x/r.jpg,45.99'
    );
  });
});

describe("mileageLedgerCsv", () => {
  it("emits header and rows with miles as recorded", () => {
    const csv = mileageLedgerCsv([
      {
        date: new Date(2026, 0, 9),
        purpose: "Round trip to client",
        miles: 24.6,
        bookingId: "booking-1",
      },
      {
        date: new Date(2026, 0, 10),
        purpose: "Supply run",
        miles: 8,
        bookingId: null,
      },
    ]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[0]).toBe("Date,Purpose,Miles,Booking");
    expect(lines[1]).toBe("2026-01-09,Round trip to client,24.6,booking-1");
    expect(lines[2]).toBe("2026-01-10,Supply run,8,");
  });
});

// Transactions CSV: Date, Description, Amount, Category. First three columns
// follow Intuit's 3-column bank-transaction import format (docs
// L4BjLWckq_US_en_US and L0rE9OXBz_US_en_US): MM/DD/YYYY dates, positive =
// money in, negative = money out, plain amounts, no special characters.
// Category holds the IRS Schedule C or custom category.
describe("transactionsCsv", () => {
  it("uses the Date, Description, Amount, Category header", () => {
    const csv = transactionsCsv([]);
    expect(csv.trimEnd()).toBe("Date,Description,Amount,Category");
  });

  it("keeps income positive and expenses negative, with categories", () => {
    const csv = transactionsCsv([
      {
        date: new Date(2026, 3, 15),
        description: "Piano tuning - Jane Doe",
        amountCents: 19500,
        category: "Business income",
      },
      {
        date: new Date(2026, 3, 16),
        description: "Tuning hammer",
        amountCents: -4599,
        category: "Supplies",
      },
    ]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[1]).toBe(
      "04/15/2026,Piano tuning - Jane Doe,195.00,Business income"
    );
    expect(lines[2]).toBe("04/16/2026,Tuning hammer,-45.99,Supplies");
  });

  it("emits plain amounts without symbols or thousands separators", () => {
    const csv = transactionsCsv([
      {
        date: new Date(2026, 0, 2),
        description: "Big job",
        amountCents: 123456789,
        category: "Business income",
      },
    ]);
    expect(csv).toContain("01/02/2026,Big job,1234567.89,Business income");
  });

  it("strips characters Intuit flags as import breakers from text fields", () => {
    const csv = transactionsCsv([
      {
        date: new Date(2026, 0, 2),
        description: "Schaff #4, 100% wool felt",
        amountCents: -1000,
        category: "Tools & Equipment",
      },
    ]);
    const lines = csv.trimEnd().split("\r\n");
    // no &, #, %, or commas — fields stay unquoted so no mapping surprises
    expect(lines[1]).toBe(
      "01/02/2026,Schaff 4 100 wool felt,-10.00,Tools and Equipment"
    );
  });

  it("sorts rows by date", () => {
    const csv = transactionsCsv([
      {
        date: new Date(2026, 5, 2),
        description: "Later",
        amountCents: -100,
        category: "Supplies",
      },
      {
        date: new Date(2026, 4, 1),
        description: "Earlier",
        amountCents: 100,
        category: "Business income",
      },
    ]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[1]).toContain("Earlier");
    expect(lines[2]).toContain("Later");
  });
});
