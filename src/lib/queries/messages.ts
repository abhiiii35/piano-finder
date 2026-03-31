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
