import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowRight, CalendarCheck, Droplets, Piano, TrendingUp } from "lucide-react";
import {
  CITY_COSTS,
  PITCH_RAISE_HIGH,
  PITCH_RAISE_LOW,
  buildCityFaqs,
  formatRange,
  getCityBySlug,
} from "@/lib/seo/city-cost-data";

const YEAR = new Date().getFullYear();
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const dynamicParams = false;

export function generateStaticParams() {
  return CITY_COSTS.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return {};

  const range = formatRange(city.priceLow, city.priceHigh);
  return {
    metadataBase: new URL(BASE_URL),
    title: `Piano Tuning Cost in ${city.name} (${YEAR}) | Book A Piano Tuner`,
    description: `Piano tuning in ${city.name}, ${city.state} costs ${range} for a standard tuning. What affects the price, pitch raise fees explained, and how often to tune — with real local numbers.`,
    alternates: { canonical: `/piano-tuning-cost/${city.slug}` },
    openGraph: {
      title: `Piano Tuning Cost in ${city.name} (${YEAR})`,
      description: `A standard piano tuning in ${city.name} runs ${range}. Honest local pricing, pitch raise explained, no lead-gen games.`,
      url: `/piano-tuning-cost/${city.slug}`,
      type: "article",
    },
  };
}

export default async function CityCostPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const range = formatRange(city.priceLow, city.priceHigh);
  const pitchRange = formatRange(PITCH_RAISE_LOW, PITCH_RAISE_HIGH);
  const faqs = buildCityFaqs(city);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <article className="mx-auto max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header>
        <Badge variant="secondary">
          {city.name}, {city.state} · {YEAR}
        </Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Piano tuning cost in {city.name}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A standard piano tuning in the {city.name} area costs{" "}
          <strong className="text-foreground">{range}</strong>. If your piano
          hasn&apos;t been tuned in a few years, budget an extra {pitchRange}{" "}
          for a pitch raise — more on that below, because it&apos;s the fee
          that surprises people most.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Standard tuning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{range}</p>
            <p className="text-sm text-muted-foreground">
              piano at or near pitch
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pitch raise (if needed)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">+{pitchRange}</p>
            <p className="text-sm text-muted-foreground">
              on top of the standard tuning
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          Tuning a piano in {city.name}
        </h2>
        {city.flavor.map((sentence, i) => (
          <p key={i} className="text-muted-foreground">
            {sentence}
          </p>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">
          What affects the price
        </h2>
        <div className="mt-4 space-y-6">
          <div className="flex gap-4">
            <TrendingUp className="mt-1 h-5 w-5 shrink-0 text-accent" />
            <div>
              <h3 className="font-semibold">
                Pitch raise — the #1 surprise fee
              </h3>
              <p className="mt-1 text-muted-foreground">
                Strings lose tension over time. Skip tuning for a few years and
                the whole piano drifts noticeably below standard pitch (A440).
                The technician can&apos;t just fine-tune it there — they have
                to pull every string roughly up to pitch first, let the
                structure re-settle, then fine-tune. Two passes, one visit,
                typically {pitchRange} extra. It&apos;s legitimate work, and
                any honest tuner will tell you the full price before starting.{" "}
                <Link
                  href="/piano-tuning-cost/pitch-raise"
                  className="font-medium text-accent underline underline-offset-4"
                >
                  Read the full pitch raise explainer
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <CalendarCheck className="mt-1 h-5 w-5 shrink-0 text-accent" />
            <div>
              <h3 className="font-semibold">Time since the last tuning</h3>
              <p className="mt-1 text-muted-foreground">
                A piano tuned every year stays close to pitch and takes a
                straightforward 1–1.5 hour appointment. The longer the gap, the
                more the visit costs — regular tuning is genuinely the cheaper
                path over time.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Droplets className="mt-1 h-5 w-5 shrink-0 text-accent" />
            <div>
              <h3 className="font-semibold">Humidity and climate</h3>
              <p className="mt-1 text-muted-foreground">
                A piano&apos;s soundboard swells and shrinks with humidity,
                pushing pitch sharp in damp months and flat in dry ones. Where
                you live — and how your home is heated — directly changes how
                fast your piano drifts and how often it needs attention.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Piano className="mt-1 h-5 w-5 shrink-0 text-accent" />
            <div>
              <h3 className="font-semibold">Piano type and condition</h3>
              <p className="mt-1 text-muted-foreground">
                Grands, uprights, and spinets all fall in the same tuning
                range, but instruments with loose tuning pins, old strings, or
                deferred repairs take longer and may need work beyond the
                tuning itself — quoted separately, not smuggled into the bill.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">
          How often should you tune?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Once a year minimum for any piano that gets played; twice a year if
          it&apos;s played daily or your home sees big seasonal humidity
          swings. New pianos and pianos that just survived a move need 2–4
          tunings in the first year while the strings stretch and settle.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="mt-4 space-y-6">
          {faqs.map((faq, i) => (
            <div key={faq.question}>
              {i > 0 && <Separator className="mb-6" />}
              <h3 className="font-semibold">{faq.question}</h3>
              <p className="mt-2 text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-lg border bg-secondary p-6 sm:p-8">
        <h2 className="text-xl font-semibold">
          Find a piano tuner in {city.name}
        </h2>
        <p className="mt-2 text-muted-foreground">
          Browse verified technicians near you, see real prices upfront, and
          book online — no phone tag, no surprise fees.
        </p>
        <Link
          href="/search"
          className={cn(buttonVariants({ size: "lg" }), "mt-4")}
        >
          See available tuners
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </section>

      <nav className="mt-10 text-sm text-muted-foreground">
        <Link
          href="/piano-tuning-cost"
          className="underline underline-offset-4 hover:text-foreground"
        >
          ← Piano tuning costs in other cities
        </Link>
      </nav>
    </article>
  );
}
