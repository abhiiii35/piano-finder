import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import {
  NATIONAL_HIGH,
  NATIONAL_LOW,
  PITCH_RAISE_HIGH,
  PITCH_RAISE_LOW,
  formatRange,
} from "@/lib/seo/city-cost-data";
import { buildFaqPageSchema } from "@/lib/seo/schema";

const YEAR = new Date().getFullYear();
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const pitchRaiseFaqs = [
  {
    question: "What is a pitch raise?",
    answer: `A pitch raise is a preliminary rough pass that raises all strings of a flat piano slightly above target pitch. It's necessary when a piano has drifted significantly below standard pitch (A440). The technician then performs a fine tuning on top of this raised base, making it two passes in one appointment, typically adding ${formatRange(PITCH_RAISE_LOW, PITCH_RAISE_HIGH)} and 30–45 minutes to the standard tuning.`,
  },
  {
    question: "Why is a pitch raise necessary?",
    answer:
      "When a piano is severely flat, fine-tuning it in one pass doesn't work. Pulling all 230 strings up to correct tension in a single fine pass would compress the soundboard and cause all the strings you've already tuned to slip back down. The pitch raise settles the structure under new tension so the fine tuning can hold.",
  },
  {
    question: "Do I always need a pitch raise?",
    answer: `No. If your piano was tuned within the last year and stays close to pitch, you need only a standard tuning. A pitch raise is likely if 2–4 years have passed since the last tuning, especially in homes with dry winter heat. For pianos tuned more than 5 years ago, recently moved, or inherited, budget for a pitch raise and possibly a follow-up tuning a few weeks later.`,
  },
  {
    question: "How can I avoid paying for a pitch raise?",
    answer:
      "Tune on schedule. An annual tuning keeps your piano close enough to pitch that only a standard tuning is needed. One skipped decade costs more than ten years of regular tunings combined — and your piano sounds worse the whole time.",
  },
  {
    question: "Will one pitch raise fix a severely flat piano?",
    answer:
      "Sometimes not completely. After a pitch raise, newly-raised strings keep stretching for a few weeks. For pianos that have been silent for years or severely neglected, the tuning may not hold perfectly until a follow-up tuning 2–4 weeks later. A good technician will be honest about this upfront.",
  },
];

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: `Pitch Raise Explained: Why a Neglected Piano Costs More to Tune (${YEAR}) | Book A Piano Tuner`,
  description: `A pitch raise adds ${formatRange(PITCH_RAISE_LOW, PITCH_RAISE_HIGH)} to a piano tuning — here's exactly why, when you need one, and how to avoid paying for it twice.`,
  alternates: { canonical: "/piano-tuning-cost/pitch-raise" },
  openGraph: {
    title: "Pitch raise explained: why a neglected piano costs more to tune",
    description: `The honest explanation of the #1 surprise fee in piano tuning — and why it's real work, not padding.`,
    url: "/piano-tuning-cost/pitch-raise",
    type: "article",
  },
};

export default function PitchRaisePage() {
  const pitchRange = formatRange(PITCH_RAISE_LOW, PITCH_RAISE_HIGH);
  const faqSchema = buildFaqPageSchema(pitchRaiseFaqs);

  return (
    <article className="mx-auto max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <header>
        <Badge variant="secondary">Pricing Guide</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Pitch raise explained: why a neglected piano costs more to tune
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          You got a quote for {formatRange(NATIONAL_LOW, NATIONAL_HIGH)}, the
          tuner showed up, played a few notes, and said it&apos;ll be{" "}
          {pitchRange} more. Before you assume you&apos;re being hustled:
          this is the most common — and most legitimate — extra charge in
          piano tuning. Here&apos;s what&apos;s actually going on.
        </p>
      </header>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          The physics, briefly
        </h2>
        <p className="text-muted-foreground">
          A piano has around 230 strings under a combined 18+ tons of tension,
          all anchored to a wooden soundboard that flexes with the seasons.
          Strings slowly lose tension whether you play or not. Tune the piano
          every year and the drift is small — the technician nudges everything
          back to standard pitch (A440) in one pass.
        </p>
        <p className="text-muted-foreground">
          Skip a few years and the whole instrument sags well below pitch.
          Now there&apos;s a problem: when a tuner pulls one string up to
          correct tension, the added load compresses the soundboard and
          detunes its neighbors. Pull all 230 strings up in a single fine
          pass and by the time you reach the last string, the first ones have
          already slipped. The tuning collapses as it&apos;s being built.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          What a pitch raise actually is
        </h2>
        <p className="text-muted-foreground">
          The fix is a two-pass job. First, a quick rough pass — the pitch
          raise — pulls every string slightly <em>above</em> target so the
          structure can settle under the new tension. Then the fine tuning is
          done on top of that stable base. Same visit, but genuinely more
          work: expect the appointment to run 30–45 minutes longer and cost{" "}
          <strong className="text-foreground">{pitchRange} extra</strong> on
          top of the standard tuning fee.
        </p>
        <p className="text-muted-foreground">
          If a piano is severely flat — say, silent for a decade or two — one
          visit may not be enough. Freshly raised strings keep stretching, so
          many technicians will honestly tell you the tuning won&apos;t hold
          perfectly and recommend a follow-up a few weeks later.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Do you need one?
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>
            <strong className="text-foreground">Tuned within the last
            year:</strong>{" "}
            almost certainly not — you&apos;re looking at a standard tuning.
          </li>
          <li>
            <strong className="text-foreground">2–4 years since tuning:</strong>{" "}
            likely, especially if the piano lives with dry winter heat.
          </li>
          <li>
            <strong className="text-foreground">5+ years, a recent move, or
            an inherited piano:</strong>{" "}
            plan on it, and possibly a follow-up tuning.
          </li>
        </ul>
        <p className="text-muted-foreground">
          A technician can confirm in the first few minutes with a pitch
          check. A good one tells you the full price <em>before</em> starting
          — if someone springs it on you at the end, that&apos;s a red flag
          about the tuner, not about pitch raises.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          How to avoid paying for it again
        </h2>
        <p className="text-muted-foreground">
          Tune on a schedule. An annual tuning (twice yearly for
          heavily-played pianos or homes with big humidity swings) keeps the
          piano close enough to pitch that a single pass does the job. One
          skipped decade costs more than ten years of regular tunings buys —
          and the piano sounds worse the whole time.
        </p>
      </section>

      <section className="mt-12 rounded-lg border bg-secondary p-6 sm:p-8">
        <h2 className="text-xl font-semibold">
          Get an honest, all-in quote
        </h2>
        <p className="mt-2 text-muted-foreground">
          Technicians on Book A Piano Tuner list real prices upfront —
          including pitch raise fees — so the number you see is the number
          you pay.
        </p>
        <Link
          href="/search"
          className={cn(buttonVariants({ size: "lg" }), "mt-4")}
        >
          Find a piano tuner
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </section>

      <nav className="mt-10 space-y-2 text-sm text-muted-foreground">
        <div>
          <Link
            href="/piano-tuning-cost"
            className="underline underline-offset-4 hover:text-foreground"
          >
            ← Piano tuning costs by city
          </Link>
        </div>
      </nav>
    </article>
  );
}
