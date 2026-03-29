import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewSummary } from "@/components/reviews/review-summary";
import { ReviewCard } from "@/components/reviews/review-card";
import { Separator } from "@/components/ui/separator";

export default async function TechnicianReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  const reviews = await prisma.review.findMany({
    where: { booking: { technicianId: profile.id } },
    include: { author: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const distribution: Record<number, number> = {};
  reviews.forEach((r) => {
    distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Reviews</h1>
      <p className="mt-1 text-muted-foreground">
        See what your customers are saying
      </p>

      {reviews.length > 0 ? (
        <>
          <div className="mt-8">
            <ReviewSummary
              avgRating={avgRating}
              totalCount={reviews.length}
              distribution={distribution}
            />
          </div>
          <Separator className="my-8" />
          <div className="divide-y">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-8 text-center text-muted-foreground py-12">
          No reviews yet. Complete bookings to receive reviews from customers.
        </p>
      )}
    </div>
  );
}
