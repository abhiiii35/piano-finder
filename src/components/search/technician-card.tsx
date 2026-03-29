import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/reviews/star-rating";
import { MapPin } from "lucide-react";
import { formatCents } from "@/lib/utils";

type Props = {
  id: string;
  name: string | null;
  businessName: string | null;
  city: string | null;
  state: string | null;
  avgRating: number;
  reviewCount: number;
  minPrice: number;
  serviceCount: number;
  isVerified: boolean;
};

export function TechnicianCard({
  id,
  name,
  businessName,
  city,
  state,
  avgRating,
  reviewCount,
  minPrice,
  serviceCount,
  isVerified,
}: Props) {
  return (
    <Card>
      <CardContent className="flex gap-4 p-6">
        <Avatar className="h-16 w-16 shrink-0">
          <AvatarFallback className="text-lg">
            {name?.[0]?.toUpperCase() ?? "T"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-lg">
                {businessName || name || "Piano Technician"}
              </h3>
              {city && state && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {city}, {state}
                </p>
              )}
            </div>
            {isVerified && <Badge variant="secondary">Verified</Badge>}
          </div>

          <div className="mt-2 flex items-center gap-3">
            {reviewCount > 0 && (
              <div className="flex items-center gap-1">
                <StarRating rating={avgRating} />
                <span className="text-sm text-muted-foreground">
                  ({reviewCount})
                </span>
              </div>
            )}
            {minPrice > 0 && (
              <span className="text-sm text-muted-foreground">
                From {formatCents(minPrice)}
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {serviceCount} service{serviceCount !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-4">
            <Link href={`/technicians/${id}`}>
              <Button size="sm">View Profile</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
