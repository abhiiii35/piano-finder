export const ROLES = {
  CUSTOMER: "CUSTOMER",
  TECHNICIAN: "TECHNICIAN",
  ADMIN: "ADMIN",
} as const;

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

export const JOB_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;

export const SERVICE_TYPES = [
  "Tuning",
  "Repair",
  "Regulation",
  "Voicing",
  "Appraisal",
  "Humidity System",
] as const;

export const PIANO_TYPES = [
  "Grand",
  "Upright",
  "Baby Grand",
  "Digital",
  "Player",
] as const;

// IRS Schedule C (Form 1040) Part II deductible expense categories, lines
// 8-27a. Offered as the built-in category list; technicians may also type a
// custom category (validated as free text, see lib/validations/expense.ts).
export const IRS_SCHEDULE_C_CATEGORIES = [
  "Advertising",
  "Car and truck expenses",
  "Commissions and fees",
  "Contract labor",
  "Depletion",
  "Depreciation and Section 179",
  "Employee benefit programs",
  "Insurance (other than health)",
  "Interest (mortgage)",
  "Interest (other)",
  "Legal and professional services",
  "Office expense",
  "Pension and profit-sharing plans",
  "Rent or lease (vehicles, machinery, equipment)",
  "Rent or lease (other business property)",
  "Repairs and maintenance",
  "Supplies",
  "Taxes and licenses",
  "Travel",
  "Deductible meals",
  "Utilities",
  "Wages",
  "Other expenses",
] as const;

// Category used for platform income rows in the transactions export
// (Schedule C Part I gross receipts — not an expense category).
export const INCOME_CATEGORY = "Business income";

// IRS standard mileage rates for business use, in cents per mile.
// Sourced from irs.gov (verified 2026-07-05):
//   2025: 70 cents/mile   — IR-2024-312 / Notice 2025-5
//     https://www.irs.gov/newsroom/irs-increases-the-standard-mileage-rate-for-business-use-in-2025-key-rate-increases-3-cents-to-70-cents-per-mile
//   2026: 72.5 cents/mile — IR-2025-128 / Notice 2026-10
//     https://www.irs.gov/newsroom/irs-sets-2026-business-standard-mileage-rate-at-725-cents-per-mile-up-25-cents
// Add a new entry each January when the IRS announces the next year's rate.
export const IRS_MILEAGE_RATE_CENTS_PER_MILE: Record<number, number> = {
  2025: 70,
  2026: 72.5,
};

// Average driving speed assumed when estimating travel time from
// straight-line (haversine) distance, while Google Maps billing is disabled.
// Deliberately conservative: real routes are longer than straight lines.
export const AVG_TRAVEL_SPEED_MPH = 30;

export const POST_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
} as const;

export const BLOG_CATEGORIES = [
  "Tuning",
  "Maintenance",
  "Repair",
  "Buying Guides",
  "How-To",
  "News",
] as const;

export const ONBOARDING_STATUS = {
  WIZARD_PENDING: "WIZARD_PENDING",
  CHECKLIST_PENDING: "CHECKLIST_PENDING",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
