"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { createBooking, getAvailableSlots } from "@/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Service = {
  id: string;
  name: string;
  priceCents: number;
  durationMin: number;
};

type TechnicianData = {
  id: string;
  businessName: string | null;
  user: { name: string | null };
  services: Service[];
  avgRating: number;
  reviewCount: number;
  isVerified: boolean;
};

function TechnicianSidebar({
  technician,
  selectedServiceDetails,
  totalCents,
}: {
  technician: TechnicianData;
  selectedServiceDetails: Service[];
  totalCents: number;
}) {
  const displayName =
    technician.businessName || technician.user.name || "Technician";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Technician info */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-foreground truncate">
              {displayName}
            </p>
            {technician.isVerified && (
              <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
            )}
          </div>
          {technician.reviewCount > 0 && (
            <div className="mt-0.5 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="text-sm font-semibold text-foreground">
                {technician.avgRating.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({technician.reviewCount})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Running total */}
      {selectedServiceDetails.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Selected Services
          </p>
          <div className="mt-2 space-y-1.5">
            {selectedServiceDetails.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="text-foreground">{s.name}</span>
                <span className="text-muted-foreground">
                  ${(s.priceCents / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-2 font-semibold text-foreground">
            <span>Total</span>
            <span>${(totalCents / 100).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const stripeEnabled = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  const [step, setStep] = useState(1);
  const [technician, setTechnician] = useState<TechnicianData | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") ?? "");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState(searchParams.get("time") ?? "");
  const [address, setAddress] = useState({
    addressLine1: "",
    city: "",
    state: "",
    zipCode: "",
    pianoType: "",
    pianoMake: "",
    pianoModel: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [conflictSlots, setConflictSlots] = useState<string[] | null>(null);

  const totalDuration = (technician?.services ?? [])
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.durationMin, 0);

  useEffect(() => {
    fetch(`/api/technicians/${params.id}`)
      .then((r) => r.json())
      .then((data) => setTechnician(data.technician));
  }, [params.id]);

  useEffect(() => {
    if (selectedDate && params.id) {
      getAvailableSlots(params.id as string, selectedDate, totalDuration || 30).then(setAvailableSlots);
    }
  }, [selectedDate, params.id, totalDuration]);

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-lg">Please sign in to book a tuner</p>
        <Button className="mt-4" onClick={() => router.push("/sign-in")}>
          Sign In
        </Button>
      </div>
    );
  }

  if (!technician) return <p>Loading...</p>;

  const selectedServiceDetails = technician.services.filter((s) =>
    selectedServices.includes(s.id)
  );
  const totalCents = selectedServiceDetails.reduce(
    (sum, s) => sum + s.priceCents,
    0
  );

  async function handleConfirm() {
    setLoading(true);
    setConflictSlots(null);
    const result = await createBooking({
      technicianId: params.id as string,
      serviceIds: selectedServices,
      scheduledAt: `${selectedDate}T${selectedTime}:00`,
      ...address,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      if (result.availableSlots) {
        setConflictSlots(result.availableSlots);
      }
    } else {
      toast.success("Booking created!");
      router.push(`/dashboard/customer/bookings/${result.bookingId}`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl lg:max-w-5xl">
      <h1 className="text-2xl font-bold">
        Book {technician.businessName || technician.user.name}
      </h1>

      {/* Progress */}
      <div className="mt-6 flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${
              s <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Mobile tech bar */}
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card p-3 lg:hidden">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          {(technician.businessName || technician.user.name || "PT")
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {technician.businessName || technician.user.name}
          </p>
          {technician.reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="text-xs font-semibold text-foreground">
                {technician.avgRating.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({technician.reviewCount})
              </span>
            </div>
          )}
        </div>
        {totalCents > 0 && (
          <span className="text-sm font-semibold text-foreground">
            ${(totalCents / 100).toFixed(2)}
          </span>
        )}
      </div>

      {/* Grid: steps (left) + sidebar (right) */}
      <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[1fr_280px] lg:gap-8">
      <div>
        {/* Step 1: Services */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {technician.services.map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedServices([...selectedServices, service.id]);
                      } else {
                        setSelectedServices(
                          selectedServices.filter((id) => id !== service.id)
                        );
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.durationMin} min
                    </p>
                  </div>
                  <span className="font-semibold">
                    ${(service.priceCents / 100).toFixed(2)}
                  </span>
                </label>
              ))}
              <div className="pt-4 flex justify-between items-center">
                <span className="font-semibold">
                  Total: ${(totalCents / 100).toFixed(2)}
                </span>
                <Button
                  onClick={() => setStep(2)}
                  disabled={selectedServices.length === 0}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Pick a Date & Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime("");
                  }}
                />
              </div>
              {availableSlots.length > 0 && (
                <div className="space-y-2">
                  <Label>Available Times</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={selectedTime === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(slot)}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {selectedDate && availableSlots.length === 0 && (
                <p className="text-muted-foreground">
                  No available slots on this day
                </p>
              )}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!selectedTime}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Address & Piano Info */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address</Label>
                <Input
                  id="addressLine1"
                  value={address.addressLine1}
                  onChange={(e) =>
                    setAddress({ ...address, addressLine1: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) =>
                      setAddress({ ...address, city: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={address.state}
                    onChange={(e) =>
                      setAddress({ ...address, state: e.target.value })
                    }
                    maxLength={2}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip</Label>
                  <Input
                    id="zipCode"
                    value={address.zipCode}
                    onChange={(e) =>
                      setAddress({ ...address, zipCode: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pianoType">Piano Type</Label>
                  <Input
                    id="pianoType"
                    value={address.pianoType}
                    onChange={(e) =>
                      setAddress({ ...address, pianoType: e.target.value })
                    }
                    placeholder="Grand, Upright..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pianoMake">Make</Label>
                  <Input
                    id="pianoMake"
                    value={address.pianoMake}
                    onChange={(e) =>
                      setAddress({ ...address, pianoMake: e.target.value })
                    }
                    placeholder="Steinway, Yamaha..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pianoModel">Model</Label>
                  <Input
                    id="pianoModel"
                    value={address.pianoModel}
                    onChange={(e) =>
                      setAddress({ ...address, pianoModel: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={address.notes}
                  onChange={(e) =>
                    setAddress({ ...address, notes: e.target.value })
                  }
                  placeholder="Any special instructions..."
                />
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={!address.addressLine1 || !address.city || !address.state || !address.zipCode}
                >
                  Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Services</h3>
                {selectedServiceDetails.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm mt-1">
                    <span>{s.name}</span>
                    <span>${(s.priceCents / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                  <span>Total</span>
                  <span>${(totalCents / 100).toFixed(2)}</span>
                </div>
              </div>
              <div>
                <h3 className="font-medium">Date & Time</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDate} at {selectedTime} ({totalDuration} min)
                </p>
              </div>
              <div>
                <h3 className="font-medium">Location</h3>
                <p className="text-sm text-muted-foreground">
                  {address.addressLine1}, {address.city}, {address.state}{" "}
                  {address.zipCode}
                </p>
              </div>
              {address.pianoType && (
                <div>
                  <h3 className="font-medium">Piano</h3>
                  <p className="text-sm text-muted-foreground">
                    {[address.pianoType, address.pianoMake, address.pianoModel]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                </div>
              )}
              {/* What to Expect */}
              <div className="rounded-lg border border-border bg-secondary p-4">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-foreground">What to Expect</h3>
                </div>
                <ul className="mt-3 space-y-2">
                  {[
                    "Tuning typically takes 1-2 hours",
                    "Please ensure clear access to your piano",
                    "Your technician will confirm the appointment",
                    "You can message your technician after booking",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => { setConflictSlots(null); setStep(3); }}>
                  Back
                </Button>
                <Button onClick={handleConfirm} disabled={loading}>
                  {loading ? "Booking..." : stripeEnabled ? "Confirm Booking" : "Book & Pay Later"}
                </Button>
                {!stripeEnabled && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Online payments coming soon. Your technician will arrange payment directly.
                  </p>
                )}
              </div>
              {conflictSlots && (
                <div className="mt-4 rounded-lg border border-border bg-secondary p-4">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Pick a different time:
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {conflictSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={selectedTime === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedTime(slot);
                          setConflictSlots(null);
                        }}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                  {conflictSlots.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      No more slots available on this day. Please go back and pick a different date.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <TechnicianSidebar
            technician={technician}
            selectedServiceDetails={selectedServiceDetails}
            totalCents={totalCents}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
