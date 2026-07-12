import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, MapPin } from "lucide-react";
import {
  CITY_COSTS,
  NATIONAL_HIGH,
  NATIONAL_LOW,
  PITCH_RAISE_HIGH,
  PITCH_RAISE_LOW,
  formatRange,
} from "@/lib/seo/city-cost-data";

const YEAR = new Date().getFullYear();
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: `How Much Does Piano Tuning Cost? (${YEAR}) | Book A Piano Tuner`,
  description: `Piano tuning costs ${formatRange(NATIONAL_LOW, NATIONAL_HIGH)} in most of the US — more in NYC, Boston, and the Bay Area. Real price ranges by city, pitch raise explained, no surprises.`,
  alternates: { canonical: "/piano-tuning-cost" },
  openGraph: {
    title: `How Much Does Piano Tuning Cost? (${YEAR})`,
    description: `Real piano tuning price ranges by city — national average ${formatRange(NATIONAL_LOW, NATIONAL_HIGH)}, pitch raise explained honestly.`,
    url: "/piano-tuning-cost",
    type: "article",
  },
};

export default function PianoTuningCostIndexPage() {
  return (
    <article className="mx-auto max-w-4xl">
      <header>
        <Badge variant="secondary">Pricing Guide · {YEAR}</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          How much does piano tuning cost?
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Across the US, a standard piano tuning costs{" "}
          <strong className="text-foreground">
            {formatRange(NATIONAL_LOW, NATIONAL_HIGH)}
          </strong>
          . Big coastal metros run higher; if your piano hasn&apos;t been tuned
          in years, expect a pitch raise fee of{" "}
          {formatRange(PITCH_RAISE_LOW, PITCH_RAISE_HIGH)} on top. Below are
          honest ranges by city — no teaser rates, no lead-gen games.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">
          Piano tuning cost by city
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {CITY_COSTS.map((city) => (
            <Link
              key={city.slug}
              href={`/piano-tuning-cost/${city.slug}`}
              className="group"
            >
              <Card className="h-full transition-colors group-hover:border-accent">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-accent" />
                    {city.name}, {city.state}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">
                    {formatRange(city.priceLow, city.priceHigh)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    standard tuning
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          What you&apos;re actually paying for
        </h2>
        <p className="text-muted-foreground">
          A tuning is 1–1.5 hours of skilled work: setting the tension of
          roughly 230 strings so they hold against 18+ tons of combined
          pressure. Rates reflect the technician&apos;s training, travel time,
          and local cost of living — which is why New York costs more than
          Houston for the same job.
        </p>
        <p className="text-muted-foreground">
          The number one source of sticker shock is the{" "}
          <Link
            href="/piano-tuning-cost/pitch-raise"
            className="font-medium text-accent underline underline-offset-4"
          >
            pitch raise
          </Link>
          : a piano that has gone years without tuning drifts so far below
          standard pitch that it needs a rough pre-tuning pass before the fine
          tuning. That&apos;s two passes in one visit, and it typically adds{" "}
          {formatRange(PITCH_RAISE_LOW, PITCH_RAISE_HIGH)}. A trustworthy tuner
          will tell you before starting, not after.
        </p>
      </section>

      <section className="mt-12 rounded-lg border bg-secondary p-6 sm:p-8">
        <h2 className="text-xl font-semibold">
          See real prices from tuners near you
        </h2>
        <p className="mt-2 text-muted-foreground">
          Browse verified piano technicians with upfront pricing and book a
          time online — no phone tag.
        </p>
        <Link
          href="/search"
          className={cn(buttonVariants({ size: "lg" }), "mt-4")}
        >
          Find a piano tuner
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </section>
    </article>
  );
}
