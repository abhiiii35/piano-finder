import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`messages-poll:${session.user.id}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
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

  // Same ownership check as getMessages() in src/actions/messages.ts — this
  // route must never return a thread the caller isn't a participant in.
  if (messages.length > 0) {
    const first = messages[0];
    const tech = await prisma.technicianProfile.findUnique({
      where: { id: first.technicianId },
      select: { userId: true },
    });
    if (session.user.id !== first.customerId && session.user.id !== tech?.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

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
