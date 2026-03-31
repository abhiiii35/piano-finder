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
