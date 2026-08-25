# Scheduling — Calendar, Availability, Rescheduling

Manage your schedule, control when you're available, block time off, and plan efficient routes.

## What this does

The scheduler is your business calendar. You control which days and times you work, customers see only your open slots when booking, you can reschedule any appointment, and the system shows you the most efficient order to visit your jobs.

---

## Rescheduling a Booking

**(Technician and Customer)**

A technician can reschedule any upcoming booking anytime. A customer can reschedule up until a window closes (set by the technician's notice requirement).

### Technician: Reschedule an appointment

1. Go to **Dashboard** → **Bookings**
2. Click the booking you want to move
3. Scroll down and click **Reschedule**
4. Pick a new date and time from the available slots (red slots are blocked; green are open)
5. Click **Confirm reschedule**
6. The customer receives an email about the new time

### Customer: Reschedule an appointment (self-service)

The customer can reschedule without asking if the new time is outside the technician's notice window.

1. Customer clicks the booking link in their email or account
2. If the reschedule deadline has not passed, they see a **Reschedule** button
3. Click it and pick a new date/time
4. If the deadline has passed, they see a message to contact the technician instead (via the messaging link in the booking)

The technician sets the reschedule notice deadline in **Profile** → **"Client reschedule notice"** (default: 48 hours before the appointment).

---

## Offering Suggested Times to a Client

**(Technician)**

Instead of giving the customer the full calendar, offer 2–4 specific time slots. The customer clicks one link to book instantly—no login needed, no browsing required.

### Enable the feature and offer times

1. Go to **Dashboard** → **Profile**
2. Turn on **"Offer suggested times when rescheduling"**
3. When a booking needs to move, open it and click **Reschedule**
4. Instead of letting the customer see all slots, click **Suggest times**
5. Pick 2–4 open slots and click **Send**
6. The customer gets an email with the options and a link for each; clicking one books it instantly
7. If none work, they get a link to the full scheduler

The offer link expires in 7 days or when the original appointment time arrives, whichever comes first. If the customer picks one, the booking updates immediately. If the original appointment time passes while the offer is pending, the offer expires and the customer must reschedule again or contact you.

---

## Time Off

**(Technician)**

Block time when you're unavailable: vacation, holidays, personal appointments, maintenance days.

### Add a time-off block

1. Go to **Dashboard** → **Availability**
2. Scroll to **"Time off"** section
3. Click **Add** or **Add time off**
4. Fill in:
   - **Start date** (required)
   - **End date** (optional; if blank, only that day is blocked)
   - **Time**: leave blank for all-day; or pick start and end times to block only part of the day
   - **Label** (optional; e.g., "Vacation", "Conference", "Maintenance")
5. Click **Save**

Blocked time never appears as available to customers; bookings cannot land there.

### Quick block from the calendar

You can also block time directly from the calendar view:

- **Day view or week view**: click an empty slot → "Mark unavailable"
- **Month view**: hover a day → "Mark day unavailable"

---

## Calendar Filters

**(Technician)**

Show only the bookings and service types you want to see.

### Filter your calendar

1. Open **Dashboard** → **Availability** or **Bookings**
2. Above the calendar, you'll see a filter bar
3. Click chips to filter by:
   - **Service type** (e.g., "Tuning", "Repair")
   - **Customer name** (type to search)
   - **City** (by service location)
4. Combine filters (e.g., show "Tuning" + "Boston"); each chip is an AND condition
5. Click the **X** on any chip to remove it
6. Click **Clear** to remove all filters

Filters save in the URL, so bookmarking a filtered view keeps your selection.

---

## Route Planner

**(Technician)**

See the most efficient stop order for a day and how far you'll travel.

### View and plan your route

1. Go to **Dashboard** → **Route**
2. Pick a date (defaults to today)
3. The system shows:
   - All confirmed bookings for that day
   - The most efficient stop order (optimizes for shortest total distance)
   - **Total miles** for the day
   - **Driving time** in minutes (estimates; doesn't include service time)
4. Click any stop to open that booking's details

The route is calculated from your home base (your **business address** in **Profile**) to each stop and back home. Distances are straight-line estimates (actual driving distance multiplied by a typical road factor).

### Update your home base

The route planner needs to know where you start and end each day.

1. Go to **Profile**
2. Under **Business Address**, fill in:
   - **Address Line 1**
   - **City**
   - **State**
   - **ZIP Code**
3. Click **Save**

The route calculation uses this address as your home base.

---

## Mileage Tracking

**(Technician)**

Automatically log miles driven between jobs and to/from home for tax and expense reporting.

### View your mileage logs

1. Go to **Dashboard** → **Finances** → **Mileage**
2. All mileage entries appear in a table with:
   - **Date**
   - **Miles**
   - **Purpose** (e.g., booking details)
   - **Source**: "Auto" (created by the system) or "Manual" (you added it)

### How automatic mileage is created

When you mark a booking as complete, the system automatically logs:

- Miles from your previous stop (or from home if it's the first job of the day)
- A return-home leg at the end of the day

These entries are marked **"Auto"** and are still fully editable if the actual route differed.

### Edit or delete a mileage entry

1. Go to **Finances** → **Mileage**
2. Click an entry to open it
3. Edit **Miles**, **Date**, or **Purpose** if needed
4. Click **Save** or **Delete** to remove it

### Manually add mileage

1. Go to **Finances** → **Mileage**
2. Click **Add mileage**
3. Fill in:
   - **Date**
   - **Miles** (decimal or whole number)
   - **Purpose** (e.g., "Errand", "Supply run")
4. Click **Save**

Manual entries are useful for errands, supply runs, or corrections.
