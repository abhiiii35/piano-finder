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
import { ReviewSummary } from "@/components/reviews/review-summary";
import { formatCents } from "@/lib/utils";
import { MapPin, Award, Clock, Calendar } from "lucide-react";
import { MessageButton } from "@/components/messages/message-button";
import { PortfolioGallery } from "@/components/profile/portfolio-gallery";
import { BookingCalendar } from "@/components/profile/booking-calendar";
import { ServiceAreaMap } from "@/components/profile/service-area-map";
import { PitchRaiseDisclosure } from "@/components/profile/pitch-raise-disclosure";

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

        {/* Portfolio */}
        {technician.portfolioPhotos && (
          <PortfolioGallery photos={technician.portfolioPhotos} />
        )}

        {/* Reviews */}
        <div>
          <h2 className="text-lg font-semibold">
            Reviews ({technician.reviewCount})
          </h2>
          {technician.reviews.length > 0 ? (
            <>
              <div className="mt-4">
                <ReviewSummary
                  avgRating={technician.avgRating}
                  totalCount={technician.reviewCount}
                  distribution={technician.reviews.reduce(
                    (acc, r) => {
                      acc[r.rating] = (acc[r.rating] ?? 0) + 1;
                      return acc;
                    },
                    {} as Record<number, number>
                  )}
                />
              </div>
              <Separator className="my-6" />
              <div className="divide-y">
                {technician.reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </>
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

        <PitchRaiseDisclosure />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Book an Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BookingCalendar
              technicianId={id}
              availabilitySlots={technician.availabilitySlots}
            />
          </CardContent>
        </Card>

        {technician.latitude && technician.longitude && technician.serviceRadius && (
          <Card>
            <CardHeader>
              <CardTitle>Service Area</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceAreaMap
                latitude={technician.latitude}
                longitude={technician.longitude}
                radiusMiles={technician.serviceRadius}
                city={technician.city ?? ""}
                state={technician.state ?? ""}
              />
            </CardContent>
          </Card>
        )}

        <MessageButton technicianId={id} />

        <Link href={`/technicians/${id}/book`} className="block">
          <Button className="w-full" size="lg">
            Book Now
          </Button>
        </Link>
      </div>
    </div>
  );
}
