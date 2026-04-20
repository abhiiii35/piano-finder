"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validations/review";

export async function createReview(data: {
  bookingId: string;
  rating: number;
  comment?: string;
  photos?: string[];
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Please sign in" };

  const result = reviewSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { bookingId, rating, comment, photos } = result.data;

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      customerId: session.user.id,
      status: "COMPLETED",
    },
    include: { review: true },
  });

  if (!booking) return { error: "Booking not found or not completed" };
  if (booking.review) return { error: "Review already submitted" };

  await prisma.review.create({
    data: {
      bookingId,
      authorId: session.user.id,
      rating,
      comment: comment || null,
      photos: JSON.stringify(photos),
    },
  });

  revalidatePath(`/dashboard/customer/bookings/${bookingId}`);
  revalidatePath(`/technicians/${booking.technicianId}`);
  return { success: true };
}
