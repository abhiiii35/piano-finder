"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createReview } from "@/actions/review";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRatingInput } from "@/components/reviews/star-rating-input";
import { toast } from "sonner";

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setLoading(true);
    const result = await createReview({
      bookingId: params.id as string,
      rating,
      comment: comment || undefined,
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Review submitted!");
      router.push(`/dashboard/customer/bookings/${params.id}`);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Leave a Review</h1>
      <p className="mt-1 text-muted-foreground">
        How was your experience?
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Your Review</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Rating</Label>
              <StarRatingInput value={rating} onChange={setRating} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Tell others about your experience..."
                maxLength={1000}
              />
            </div>
            <Button type="submit" disabled={loading || rating === 0}>
              {loading ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
