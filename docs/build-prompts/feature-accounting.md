# Build prompt: Invoicing + Accounting handoff (Feature 2)

Paste the block below into Claude Code from the repo root. Run at high effort (money correctness matters).

---

I'm giving Piano Finder technicians a finance hub so they can track expenses and mileage alongside the income the platform already records, and hand a clean package to their accountant. This is accountant-handoff material, not tax advice, and it must never estimate taxes owed.

Extend the existing invoicing so a technician can record expenses and mileage, see a profit-and-loss and category summary for any date range, and export everything as CSV and in a QuickBooks-import-compatible format.

First read, and follow the conventions in, `CLAUDE.md` and `AGENTS.md`. Then read the existing money code so you extend it rather than duplicate it: `src/actions/invoice.tsx`, `src/actions/payment.ts`, `src/app/api/invoices/[bookingId]/pdf/route.tsx`, `src/app/api/webhooks/stripe/route.ts`, the `Payment` model in `prisma/schema.prisma`, and `src/lib/stripe.ts`.

Scope:
- Prisma `Expense` model: id, technicianId, date, category, amountCents (integer cents, like the rest of the app), vendor (optional), notes (optional), receiptUrl (optional, via existing Cloudinary path), deductible (Boolean), createdAt. Prisma `MileageLog` model: id, technicianId, date, miles (Float), purpose, bookingId (optional), createdAt. Add migrations.
- Income is derived, not re-entered: sum `Payment` records with status SUCCEEDED (amount plus tips) for the technician's bookings in the range.
- Reports for a date range: profit-and-loss (income minus categorized expenses), expense totals by category, and a mileage deduction line (miles times the IRS standard mileage rate). Present as a finance dashboard, not tax advice.
- The IRS standard mileage rate changes yearly. Look it up from irs.gov for the relevant tax year at build time and store it as a per-year configurable constant in `src/lib/constants.ts`; do not hard-code a rate from memory. If you cannot confirm it from a current source, leave it configurable and clearly flagged, not guessed.
- Export: a plain CSV of each ledger (income, expenses, mileage) and a QuickBooks-import-compatible CSV. Confirm the exact column format QuickBooks Online expects from Intuit's current import documentation before implementing; do not invent columns. IIF and the QuickBooks API are out of scope for now.
- Routes: `dashboard/technician/finances` with tabs for Income, Expenses, Mileage, and Reports. Server actions in `src/actions/expense.ts` and `src/actions/finance-report.ts`, Zod schemas in `src/lib/validations/`, queries in `src/lib/queries/`.

Don't add features or refactor unrelated code beyond what this needs. Keep all money as integer cents and never introduce floating-point money.

Never label any output as tax advice and never compute taxes owed; the deliverable is totals an accountant works from. Only validate at real boundaries (user input, Stripe data).

Before reporting done, verify:
- A technician can add an expense with a receipt image, log mileage, and generate a P&L for a date range whose income line reconciles exactly with the sum of SUCCEEDED `Payment` amounts plus tips for that technician and range.
- CSV export opens cleanly, and a round-trip import of the QuickBooks-format CSV into a blank QuickBooks Online test file succeeds without manual column fixing (or, if you cannot test the import, state that explicitly and cite the Intuit format doc you followed).
- The mileage rate in `constants.ts` is sourced, not guessed, with the source noted in a comment.
- Vitest covers the report math and export formatting with mocked Prisma.
- Each completion claim maps to a real command output this session; if a check fails, say so with the output.

Lead with the outcome when you report back: first sentence says what shipped and whether the P&L reconciles, then anything you need from me.
