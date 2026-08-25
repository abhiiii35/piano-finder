# Service Records — Logging Visits, Photos, and History

Document every piano visit with readings, photos, and recommendations. Customers see a complete, professional record of your work.

## What this does

Service records are the core of your piano history. Each record captures what was done, how the piano responded, and what's needed next. Entries come from completed platform bookings (automatic) or you can log them manually. All entries show on a timeline with trend charts for humidity and pitch. Customers see a professional record (filtered by your preferences) on their private client page.

---

## Logging a Service Visit (Manual Entry)

**(Technician)**

Record a service visit that you completed off-platform or want to manually log.

### Add a service record

1. Go to **Dashboard** → **Customers**
2. Click a customer → **Pianos** tab
3. Click a piano to open it
4. Scroll to the **Service Records** or **History** section
5. Click **Add service record** or **Log visit**
6. Fill in:
   - **Date** (when you serviced it)
   - **Work performed** (e.g., "Standard tuning", "Voicing regulation")
   - **Pitch offset** (optional; cents deviation from A440, e.g., +12, -8)
   - **Humidity** (optional; current percent, e.g., 45%)
   - **Temperature** (optional; in degrees F)
   - **Recommendations** (optional; client-visible suggestions, e.g., "Consider pitch raise next visit")
   - **Internal notes** (optional; for you only, never shown to clients)
   - **Photos or PDFs** (optional; upload images or PDF invoices)
7. Click **Save**

The entry appears on the piano's timeline immediately.

### Quick log with presets

If you use the same log entries frequently (e.g., "Standard tuning", "Seasonal check"), you can create quick-log chips:

1. Go to **Dashboard** → **Settings** → **History Settings**
2. Scroll to **Quick log presets**
3. Click **Add preset**
4. Fill in a template name and any default fields (e.g., "Work performed" = "Standard tuning")
5. Click **Save**

Now when you log a visit, the presets appear as chips; click one to auto-fill those fields.

### Automatic entries from platform bookings

When you mark a booking as COMPLETED through the platform, an automatic service record is created:

- Date and time from the booking
- Service type(s) booked (tuning, repair, etc.)
- Marked as source "PLATFORM"

You can edit or add to this entry later.

---

## Service Record Timeline

**(Technician and Customer)**

All service records for a piano appear in one chronological timeline.

### View the timeline

1. Open a piano → **History** or **Timeline** tab
2. Entries are listed newest first
3. Each entry shows:
   - **Date**
   - **Work performed**
   - **Readings** (pitch, humidity, temperature if recorded)
   - **Source** (Platform booking, Manual, or Import)
   - **Client visible** status (whether the customer can see it)
4. Click an entry to expand and see full details, photos, and notes

The timeline unifies:

- Bookings completed through the platform
- Manually logged visits
- Imported entries from your previous system (if backfilled)

---

## Service Trends and Health Ranges

**(Technician and Customer)**

Charts show how the piano's condition changed over time and whether it's in a healthy range.

### View trend charts

1. Open a piano → **Trends** tab (or scroll to Trends on the History tab)
2. Charts show:
   - **Humidity trend**: all logged humidity readings; healthy range is 40–60%
   - **Pitch trend**: all pitch offset readings; healthy range is ±5 cents of A440

### Reading an alert

- **Red zone**: outside the healthy range (e.g., humidity 70%, pitch ±10 cents)
- **Orange zone**: approaching the limit
- **Green zone**: optimal

If a piano spends time in the red, the app flags it for the customer (if they're allowed to see trends).

### Dry/Humid environment alert

The system tracks whether a piano consistently sits in a dry or humid environment:

- **Dry**: humidity regularly under 35% (wood shrinks, pitch drops, cracks develop)
- **Humid**: humidity regularly over 65% (wood swells, pitch rises, mold risk)

If a pattern emerges, a note appears on the piano and in the customer's view: "This piano is in a very dry environment. A Dampp-Chaser humidity system would help."

### Dampp-Chaser comparison

If a piano has a Dampp-Chaser system (humidity control) installed, the trend chart flags whether it's working:

- If humidity is still swinging wildly despite the system, it might be set wrong or need maintenance
- The app notes: "Dampp-Chaser installed but humidity is still outside healthy range"

---

## History Settings (Technician Preferences)

**(Technician)**

Control what you see and what your customers are allowed to see on their client pages.

### Your own display settings

1. Go to **Dashboard** → **Settings** → **History Settings**
2. Under **Your display**:
   - Choose whether to show **readings** (pitch, humidity, temperature) by default
   - Choose whether to show **photos**
   - Choose whether to show **recommendations**
   - Choose whether to show **prices** (on invoices)

These are your personal preferences; adjust what the timeline displays for you.

### Client visibility settings

1. Go to **Settings** → **History Settings**
2. Under **What clients can see**:
   - Toggle **Readings** (on = customers see pitch/humidity/temp)
   - Toggle **Photos** (on = customers see service photos)
   - Toggle **Recommendations** (on = customers see your suggestions)
   - Toggle **Prices** (on = customers see how much you charged)

**Internal notes are never shown to clients**, regardless of these settings.

### Custom quick-log presets

1. Go to **Settings** → **History Settings** → **Quick log presets**
2. Click **Add preset**
3. Give it a name (e.g., "Seasonal check", "Pitch raise")
4. Fill in default values for any fields (Work performed, Notes, etc.)
5. Click **Save**

These presets appear as chips when you log a visit, speeding up data entry.

---

## Client Share Pages

**(Technician)**

Give customers a private, branded view of their pianos and service history without requiring an account.

### Create a client page

1. Go to **Dashboard** → **Customers**
2. Click a customer to open their detail page
3. In the **"Client page"** card, click **Turn on** or **Create link**
4. A unique, unguessable link is generated (e.g., `example.com/client-page/abc123xyz`)
5. Click **Copy link** and send it to the customer however you like (email, text, paste in a message)

### What customers see

When they click the link (no login required):

- **Their pianos**: make, model, serial, type
- **Service history**: timeline of visits, work performed, readings (what you allowed them to see per History Settings)
- **Next due date**: estimated based on tuning frequency
- **Your contact info**: button to call, email, or text you
- **Unpaid invoices** (if any): with a **Pay now** button
- **Review prompt**: after a recent visit, a link to rate your work

The page is fully branded with your name and any logo you've set up.

### Update or revoke the link

1. Go to **Customers** → open customer → **"Client page"** card
2. To **change visibility**: toggle settings on/off for which history sections they can see
3. To **revoke access**: click **Revoke link** (the old link stops working immediately)
4. To **regenerate**: click **Generate new link** (old link is disabled; send the new one)

You can revoke and regenerate anytime without affecting the customer record itself.

---

## Customer "My Pianos" Page

**(Customer)**

Customers who have an account (booked through the platform) can see their own pianos and service history.

### Customers view their history

1. Customer signs into their account
2. Go to **Dashboard** → **My Pianos**
3. They see all pianos associated with their bookings
4. Click a piano to see its service timeline and trend charts (limited to what you allowed in History Settings)

This is separate from the client share page (no-login link) but shows similar data.
