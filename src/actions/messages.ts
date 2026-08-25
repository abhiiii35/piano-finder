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

export type InboxThread = {
  threadId: string;
  technicianId: string;
  customerId: string;
  bookingId: string | null;
  otherPartyName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

// One row per Message; group them into threads (by threadId), keep the
// latest message and the count of messages from the other party that are
// still unread, and sort threads latest-first.
export async function getInboxThreads() {
  const auth = await getSessionUser();
  if ("error" in auth) return { error: auth.error };

  const userId = auth.session.user.id;

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const messages = await prisma.message.findMany({
    where: profile ? { technicianId: profile.id } : { customerId: userId },
    orderBy: { createdAt: "asc" },
    include: {
      customer: { select: { name: true } },
      technician: { select: { user: { select: { name: true } } } },
    },
  });

  const threadsById = new Map<string, InboxThread>();
  for (const m of messages) {
    const otherPartyName = profile
      ? (m.customer.name ?? "Customer")
      : (m.technician.user.name ?? "Technician");

    const existing = threadsById.get(m.threadId);
    const isUnreadToMe = !m.isRead && m.senderId !== userId;

    if (!existing) {
      threadsById.set(m.threadId, {
        threadId: m.threadId,
        technicianId: m.technicianId,
        customerId: m.customerId,
        bookingId: m.bookingId,
        otherPartyName,
        lastMessage: m.content,
        lastMessageAt: m.createdAt.toISOString(),
        unreadCount: isUnreadToMe ? 1 : 0,
      });
    } else {
      // messages are ordered oldest-first, so the last one processed per
      // thread is always the latest
      existing.lastMessage = m.content;
      existing.lastMessageAt = m.createdAt.toISOString();
      existing.bookingId = existing.bookingId ?? m.bookingId;
      if (isUnreadToMe) existing.unreadCount += 1;
    }
  }

  const threads = [...threadsById.values()].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  return { threads };
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
