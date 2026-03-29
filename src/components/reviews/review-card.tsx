import { StarRating } from "./star-rating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export function ReviewCard({
  review,
}: {
  review: {
    rating: number;
    comment: string | null;
    createdAt: Date;
    author: { name: string | null; image: string | null };
  };
}) {
  return (
    <div className="flex gap-4 py-4">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback>
          {review.author.name?.[0]?.toUpperCase() ?? "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {review.author.name ?? "Anonymous"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(review.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <StarRating rating={review.rating} />
        {review.comment && (
          <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
        )}
      </div>
    </div>
  );
}
