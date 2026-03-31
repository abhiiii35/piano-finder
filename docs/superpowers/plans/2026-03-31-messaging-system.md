# Messaging System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-booking message threads and general inquiry threads between customers and technicians, with polling-based delivery and email notifications.

**Architecture:** New `Message` model with a `threadId` string for grouping. Server actions for sending/reading messages. A reusable `MessageThread` client component with 5s polling. Messages are added to booking detail pages and technician profile pages. Email notification sent per message.

**Tech Stack:** Next.js 16, Prisma 7 (SQLite), Vitest, server actions, Resend email, shadcn/ui components

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src/actions/messages.ts` | Server actions: `sendMessage`, `getMessages`, `getOrCreateThread` |
| `src/lib/queries/messages.ts` | Query helpers: `getUnreadCountForBooking` |
| `src/lib/emails/message.ts` | Email content: `newMessageEmail` |
| `src/lib/validations/message.ts` | Zod schema for message input |
| `src/app/api/messages/[threadId]/route.ts` | GET route for polling new messages |
| `src/components/messages/message-thread.tsx` | Reusable message thread client component |
| `src/app/(dashboard)/dashboard/messages/[threadId]/page.tsx` | Dedicated inquiry thread page |
| `__tests__/actions/messages.test.ts` | Tests for message actions |
| `__tests__/lib/emails/message.test.ts` | Tests for email content |

### Modified Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Message model, update relations on User, Booking, TechnicianProfile |
| `prisma/seed.ts` | Add sample messages |
| `__tests__/helpers/mocks.ts` | Add message mock model |
| `src/app/(dashboard)/dashboard/customer/bookings/[id]/page.tsx` | Add message thread section |
| `src/app/(dashboard)/dashboard/technician/bookings/[id]/page.tsx` | Add message thread section |
| `src/app/(public)/technicians/[id]/page.tsx` | Add "Send a Message" button |
| `src/app/(dashboard)/dashboard/customer/bookings/page.tsx` | Add unread message badges |

---

### Task 1: Schema — Add Message model

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Modify: `__tests__/helpers/mocks.ts`

- [ ] **Step 1: Add Message model to schema**

In `prisma/schema.prisma`, add after the `CustomerRecord` model:

```prisma
// ─── Messages ────────────────────────────────────────────────

model Message {
  id            String   @id @default(cuid())
  threadId      String
  senderId      String
  bookingId     String?
  technicianId  String
  customerId    String
  content       String
  isRead        Boolean  @default(false)
  createdAt     DateTime @default(now())

  sender     User              @relation("SentMessages", fields: [senderId], references: [id])
  booking    Booking?          @relation(fields: [bookingId], references: [id])
  technician TechnicianProfile @relation(fields: [technicianId], references: [id])
  customer   User              @relation("CustomerMessages", fields: [customerId], references: [id])

  @@index([threadId, createdAt])
}
```

Add relations to existing models. In the `User` model, add:

```prisma
  sentMessages    Message[] @relation("SentMessages")
  customerMessages Message[] @relation("CustomerMessages")
```

In the `Booking` model, add:

```prisma
  messages   Message[]
```

In the `TechnicianProfile` model, add:

```prisma
  messages         Message[]
```

- [ ] **Step 2: Run migration**

```bash
nvm use 20 && npx prisma migrate dev --name add-messages
```

- [ ] **Step 3: Add message mock model**

In `__tests__/helpers/mocks.ts`, add to the `prismaMock` object:

```typescript
  message: createMockModel(),
```

Add a message fixture:

```typescript
  message: {
    id: "msg-1",
    threadId: "customer-1:tech-profile-1:booking-1",
    senderId: "customer-1",
    bookingId: "booking-1",
    technicianId: "tech-profile-1",
    customerId: "customer-1",
    content: "Hi, I wanted to confirm the appointment time.",
    isRead: false,
    createdAt: new Date(),
  },
```

- [ ] **Step 4: Add sample messages to seed**

In `prisma/seed.ts`, after the booking creation, add:

```typescript
  // Create sample messages
  const threadId = `${customer.id}:${techProfile.id}:${booking.id}`;
  await prisma.message.create({
    data: {
      threadId,
      senderId: customer.id,
      bookingId: booking.id,
      technicianId: techProfile.id,
      customerId: customer.id,
      content: "Hi! Just wanted to confirm the appointment. Is there parking available?",
    },
  });
  await prisma.message.create({
    data: {
      threadId,
      senderId: techUser.id,
      bookingId: booking.id,
      technicianId: techProfile.id,
      customerId: customer.id,
      content: "Yes, there's street parking right out front. See you then!",
      isRead: true,
    },
  });
```

- [ ] **Step 5: Re-seed and run tests**

```bash
nvm use 20 && npx prisma db seed && npm run test:run
```

Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts __tests__/helpers/mocks.ts prisma/migrations/
git commit -m "feat: add Message model to schema"
```

---

### Task 2: Message validation schema and email content

**Files:**
- Create: `src/lib/validations/message.ts`
- Create: `src/lib/emails/message.ts`
- Create: `__tests__/lib/emails/message.test.ts`

- [ ] **Step 1: Create validation schema**

Create `src/lib/validations/message.ts`:

```typescript
import { z } from "zod";

export const messageSchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(1, "Message cannot be empty").max(2000),
  bookingId: z.string().optional(),
  technicianId: z.string().min(1),
});

export type MessageInput = z.infer<typeof messageSchema>;
```

- [ ] **Step 2: Write failing tests for email content**

Create `__tests__/lib/emails/message.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { newMessageEmail } from "@/lib/emails/message";

describe("newMessageEmail", () => {
  it("returns subject and html for booking thread", () => {
    const result = newMessageEmail("Jane Doe", "Mike Tuner", "Is there parking available?", "March 15, 2026");
    expect(result.subject).toContain("booking");
    expect(result.html).toContain("Jane Doe");
    expect(result.html).toContain("Is there parking available?");
  });

  it("returns subject and html for inquiry thread", () => {
    const result = newMessageEmail("Jane Doe", "Mike Tuner", "Do you service player pianos?");
    expect(result.subject).toContain("Jane Doe");
    expect(result.html).toContain("Do you service player pianos?");
  });

  it("truncates long messages to 200 chars in preview", () => {
    const longMessage = "A".repeat(300);
    const result = newMessageEmail("Jane", "Mike", longMessage);
    expect(result.html).toContain("A".repeat(200));
    expect(result.html).not.toContain("A".repeat(201));
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
nvm use 20 && npx vitest run __tests__/lib/emails/message.test.ts
```

- [ ] **Step 4: Implement email content**

Create `src/lib/emails/message.ts`:

```typescript
import { buildEmailHtml } from "@/lib/email";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function newMessageEmail(
  senderName: string,
  recipientName: string,
  content: string,
  bookingDate?: string
): { subject: string; html: string } {
  const preview = escapeHtml(content.length > 200 ? content.slice(0, 200) + "..." : content);
  const safeSender = escapeHtml(senderName);
  const safeRecipient = escapeHtml(recipientName);

  const subject = bookingDate
    ? `New message about your booking on ${bookingDate}`
    : `New message from ${senderName}`;

  return {
    subject,
    html: buildEmailHtml(
      bookingDate ? "New Message About Your Booking" : "New Message",
      `<p>Hi <strong>${safeRecipient}</strong>,</p>
      <p><strong>${safeSender}</strong> sent you a message:</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;white-space:pre-line;">${preview}</p>
      </div>
      <p>Log in to your dashboard to reply.</p>`
    ),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
nvm use 20 && npx vitest run __tests__/lib/emails/message.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/message.ts src/lib/emails/message.ts __tests__/lib/emails/message.test.ts
git commit -m "feat: add message validation schema and email content"
```

---

### Task 3: Message server actions

**Files:**
- Create: `src/actions/messages.ts`
- Create: `__tests__/actions/messages.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/actions/messages.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockCustomerSession,
  mockTechnicianSession,
  fixtures,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn((heading: string, body: string) => `<html>${heading}${body}</html>`),
}));

import { getServerSession } from "next-auth";
import { sendEmail } from "@/lib/email";
import { sendMessage, getMessages, getOrCreateThread } from "@/actions/messages";

const mockGetSession = vi.mocked(getServerSession);
const mockSendEmail = vi.mocked(sendEmail);

describe("sendMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a message and sends email notification", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      customerId: "customer-1",
      technicianId: "tech-profile-1",
    });
    prismaMock.technicianProfile.findUnique.mockResolvedValue({
      ...fixtures.technicianProfile,
      user: { name: "Mike Tuner", email: "tech@example.com" },
    });
    prismaMock.message.create.mockResolvedValue({ id: "msg-new" });

    const result = await sendMessage({
      threadId: "customer-1:tech-profile-1:booking-1",
      content: "Is there parking?",
      bookingId: "booking-1",
      technicianId: "tech-profile-1",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.message.create).toHaveBeenCalledOnce();
    const createData = prismaMock.message.create.mock.calls[0][0].data;
    expect(createData.senderId).toBe("customer-1");
    expect(createData.customerId).toBe("customer-1");
    expect(createData.technicianId).toBe("tech-profile-1");
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail.mock.calls[0][0].to).toBe("tech@example.com");
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await sendMessage({
      threadId: "x:y:z",
      content: "hi",
      technicianId: "tech-1",
    });
    expect(result.error).toBeDefined();
  });

  it("rejects empty content", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const result = await sendMessage({
      threadId: "x:y:z",
      content: "",
      technicianId: "tech-1",
    });
    expect(result.error).toBeDefined();
  });

  it("rejects user who is not a participant", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      customerId: "other-customer",
      technicianId: "tech-profile-1",
    });

    const result = await sendMessage({
      threadId: "other-customer:tech-profile-1:booking-1",
      content: "hi",
      bookingId: "booking-1",
      technicianId: "tech-profile-1",
    });
    expect(result.error).toContain("authorized");
  });
});

describe("getMessages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns messages and marks unread ones as read", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.message.findMany.mockResolvedValue([
      { ...fixtures.message, senderId: "tech-user-1", isRead: false },
    ]);
    prismaMock.message.updateMany.mockResolvedValue({ count: 1 });

    const result = await getMessages("customer-1:tech-profile-1:booking-1");

    expect(result.messages).toHaveLength(1);
    expect(prismaMock.message.updateMany).toHaveBeenCalledWith({
      where: {
        threadId: "customer-1:tech-profile-1:booking-1",
        senderId: { not: "customer-1" },
        isRead: false,
      },
      data: { isRead: true },
    });
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await getMessages("x:y:z");
    expect(result.error).toBeDefined();
  });
});

describe("getOrCreateThread", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns threadId for booking thread", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);
    prismaMock.booking.findFirst.mockResolvedValue({
      ...fixtures.booking,
      customerId: "customer-1",
      technicianId: "tech-profile-1",
    });

    const result = await getOrCreateThread("tech-profile-1", "booking-1");
    expect(result.threadId).toBe("customer-1:tech-profile-1:booking-1");
  });

  it("returns threadId for inquiry thread", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    prismaMock.technicianProfile.findUnique.mockResolvedValue(fixtures.technicianProfile);

    const result = await getOrCreateThread("tech-profile-1");
    expect(result.threadId).toBe("customer-1:tech-profile-1:general");
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await getOrCreateThread("tech-1");
    expect(result.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
nvm use 20 && npx vitest run __tests__/actions/messages.test.ts
```

- [ ] **Step 3: Implement message actions**

Create `src/actions/messages.ts`:

```typescript
"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { messageSchema } from "@/lib/validations/message";
import { newMessageEmail } from "@/lib/emails/message";
import { format } from "date-fns";

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Please sign in" as const };
  return { session };
}

async function validateParticipant(
  userId: string,
  technicianId: string,
  bookingId?: string
): Promise<{ customerId: string; techUserId: string } | { error: string }> {
  if (bookingId) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId },
      include: { technician: { select: { userId: true } } },
    });
    if (!booking) return { error: "Booking not found" };
    if (userId !== booking.customerId && userId !== booking.technician.userId) {
      return { error: "Not authorized for this conversation" };
    }
    return { customerId: booking.customerId, techUserId: booking.technician.userId };
  }

  const tech = await prisma.technicianProfile.findUnique({
    where: { id: technicianId },
    select: { userId: true },
  });
  if (!tech) return { error: "Technician not found" };
  // For inquiry threads, the current user is the customer (unless they're the technician)
  const customerId = userId === tech.userId ? "" : userId;
  return { customerId: customerId || userId, techUserId: tech.userId };
}

export async function sendMessage(data: {
  threadId: string;
  content: string;
  bookingId?: string;
  technicianId: string;
}) {
  const auth = await getSessionUser();
  if ("error" in auth) return { error: auth.error };

  const parsed = messageSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { threadId, content, bookingId, technicianId } = parsed.data;
  const userId = auth.session.user.id;

  const participant = await validateParticipant(userId, technicianId, bookingId);
  if ("error" in participant) return { error: participant.error };

  const { customerId, techUserId } = participant;

  const message = await prisma.message.create({
    data: {
      threadId,
      senderId: userId,
      bookingId: bookingId || null,
      technicianId,
      customerId,
      content,
    },
  });

  // Send email notification to the other participant
  try {
    const recipientId = userId === customerId ? techUserId : customerId;
    const [sender, recipient] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: recipientId }, select: { name: true, email: true } }),
    ]);

    if (recipient?.email) {
      let bookingDate: string | undefined;
      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          select: { scheduledAt: true },
        });
        if (booking) bookingDate = format(new Date(booking.scheduledAt), "MMMM d, yyyy");
      }

      const email = newMessageEmail(
        sender?.name ?? "Someone",
        recipient.name ?? "there",
        content,
        bookingDate
      );
      await sendEmail({ to: recipient.email, subject: email.subject, html: email.html });
    }
  } catch (error) {
    console.error("[EMAIL] Failed to send message notification:", error);
  }

  revalidatePath(`/dashboard/customer/bookings`);
  revalidatePath(`/dashboard/technician/bookings`);
  return { success: true, messageId: message.id };
}

export async function getMessages(threadId: string) {
  const auth = await getSessionUser();
  if ("error" in auth) return { error: auth.error };

  const userId = auth.session.user.id;

  // Verify the user is a participant by checking the threadId format
  // threadId format: "customerId:technicianId:bookingId" or "customerId:technicianId:general"
  const messages = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { name: true } } },
  });

  // If there are messages, verify user is a participant
  if (messages.length > 0) {
    const first = messages[0];
    const tech = await prisma.technicianProfile.findUnique({
      where: { id: first.technicianId },
      select: { userId: true },
    });
    if (userId !== first.customerId && userId !== tech?.userId) {
      return { error: "Not authorized" };
    }
  }

  // Mark unread messages from other users as read
  await prisma.message.updateMany({
    where: {
      threadId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true },
  });

  return {
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender.name ?? "Unknown",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      isRead: m.isRead,
    })),
  };
}

export async function getOrCreateThread(technicianId: string, bookingId?: string) {
  const auth = await getSessionUser();
  if ("error" in auth) return { error: auth.error };

  const userId = auth.session.user.id;

  const tech = await prisma.technicianProfile.findUnique({
    where: { id: technicianId },
    select: { userId: true },
  });
  if (!tech) return { error: "Technician not found" };

  if (bookingId) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId },
    });
    if (!booking) return { error: "Booking not found" };
    if (userId !== booking.customerId && userId !== tech.userId) {
      return { error: "Not authorized" };
    }
    const customerId = booking.customerId;
    return { threadId: `${customerId}:${technicianId}:${bookingId}` };
  }

  // Inquiry thread — user is the customer
  return { threadId: `${userId}:${technicianId}:general` };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
nvm use 20 && npx vitest run __tests__/actions/messages.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/actions/messages.ts __tests__/actions/messages.test.ts
git commit -m "feat: add message server actions with tests"
```

---

### Task 4: Message polling API route

**Files:**
- Create: `src/app/api/messages/[threadId]/route.ts`

- [ ] **Step 1: Create the polling API route**

Create `src/app/api/messages/[threadId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = request.nextUrl.searchParams.get("since");

  const where: { threadId: string; createdAt?: { gt: Date } } = { threadId };
  if (since) {
    where.createdAt = { gt: new Date(since) };
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { name: true } } },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender.name ?? "Unknown",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      isRead: m.isRead,
    })),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/messages/\[threadId\]/route.ts
git commit -m "feat: add message polling API route"
```

---

### Task 5: Message thread component

**Files:**
- Create: `src/components/messages/message-thread.tsx`

- [ ] **Step 1: Create the message thread component**

Create `src/components/messages/message-thread.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { sendMessage, getMessages } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Send } from "lucide-react";

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
};

type Props = {
  threadId: string;
  bookingId?: string;
  technicianId: string;
  currentUserId: string;
};

export function MessageThread({ threadId, bookingId, technicianId, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    getMessages(threadId).then((result) => {
      if (result.messages) {
        setMessages(result.messages);
        setLoaded(true);
      }
    });
  }, [threadId]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!loaded) return;

    const interval = setInterval(async () => {
      const lastCreatedAt = messages.length > 0
        ? messages[messages.length - 1].createdAt
        : null;

      const url = lastCreatedAt
        ? `/api/messages/${encodeURIComponent(threadId)}?since=${encodeURIComponent(lastCreatedAt)}`
        : `/api/messages/${encodeURIComponent(threadId)}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id));
            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
          });
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [threadId, loaded, messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!newMessage.trim()) return;
    setSending(true);

    const result = await sendMessage({
      threadId,
      content: newMessage.trim(),
      bookingId,
      technicianId,
    });

    setSending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      setNewMessage("");
      // Optimistically add the message
      setMessages((prev) => [
        ...prev,
        {
          id: result.messageId!,
          senderId: currentUserId,
          senderName: "You",
          content: newMessage.trim(),
          createdAt: new Date().toISOString(),
          isRead: false,
        },
      ]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col">
      {/* Messages */}
      <div className="space-y-3 max-h-96 overflow-y-auto p-1">
        {messages.length === 0 && loaded && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
            >
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] ${
                  isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                {isOwn ? "You" : msg.senderName} &middot;{" "}
                {format(new Date(msg.createdAt), "MMM d, h:mm a")}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="min-h-[40px] resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/messages/message-thread.tsx
git commit -m "feat: add reusable message thread component with polling"
```

---

### Task 6: Add messages to booking detail pages

**Files:**
- Modify: `src/app/(dashboard)/dashboard/customer/bookings/[id]/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/technician/bookings/[id]/page.tsx`
- Create: `src/lib/queries/messages.ts`

- [ ] **Step 1: Create message query helpers**

Create `src/lib/queries/messages.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function getUnreadCountForBooking(bookingId: string, userId: string): Promise<number> {
  return prisma.message.count({
    where: {
      bookingId,
      senderId: { not: userId },
      isRead: false,
    },
  });
}
```

- [ ] **Step 2: Add message thread to customer booking detail page**

In `src/app/(dashboard)/dashboard/customer/bookings/[id]/page.tsx`, add imports:

```typescript
import { MessageThread } from "@/components/messages/message-thread";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

Note: `Card`, `CardContent`, `CardHeader`, `CardTitle` are already imported. Just add `MessageThread`.

After the actions `</div>` (the `flex gap-3 flex-wrap` div, around line 114), add:

```tsx
      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageThread
            threadId={`${session.user.id}:${booking.technicianId}:${booking.id}`}
            bookingId={booking.id}
            technicianId={booking.technicianId}
            currentUserId={session.user.id}
          />
        </CardContent>
      </Card>
```

- [ ] **Step 3: Add message thread to technician booking detail page**

In `src/app/(dashboard)/dashboard/technician/bookings/[id]/page.tsx`, add import:

```typescript
import { MessageThread } from "@/components/messages/message-thread";
```

After the payment badge section (end of the component, before the final `</div>`), add:

```tsx
      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageThread
            threadId={`${booking.customerId}:${profile.id}:${booking.id}`}
            bookingId={booking.id}
            technicianId={profile.id}
            currentUserId={session.user.id}
          />
        </CardContent>
      </Card>
```

- [ ] **Step 4: Run all tests**

```bash
nvm use 20 && npm run test:run
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/messages.ts src/app/\(dashboard\)/dashboard/customer/bookings/\[id\]/page.tsx src/app/\(dashboard\)/dashboard/technician/bookings/\[id\]/page.tsx
git commit -m "feat: add message threads to booking detail pages"
```

---

### Task 7: Add "Send a Message" to technician profile + inquiry page

**Files:**
- Modify: `src/app/(public)/technicians/[id]/page.tsx`
- Create: `src/app/(dashboard)/dashboard/messages/[threadId]/page.tsx`

- [ ] **Step 1: Create dedicated inquiry thread page**

Create `src/app/(dashboard)/dashboard/messages/[threadId]/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageThread } from "@/components/messages/message-thread";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  // Parse threadId: "customerId:technicianId:general" or "customerId:technicianId:bookingId"
  const parts = threadId.split(":");
  if (parts.length !== 3) redirect("/dashboard");

  const [customerId, technicianId, context] = parts;

  // Verify user is a participant
  const tech = await prisma.technicianProfile.findUnique({
    where: { id: technicianId },
    include: { user: { select: { name: true } } },
  });
  if (!tech) redirect("/dashboard");

  if (session.user.id !== customerId && session.user.id !== tech.userId) {
    redirect("/dashboard");
  }

  const techName = tech.user.name ?? "Technician";
  const isBookingThread = context !== "general";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">
        {isBookingThread ? "Booking Messages" : `Message ${techName}`}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {isBookingThread
          ? "Messages about this booking"
          : `Direct conversation with ${techName}`}
      </p>

      <Card>
        <CardContent className="pt-6">
          <MessageThread
            threadId={decodeURIComponent(threadId)}
            bookingId={isBookingThread ? context : undefined}
            technicianId={technicianId}
            currentUserId={session.user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Add "Send a Message" button to technician profile**

In `src/app/(public)/technicians/[id]/page.tsx`, add import:

```typescript
import { MessageButton } from "@/components/messages/message-button";
```

In the sidebar section, add the message button just before the "Book Now" button (before the `<Link href={...}>` around line 201):

```tsx
        <MessageButton technicianId={id} />
```

- [ ] **Step 3: Create the message button component**

Create `src/components/messages/message-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { getOrCreateThread } from "@/actions/messages";
import { toast } from "sonner";

type Props = {
  technicianId: string;
};

export function MessageButton({ technicianId }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!session) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    const result = await getOrCreateThread(technicianId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.threadId) {
      router.push(`/dashboard/messages/${encodeURIComponent(result.threadId)}`);
    }
  }

  return (
    <Button
      variant="outline"
      className="w-full"
      size="lg"
      onClick={handleClick}
      disabled={loading}
    >
      <MessageSquare className="mr-2 h-4 w-4" />
      {loading ? "Loading..." : "Send a Message"}
    </Button>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/messages/\[threadId\]/page.tsx src/app/\(public\)/technicians/\[id\]/page.tsx src/components/messages/message-button.tsx
git commit -m "feat: add inquiry messaging from technician profile"
```

---

### Task 8: Unread message badges on booking list

**Files:**
- Modify: `src/app/(dashboard)/dashboard/customer/bookings/page.tsx`

- [ ] **Step 1: Add unread counts to customer bookings list**

In `src/app/(dashboard)/dashboard/customer/bookings/page.tsx`, add import:

```typescript
import { prisma } from "@/lib/prisma";
```

Note: `prisma` is already imported via the booking query. Add the `MessageSquare` icon:

```typescript
import { MessageSquare } from "lucide-react";
```

After fetching bookings, fetch unread counts for all bookings:

```typescript
  const bookingIds = bookings.map((b) => b.id);
  const unreadCounts = bookingIds.length > 0
    ? await prisma.message.groupBy({
        by: ["bookingId"],
        where: {
          bookingId: { in: bookingIds },
          senderId: { not: session.user.id },
          isRead: false,
        },
        _count: true,
      })
    : [];

  const unreadMap = new Map(
    unreadCounts.map((u) => [u.bookingId, u._count])
  );
```

In the booking card JSX, add the unread badge. In the `div` with `className="flex items-center gap-3"` (around line 60), add before the `<Badge>`:

```tsx
                    {unreadMap.get(booking.id) ? (
                      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        <MessageSquare className="h-3 w-3" />
                        {unreadMap.get(booking.id)}
                      </span>
                    ) : null}
```

- [ ] **Step 2: Run all tests**

```bash
nvm use 20 && npm run test:run
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/customer/bookings/page.tsx
git commit -m "feat: add unread message badges to booking list"
```

---

### Task 9: End-to-end verification

- [ ] **Step 1: Run full test suite**

```bash
nvm use 20 && npm run test:run
```

Expected: All tests pass.

- [ ] **Step 2: Re-seed and start dev server**

```bash
nvm use 20 && npx prisma migrate dev && npx prisma db seed && npm run dev
```

- [ ] **Step 3: Manual verification**

1. Sign in as customer (`customer@example.com` / `password123`) → go to booking detail → see Messages section with seeded messages → send a new message → verify it appears
2. Sign in as technician (`tech@example.com` / `password123`) → go to same booking detail → see the customer's message → reply → verify email notification in console
3. As customer, go to technician profile → click "Send a Message" → redirected to inquiry thread page → send a general question
4. As customer, go to bookings list → verify unread badge shows on bookings with unread messages

- [ ] **Step 4: Commit any fixes**
