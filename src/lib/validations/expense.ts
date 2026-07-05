import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .transform((value, ctx) => {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d); // local midnight, matching app date handling
    if (
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
    ) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return date;
  });

// Dollars-and-cents string -> integer cents, using string math only.
const dollarAmount = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a dollar amount like 45.99")
  .transform((value, ctx) => {
    const [dollars, fraction = ""] = value.split(".");
    const amountCents =
      Number(dollars) * 100 + Number(fraction.padEnd(2, "0") || "0");
    if (amountCents <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than zero" });
      return z.NEVER;
    }
    return amountCents;
  });

// HTML checkboxes submit "on" when checked and nothing when unchecked.
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

export const expenseSchema = z
  .object({
    date: dateString,
    // Either an IRS Schedule C category (see IRS_SCHEDULE_C_CATEGORIES) or a
    // custom label the technician typed — both are stored as plain text.
    category: z
      .string()
      .trim()
      .min(1, "Category is required")
      .max(60, "Category must be 60 characters or fewer"),
    amount: dollarAmount,
    vendor: z.string().optional(),
    notes: z.string().optional(),
    receiptUrl: z.url().optional().or(z.literal("")),
    deductible: checkbox,
  })
  .transform(({ amount, ...rest }) => ({ ...rest, amountCents: amount }));

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const mileageLogSchema = z.object({
  date: dateString,
  miles: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Enter miles as a number")
    .transform(Number)
    .refine((n) => n > 0, "Miles must be greater than zero"),
  purpose: z.string().min(1, "Purpose is required"),
  bookingId: z.string().optional(),
});

export type MileageLogInput = z.infer<typeof mileageLogSchema>;

export const dateRangeSchema = z
  .object({
    from: dateString,
    to: dateString,
  })
  .refine((range) => range.from <= range.to, {
    message: "Start date must be on or before end date",
  });

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
