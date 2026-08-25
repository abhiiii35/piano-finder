# Payments and Invoices

Handle payments from customers, add tips, customize invoices with your logo, and generate tax summaries.

## What this does

Customers pay for bookings through the platform (card or cash). Tips are optional and shown as a separate line. Technicians customize invoice PDFs with their logo and generate tax reports for their accountant.

---

## Customer: Paying for a Booking

**(Customer)**

### Pay with a card and tip

1. Go to your **Bookings**
2. Click the booking you want to pay for
3. Click **Pay** button
4. A payment screen appears with:
   - The booking amount (already calculated)
   - **Tip options**: None, 10%, 15%, 20%, or Custom
5. Select your tip amount:
   - Click one of the preset buttons, or
   - Click **Custom** and enter a dollar amount
6. Your total is shown (booking amount + tip)
7. Click **Continue to checkout**
8. Enter your card details (Stripe checkout page)
9. Click **Pay**
10. Your receipt is emailed to you immediately
11. The invoice shows both the service amount and tip as separate line items

### Paying without a tip

1. Open the booking
2. Click **Pay**
3. Click **No tip** button
4. Click **Continue to checkout**
5. Complete payment as above

### Paying with cash

**(Technician collects cash; Customer does not need to act)**

If you agree to pay in cash:

1. The booking shows **Pending payment** until the technician marks it as paid
2. When the technician arrives, pay them directly
3. After the service, the technician marks the booking as cash-paid in their dashboard
4. The invoice is sent to you with "Paid by cash" notation

Currently, tips cannot be recorded for cash payments. If you want to tip your technician on a cash booking, tip them in person.

---

## Technician: Invoices and Invoice Logo

**(Technician)**

### Upload your invoice logo

Your logo appears on every PDF invoice sent to customers and downloaded from the platform.

1. Go to **Profile** (Dashboard → Profile)
2. Scroll to **Invoice Logo**
3. If no logo is set, click **Upload** or the upload area
4. Choose a JPEG, PNG, or WebP image file from your computer
5. The image is uploaded and displayed in the preview
6. Click **Save** at the bottom of the page

The logo appears in the top-left of invoices. Recommended size: 200–400 pixels wide.

### Remove or replace your logo

1. Go to **Profile**
2. Scroll to **Invoice Logo**
3. If a logo is set, click **Remove** or **Delete** button next to it
4. Click **Save**
5. The logo is deleted; all new invoices will not display it

To replace it, upload a new image following the steps above.

---

## Technician: Tax Summary and Financial Reports

**(Technician)**

### Download a tax summary (PDF)

The tax summary aggregates your income, expenses, and mileage for a specific year. Share it with your accountant or use it to prepare your own tax return.

1. Go to **Dashboard** → **Finances**
2. Click the **Reports** tab
3. Set the **Year** to the tax year you want (e.g., 2024, 2025)
4. Click **Download tax summary (PDF)**
5. A PDF file downloads with:
   - Total income by category (services, tips, etc.)
   - Total expenses by category (repairs, travel, etc.)
   - Mileage deduction estimate (IRS standard rate × miles driven)
   - Net profit/loss (income − expenses)
   - A note that this is not tax advice

### What the tax summary includes

The PDF shows:
- **Income section**: All paid bookings during the year, broken down by service type
- **Expenses section**: All expenses you logged, grouped by category (supplies, travel, equipment, etc.), with a note of which ones are marked deductible
- **Mileage deduction**: Total miles logged × current IRS standard mileage rate for business use
- **Net income**: Gross income minus expenses; this is your estimated taxable business profit

The summary states that it uses IRS standard mileage rates (updated annually) and that your accountant decides the final tax treatment.

### Generate financial exports for your accountant

In the Reports tab, you can also download:

1. **Transactions CSV** — Income and expenses in QuickBooks Online bank-import format:
   - Three columns: Date, Description, Amount
   - Income transactions are positive; expenses are negative
   - Can be bulk-imported into QuickBooks Online
   - First three columns match QuickBooks format; additional Category column is provided

2. **Income CSV** — All paid bookings with tips broken out separately

3. **Expenses CSV** — All expenses you logged

4. **Mileage CSV** — All miles driven; import this into QuickBooks yourself (QuickBooks does not support mileage via CSV)

---

## Tips: How They Work

**(Customer and Technician)**

### For customers

- Tips are optional and added at payment time
- Presets are available (None, 10%, 15%, 20%) or enter a custom amount
- The tip appears as a separate line on your receipt and invoice
- Tips are included in the total amount charged to your card

### For technicians

- Tips are recorded as part of the payment
- Tips are shown separately from the service charge on invoices
- Tips appear in your **Income** export and in the **Finances** → **Income** tab as "Tip" entries
- Tips contribute to your total income reported in the tax summary
- Cash tips are not currently supported (if a customer pays in cash and wants to tip, they tip in person)

---

## Payment Tracking

**(Technician)**

### View all payments

1. Go to **Dashboard** → **Finances** → **Income** tab
2. All paid bookings appear in a table with:
   - Date of service
   - Customer name
   - Services provided
   - Payment method (Card or Cash)
   - Amount (service charge)
   - Tip amount
   - Total

3. Filter by date using the **From** and **To** date fields at the top
4. Click **Export CSV** to download the table

### Payment statuses

Each payment has a status:
- **SUCCEEDED** — Payment completed and processed
- **PENDING** — Customer has not yet paid
- **FAILED** — Card was declined or payment was not completed
- **REFUNDED** — Payment was refunded to the customer

Only SUCCEEDED payments count toward your income and tax reports.
