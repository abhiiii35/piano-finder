# Messaging System

## Overview

Per-booking message threads and general inquiry threads between customers and technicians. Messages are delivered via polling (5s interval) with email notifications per message.

## Thread Types

### Booking threads
Tied to a specific booking. Accessible from the booking detail page for both customer and technician. Used for appointment-specific communication ("I'll be 10 minutes late", "can you confirm the piano model?").

### Inquiry threads
Not tied to a booking. Accessible from the technician's public profile page via a "Send a Message" button. Used for pre-booking questions ("do you service player pianos?", "what's your availability next week?"). One inquiry thread per customer-technician pair.

## Data Model

### New Message model

```prisma
model Message {
  id            String   @id @default(cuid())
  threadId      String   // deterministic string grouping messages into a conversation
  senderId      String   // FK to User
  bookingId     String?  // FK to Booking (null for inquiry threads)
  technicianId  String   // FK to TechnicianProfile
  customerId    String   // FK to User
  content       String
  isRead        Boolean  @default(false)
  createdAt     DateTime @default(now())

  sender     User              @relation("SentMessages", fields: [senderId], references: [id])
  booking    Booking?          @relation(fields: [bookingId], references: [id])
  technician TechnicianProfile @relation(fields: [technicianId], references: [id])
  customer   User              @relation("ReceivedMessages", fields: [customerId], references: [id])
}
```

Add `messages Message[]` relation to Booking, TechnicianProfile, and User models.

### Thread identity

A thread is identified by the `threadId` string, constructed deterministically:
- Booking thread: `"{customerId}:{technicianId}:{bookingId}"`
- Inquiry thread: `"{customerId}:{technicianId}:general"`

No separate Thread model. Messages are grouped and queried by `threadId` with a database index.

## Server Actions

### `src/actions/messages.ts`

**`sendMessage(threadId, content, bookingId?, technicianId?)`**
- Validates the sender is a participant in the thread
- Creates a Message record
- Sends email notification to the recipient
- Returns the created message or error

**`getMessages(threadId)`**
- Validates the caller is a participant
- Returns all messages for the thread ordered by `createdAt` ascending
- Marks unread messages as read for the current user (messages where `senderId !== currentUserId` and `isRead === false`)

**`getOrCreateThread(technicianId, bookingId?)`**
- Constructs the deterministic `threadId`
- Validates the technician exists
- If bookingId provided, validates the booking exists and the caller is a participant
- Returns the `threadId` (no database write needed — the thread "exists" once messages are sent)

## API Route

### `GET /api/messages/[threadId]`
- Used by polling to fetch new messages
- Returns messages where `createdAt > since` query parameter
- Does NOT mark messages as read (that happens via the `getMessages` action on initial load and when the user is actively viewing)
- Authorization: only thread participants can access

## Queries

### `src/lib/queries/messages.ts`

**`getUnreadCount(userId)`** — total unread messages for a user across all threads (for potential future nav badge)

**`getUnreadCountForBooking(bookingId, userId)`** — unread count for a specific booking thread, used on booking list items

## UI Components

### Message thread component (`src/components/messages/message-thread.tsx`)

Client component. Reusable across booking detail pages and inquiry view.

**Props:** `threadId`, `bookingId?`, `technicianId`, `currentUserId`

**Behavior:**
- Loads messages via `getMessages()` on mount (marks as read)
- Polls `GET /api/messages/[threadId]?since={lastMessageTimestamp}` every 5 seconds for new messages
- Text input with send button at the bottom
- Messages displayed in chronological order, sender name + timestamp on each
- Auto-scrolls to newest message

### Booking detail pages
Both customer and technician booking detail pages get a "Messages" section at the bottom with the message thread component.

### Technician public profile page
"Send a Message" button added to the profile page. Clicking it navigates to a dedicated inquiry page or opens a panel. Requires authentication — redirects to sign-in if not logged in.

### Booking list pages
Unread message count badge shown on booking list items (both customer and technician dashboard booking lists).

## Email Notifications

### `src/lib/emails/message.ts`

**`newMessageEmail(senderName, recipientName, content, bookingContext?)`**

Returns `{ subject, html }`.

- Booking thread subject: `"New message about your booking on {date}"`
- Inquiry thread subject: `"New message from {senderName}"`
- Body: sender name, message preview (first 200 chars), note to log in to reply
- Uses existing `buildEmailHtml` template

**Trigger:** Every call to `sendMessage` sends one email to the recipient.

## Authorization

- Only the two thread participants (customer and technician's user) can read or write to a thread
- For booking threads: the customer who created the booking and the technician assigned to it
- For inquiry threads: the customer who initiated and the technician
- All actions validate the caller's identity against the thread's `customerId` / `technicianId`

## Polling

The message thread component polls every 5 seconds:

1. `GET /api/messages/[threadId]?since={lastCreatedAt}` — fetch only new messages
2. Append to local state
3. If new messages found and sender is not the current user, mark as read via `getMessages()`

When the component unmounts, polling stops (cleanup in `useEffect`).

## Future Considerations

These are out of scope for this implementation but documented for future reference:

- **Server-Sent Events (SSE):** Replace polling with a persistent connection for sub-second message delivery. ~20-30% more complex than polling. One API route keeps the connection open and pushes new messages. Good upgrade if users complain about message delay.
- **WebSocket:** Full duplex real-time. Best latency but requires separate WebSocket server or third-party service (Pusher/Ably). 5-10x more complex than polling. Overkill for this use case's message volume.
- **Inbox page with Thread model:** A conversations list page showing all threads with last message preview, unread counts, and sorting. Would benefit from a separate `Thread` model with denormalized `lastMessageAt` and `unreadCount` fields to avoid expensive aggregation queries.
- **Email batching:** Instead of one email per message, batch unread messages into a digest (e.g., every 15 minutes). Reduces email volume during back-and-forth. Requires a background job or cron.
- **File/photo attachments:** Allow sending images (e.g., photos of the piano) in messages. Requires file upload infrastructure (S3/R2) and preview rendering.
- **Read receipts:** Show the sender when their message was read. Currently `isRead` is tracked but not surfaced in the UI.
