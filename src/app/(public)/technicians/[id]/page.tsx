import { notFound } from "next/navigation";
import Link from "next/link";
import { getTechnicianById } from "@/lib/queries/technicians";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "@/components/reviews/star-rating";
import { ReviewCard } from "@/components/reviews/review-card";
import { formatCents } from "@/lib/utils";
import { MapPin, Award, Clock, Calendar } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function TechnicianProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const technician = await getTechnicianById(id);

  if (!technician) notFound();

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* Profile Header */}
        <div className="flex gap-6">
          <Avatar className="h-24 w-24 shrink-0">
            <AvatarFallback className="text-2xl">
              {technician.user.name?.[0]?.toUpperCase() ?? "T"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {technician.businessName || technician.user.name}
              </h1>
              {technician.isVerified && (
                <Badge variant="secondary">Verified</Badge>
              )}
            </div>
            {technician.user.name && technician.businessName && (
              <p className="text-muted-foreground">{technician.user.name}</p>
            )}
            {technician.city && technician.state && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {technician.city}, {technician.state}
                {technician.serviceRadius &&
                  ` (${technician.serviceRadius} mi radius)`}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3">
              {technician.reviewCount > 0 && (
                <div className="flex items-center gap-1">
                  <StarRating rating={technician.avgRating} size="md" />
                  <span className="text-sm font-medium">
                    {technician.avgRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({technician.reviewCount} review
                    {technician.reviewCount !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
              {technician.yearsExperience && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Award className="h-4 w-4" />
                  {technician.yearsExperience} years exp.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {technician.bio && (
          <div>
            <h2 className="text-lg font-semibold">About</h2>
            <p className="mt-2 text-muted-foreground whitespace-pre-line">
              {technician.bio}
            </p>
          </div>
        )}

        {/* Certifications */}
        {technician.certifications && (
          <div>
            <h2 className="text-lg font-semibold">Certifications</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {JSON.parse(technician.certifications).map(
                (cert: string, i: number) => (
                  <Badge key={i} variant="outline">
                    {cert}
                  </Badge>
                )
              )}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div>
          <h2 className="text-lg font-semibold">
            Reviews ({technician.reviewCount})
          </h2>
          {technician.reviews.length > 0 ? (
            <div className="divide-y">
              {technician.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-muted-foreground">No reviews yet</p>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {technician.services.map((service) => (
              <div
                key={service.id}
                className="flex items-start justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{service.name}</p>
                  {service.description && (
                    <p className="text-xs text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {service.durationMin} min
                  </p>
                </div>
                <span className="font-semibold text-sm">
                  {formatCents(service.priceCents)}
                </span>
              </div>
            ))}
            {technician.services.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No services listed
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Availability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DAYS.map((day, i) => {
              const slot = technician.availabilitySlots.find(
                (s) => s.dayOfWeek === i
              );
              return (
                <div key={i} className="flex justify-between text-sm">
                  <span className="font-medium">{day}</span>
                  <span className="text-muted-foreground">
                    {slot ? `${slot.startTime} - ${slot.endTime}` : "Closed"}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Link href={`/technicians/${id}/book`} className="block">
          <Button className="w-full" size="lg">
            Book Now
          </Button>
        </Link>
      </div>
    </div>
  );
}
