# Importing Clients — Bulk Upload from Files and Services

Bring your existing customer list into the system in minutes instead of entering them one by one.

## What this does

Import customers, contacts, pianos, and phone numbers from spreadsheets (CSV or Excel), Gazelle database exports, or phone contact files. The system matches existing customers by email or name+phone and merges new data without overwriting what's already there. Up to 2,000 rows per import.

---

## Importing from a Spreadsheet (CSV or Excel)

**(Technician)**

Bulk upload customers, pianos, and contact info from your own data file.

### Prepare your file

Your spreadsheet should have columns for customer info. Common column names: Name, Email, Phone, Make, Model, Serial Number, Notes, etc. The system will auto-guess the columns in the next step; you can adjust if it gets something wrong.

### Upload and map columns

1. Go to **Dashboard** → **Customers**
2. Click **Import** or the import button
3. Select **From a spreadsheet**
4. Click **Choose file** and pick your CSV or Excel file
5. Click **Next**
6. **Step 2: Match Columns**
   - The system shows your spreadsheet's columns on the left
   - On the right, it has guessed what each column contains (Name, Email, Piano Make, etc.)
   - If a guess is wrong, click the dropdown and pick the correct field
   - Leave columns blank if they don't match any field
   - Click **Next**
7. **Step 3: Preview**
   - Review what will happen: new customers created, existing ones merged, rows skipped
   - A row is **merged** if the email matches an existing customer, or if both name and phone match
   - Blank fields are filled in on existing customers; nothing is overwritten
   - A piano is added only if its serial number isn't already on file
   - If you see issues, click **Back** to adjust column mapping
   - Click **Run** to import

After import, check the **Customers** page to verify the new entries.

---

## Importing from Gazelle

**(Technician)**

If you use Gazelle for scheduling, export your client list and import it here.

### Export from Gazelle

1. In Gazelle, go to your client list
2. Export as CSV (Gazelle's export format)
3. Save the file to your computer

### Import into Book A Piano Tuner

1. Go to **Dashboard** → **Customers** → **Import**
2. Select **From Gazelle**
3. Click **Choose file** and pick your Gazelle CSV
4. Click **Next**
5. The system recognizes Gazelle columns automatically; review the preview
6. Click **Run**

The system knows Gazelle's column format, so you don't need to manually map columns.

---

## Importing from Your Phone Contacts (vCard)

**(Technician)**

Export your phone's contacts and bring them in.

### Export from iPhone

1. Open **Contacts** app
2. Select the contact(s) you want to export (or select all)
3. Click **Share** or **Export**
4. Choose **Share as vCard** or **Export as vCard**
5. Save the .vcf file to your computer

### Export from Android

1. Open **Google Contacts** (contacts.google.com) or your phone's Contacts app
2. If using the app, export to a vCard (.vcf) file
3. Save to your computer

### Import the vCard file

1. Go to **Dashboard** → **Customers** → **Import**
2. Select **From your phone contacts**
3. Click **Choose file** and pick the .vcf file
4. Click **Next**
5. Review the preview and click **Run**

Only name and phone from your contacts are imported; you'll need to add email addresses separately if needed.

---

## Importing from Google Contacts

**(Technician)**

Connect your Google Contacts account and import directly (no file upload needed).

### Set up Google access (first time only)

1. Go to **Dashboard** → **Customers** → **Import**
2. Click **From Google Contacts**
3. You may be asked to sign in with your Google account
4. Grant permission to access your contacts
5. If you've done this before and it says "Reconnect", click to re-authorize

The app stores a token so future imports don't require re-signing in (unless you revoke access).

### Import your Google Contacts

1. Go to **Dashboard** → **Customers** → **Import**
2. Click **From Google Contacts**
3. A list of your Google Contacts appears
4. Select the ones you want to import (or all)
5. Click **Run**

Name, email, and phone from Google Contacts are imported.

---

## Understanding the Preview and Merge Logic

**(Technician)**

Before running an import, a preview shows what will happen to each row.

### What the system looks for

- **Match by email**: if a customer with that email exists, merge (fill blanks, don't overwrite)
- **Match by name + phone**: if both name and phone match an existing customer, merge
- **New customer**: if no match, create a new record

### What gets merged

When a customer is matched:

- **Blank fields are filled**: if the imported data has an email and the customer doesn't, it's added
- **Existing data is not overwritten**: if you already have a phone number, the imported one doesn't replace it
- **Pianos are only added if the serial number is new**: if a piano with the same serial already exists, the row is skipped

This keeps your existing data safe while filling in gaps.

### Limits

- Up to 2,000 rows per import
- If your file is larger, split it and run multiple imports
