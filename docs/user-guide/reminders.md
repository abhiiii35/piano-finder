# Reminders — Automatic Tune and Appointment Notifications

Send timely emails to customers before their tuning is due and before their appointments arrive.

## What this does

The system sends two types of reminders: **tune reminders** (every 6 months or 12 months based on the piano's frequency) and **appointment reminders** (before each scheduled appointment). You control the message templates and when they're sent.

---

## How Tune Reminders Are Created

**(Technician, automatic)**

When you complete a booking on a piano, a tune reminder is automatically created for the next due service.

### The automatic process

1. You mark a booking as COMPLETED
2. The system captures the piano's **tuning frequency** (default: 6 months)
3. It calculates the next due date: completion date + 6 months
4. A reminder is created in your **Reminders** queue with that due date
5. If 6 months pass with no new visit, a 12-month fallback reminder is created as a backup

### Piano tuning frequency

The frequency is set when you create or edit a piano record:

1. Open a customer → **Pianos** tab
2. Click a piano to open it
3. Look for **Tuning frequency** (default: 6 months)
4. Edit if the customer prefers a different schedule (e.g., 3 months for concert pianos)

Each piano has its own frequency, so some customers get reminded every 3 months and others every 12 months.

---

## Reminders Page: Sending and Tracking

**(Technician)**

All due and overdue reminders appear in one queue. Send them manually or set up auto-send.

### View the reminders queue

1. Go to **Dashboard** → **Reminders**
2. See a list of reminders sorted by most-overdue first
3. Each row shows:
   - **Customer name** and **piano make/model**
   - **Last service date**
   - **Days overdue** (red if overdue; blue if upcoming)
   - **Status**: Pending, Sent, or Handled

### Send a single reminder

1. Click a reminder row
2. Click **Send now**
3. The email is sent to the customer immediately
4. The status changes to **Sent** with a timestamp

### Mark as handled

If the customer has already booked or doesn't need a reminder, mark it done without sending:

1. Click the reminder
2. Click **Mark handled** or **Dismiss**
3. It removes it from the queue (but you can still find it in history)

### Send in bulk

To send multiple reminders at once:

1. In the Reminders list, select checkboxes next to the reminders you want to send (or **Select all**)
2. Click **Send selected**
3. All checked reminders are emailed immediately

---

## Reminder Settings: Auto-Send vs. Review First

**(Technician)**

Decide whether reminders send automatically or wait for you to review and approve.

### Change the reminder mode

1. Go to **Dashboard** → **Settings** or **Profile**
2. Look for **Reminder mode** or **Auto-send**:
   - **Review first** (default): Reminders queue up for you to send manually; gives you control
   - **Auto-send**: Reminders send automatically when due; no action needed from you

3. Pick your preference and click **Save**

Most technicians use **Review first** to control the message and timing. Switch to **Auto-send** if you want a completely hands-off system.

---

## Reminder Email Templates

**(Technician)**

Customize the subject and body of reminder emails. The system fills in customer name, piano details, and other info automatically.

### Edit the recall (tune reminder) template

1. Go to **Dashboard** → **Settings** → **Message Templates** (or **Reminders settings**)
2. Find the **Recall email** or **Tune reminder** template
3. Edit the subject line and body
4. Use placeholders to insert dynamic data:
   - `{customerName}` — customer's name
   - `{pianoMake}` — piano make (e.g., Steinway)
   - `{lastServiceDate}` — date of the last service
   - `{technicianName}` — your name
   - `{businessName}` — your business name

Example subject: `It's time to tune your {pianoMake}`

Example body:

```
Hi {customerName},

Your {pianoMake} was last tuned on {lastServiceDate}. 
Pianos typically need tuning every 6 months to sound their best.

Ready to book? Reply to this email or call me at (555) 123-4567.

Best,
{technicianName}
{businessName}
```

5. Click **Save**

### Preview with sample data

1. At the bottom of the template editor, click **Preview**
2. You'll see the email with real customer data (sample values)
3. Check that all placeholders filled in correctly
4. Adjust the template if needed

### Edit the appointment reminder template

1. Go to **Settings** → **Message Templates**
2. Find the **Appointment reminder** template
3. Edit subject and body with the same placeholders
4. You can also set **Send offset** (hours before appointment):
   - Default: 24 hours (email sent 1 day before)
   - Common values: 24 hours, 48 hours, 2 hours
5. Click **Save**

Example:

```
Subject: Your piano tuning is tomorrow at {bookingTime}

Hi {customerName},

Reminder: we have your appointment tomorrow.

Piano: {pianoMake}
Time: {bookingTime}
Technician: {technicianName}

See you then!
```

### Template variables reference

| Placeholder | What it shows | Example |
|---|---|---|
| `{customerName}` | Customer's full name | John Smith |
| `{pianoMake}` | Piano brand | Steinway |
| `{lastServiceDate}` | Date of last service | July 15, 2024 |
| `{bookingTime}` | Appointment date and time | August 25, 2024 at 2:00 PM |
| `{technicianName}` | Your name | Jane Tuner |
| `{businessName}` | Your business name | Perfect Pitch Piano |

---

## Appointment Reminders

**(Technician, automatic)**

The system sends appointment reminders to customers before each scheduled appointment.

### How appointment reminders work

1. You have a confirmed booking scheduled
2. At the time you set (default: 24 hours before), an email is sent to the customer
3. The email reminds them of the date, time, piano, and your name
4. They get the template you customized in Settings

You don't need to do anything; they send automatically. But you can customize the message and the lead time.

### Change the send time

1. Go to **Settings** → **Message Templates**
2. Find **Appointment reminder**
3. Edit the **Send offset** (e.g., change from 24 to 48 hours)
4. Click **Save**

Now appointment reminders send 2 days before instead of 1 day.

### Disable appointment reminders

If you don't want to send appointment reminders:

1. Go to **Settings** → **Message Templates**
2. Find the appointment reminder template
3. Delete it or set the offset to 0

Reminders won't be sent. You can re-add the template anytime.

---

## Cron Job Setup (Administrator)

The reminder system requires two cron jobs to send emails at the right time. This section is for whoever manages the deployment.

Both jobs must have the `x-cron-secret` header with the value set in your `CRON_SECRET` environment variable. If `CRON_SECRET` is not set, the cron jobs will return a 500 error.

### Tune reminder cron

**Endpoint**: `POST /api/cron/tune-reminders`

**Frequency**: Once per day (or more often; runs idempotently)

**Header**: `x-cron-secret: <your-CRON_SECRET-value>`

This job finds all tune reminders that are due and haven't been sent yet, then sends them (or queues them for review, depending on settings).

Example (EasyCron, AWS EventBridge, or any cron service):

```
curl -X POST https://yourapp.com/api/cron/tune-reminders \
  -H "x-cron-secret: your_secret_value"
```

### Appointment reminder cron

**Endpoint**: `POST /api/cron/appointment-reminders`

**Frequency**: Every hour (MUST be hourly; missing an hour means missing reminders)

**Header**: `x-cron-secret: <your-CRON_SECRET-value>`

This job finds all confirmed bookings with appointments in the next hour (accounting for your configured send offset) and sends reminders. It uses a 1-hour-wide sliding window so no booking is missed or reminded twice.

Example:

```
curl -X POST https://yourapp.com/api/cron/appointment-reminders \
  -H "x-cron-secret: your_secret_value"
```

### Setting CRON_SECRET

In your environment (`.env` locally, deployment platform env vars in production):

```
CRON_SECRET=your_secret_value_here_make_it_long_and_random
```

Use a long random string (e.g., 32+ characters). The cron service must include this exact value in the header, or the request will be rejected.
