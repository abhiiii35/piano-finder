# Calendar Feed and Data Export

Subscribe to your calendar in Google or Apple Calendar, or download all your data as CSV files.

## What this does

The calendar feed lets technicians share their Piano Finder appointments with Google Calendar or Apple Calendar so they stay in sync. Data export lets technicians download their customer, piano, service, and booking records as CSV files for backup or import into other tools.

---

## Calendar Subscription

**(Technician)**

Stream your appointments to Google Calendar or Apple Calendar. The feed is read-only and updates whenever you change a booking in Piano Finder.

### Enable calendar feed

1. Go to **Dashboard** → **Availability** (the schedule and availability settings page)
2. Scroll to the **Calendar feed** section
3. Click **Enable calendar feed**
4. A read-only calendar URL is generated and displayed

### Subscribe in Google Calendar

1. Open [google.com/calendar](https://google.com/calendar)
2. On the left sidebar, find **Other calendars**
3. Click the **+** button next to "Other calendars"
4. Select **From URL**
5. Paste the calendar feed URL from Piano Finder
6. Click **Add calendar**
7. Your Piano Finder appointments now appear in Google Calendar (synced automatically)

### Subscribe in Apple Calendar

1. Open **Apple Calendar** (Finder → Applications → Calendar)
2. Go to **File** → **New Calendar Subscription**
3. Paste the calendar feed URL from Piano Finder into the dialog
4. Click **Subscribe**
5. Your Piano Finder appointments now appear in Apple Calendar (synced based on your calendar app's refresh interval)

### What appointments show up

The feed includes:
- All confirmed bookings (appointments you have scheduled with customers)
- Your time-off blocks (vacations, maintenance days)
- The appointments are shown as read-only; changes must be made in Piano Finder
- The feed covers approximately 6 months in the past and future

### Regenerate the feed link

If the calendar feed link is shared with someone you don't trust, regenerate it to disable the old link.

1. Go to **Dashboard** → **Availability**
2. Scroll to **Calendar feed**
3. Click **Regenerate link**
4. A new URL is created; the old one stops working immediately
5. Share the new URL with your calendar app (repeat the subscription steps above)

### Disable the feed

To stop sharing your calendar:

1. Go to **Dashboard** → **Availability**
2. Click **Disable** next to the calendar feed
3. The feed URL stops working
4. Unsubscribe from your calendar app (Google Calendar or Apple Calendar) by removing the subscription

---

## Exporting Your Data

**(Technician)**

Download your customer records, pianos, contacts, service history, and bookings as CSV files. These files are re-import-friendly and suitable for backup, analysis, or migration to another tool.

### What you can export

From **Dashboard** → **Export Data**, you can download:

- **Customers** — Your customer records (names, emails, phone numbers)
- **Pianos** — All pianos in your customer records (makes, models, serial numbers, tuning frequency)
- **Contacts** — Additional contacts linked to each customer (e.g., billing contact, facilities manager)
- **Service Locations** — Addresses and locations where you serve customers
- **Service History** — All service records you have logged (dates, work performed, readings, recommendations)
- **Bookings** — All bookings, including status, dates, and customer info

Financial data (income, expenses, mileage, combined transactions) is exported from the **Finances** page (see below).

### Download a CSV file

1. Go to **Dashboard** → **Export Data**
2. Click **Download CSV** next to the file type you want
3. The file downloads to your Downloads folder
4. Open it in Excel, Google Sheets, or any spreadsheet tool

### Export financial data

1. Go to **Dashboard** → **Finances**
2. Financial tabs include:
   - **Income tab** → **Export CSV** (paid bookings and tips)
   - **Expenses tab** → **Export CSV** (your business expenses)
   - **Mileage tab** → **Export CSV** (miles logged)
   - **Reports tab** → **Transactions CSV** (combined income and expenses in QuickBooks import format)

### Important notes about exports

- **Calendar and share links are not included** — The CSV files contain only customer data. Calendar feed links and customer share links are not exported (they are account-specific and cannot be re-imported).
- **Files are CSV format** — Plain text, compatible with Excel, Google Sheets, and most business software.
- **Re-import friendly** — Column names match what Piano Finder expects if you want to bulk-import records back (see Importing Clients guide).
- **No cleanup after export** — Downloading a CSV does not delete anything from Piano Finder.
