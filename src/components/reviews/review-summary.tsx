import { StarRating } from "./star-rating";

export function ReviewSummary({
  avgRating,
  totalCount,
  distribution,
}: {
  avgRating: number;
  totalCount: number;
  distribution: Record<number, number>;
}) {
  return (
    <div className="flex gap-8">
      <div className="text-center">
        <p className="text-4xl font-bold">{avgRating.toFixed(1)}</p>
        <StarRating rating={avgRating} size="md" />
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount} review{totalCount !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] ?? 0;
          const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-3">{star}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-right text-muted-foreground">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
