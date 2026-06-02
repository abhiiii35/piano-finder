"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAnimateOnScroll } from "@/hooks/use-animate-on-scroll";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  Search,
  MapPin,
  CalendarCheck,
  ShieldCheck,
  Star,
  CheckCircle2,
  ArrowRight,
  Quote,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [howItWorksRef, howItWorksVisible] = useAnimateOnScroll();
  const [testimonialsRef, testimonialsVisible] = useAnimateOnScroll();
  const [forTechniciansRef, forTechniciansVisible] = useAnimateOnScroll();

  // Scroll to the hash section when arriving from another route (e.g. the header
  // "How it works" link navigates to "/#how-it-works"); App Router does not scroll
  // to fragments on client-side navigation, so we do it here on mount.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    requestAnimationFrame(() =>
      el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" })
    );
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-secondary to-background px-4 pb-16 pt-20 sm:pt-28 sm:pb-20">
          <div className="relative mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-2">
            {/* Left: headline + search */}
            <div className="text-center lg:text-left">
              <div className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3.5 py-1 text-sm font-medium text-accent">
                <span>The #1 Piano Technician Platform</span>
              </div>

              <h1 className="animate-fade-up animation-delay-100 mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Your piano deserves{" "}
                <span className="text-accent">expert care</span>
              </h1>

              <p className="animate-fade-up animation-delay-200 mt-6 text-lg leading-relaxed text-muted-foreground">
                Find certified piano tuners and technicians near you. Book online,
                pay securely, and keep your piano sounding its best.
              </p>

              {/* Search Bar */}
              <form
                onSubmit={handleSearch}
                className="animate-fade-up animation-delay-300 mx-auto mt-10 flex max-w-md items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm transition-shadow focus-within:shadow-md focus-within:border-border lg:mx-0"
              >
                <div className="flex flex-1 items-center gap-2 pl-3">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Enter your city or zip code"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Search className="h-4 w-4" />
                  Find Tuners
                </button>
              </form>

              {/* Benefit pills */}
              <div className="animate-fade-up animation-delay-400 mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:mx-0 lg:justify-start">
                {[
                  { icon: CalendarCheck, label: "Instant booking" },
                  { icon: ShieldCheck, label: "Verified credentials" },
                  { icon: CheckCircle2, label: "No phone calls" },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <item.icon className="h-4 w-4 text-accent" />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Every piano tells a story (above the fold — animate immediately) */}
            <div className="text-center lg:text-left">
              <div className="animate-fade-in mx-auto mb-6 h-px w-16 bg-accent lg:mx-0" />
              <blockquote className="animate-fade-up animation-delay-100 text-2xl font-light leading-relaxed tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                Every piano tells a story.
                <br />
                <span className="text-accent">We connect you with technicians who listen.</span>
              </blockquote>
              <p className="animate-fade-up animation-delay-200 mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground lg:mx-0">
                Whether it&apos;s a family heirloom or a concert grand, your piano
                deserves someone who understands its voice. Our technicians bring
                decades of experience and genuine care to every instrument.
              </p>
              <div className="animate-fade-in animation-delay-300 mx-auto mt-6 h-px w-16 bg-accent lg:mx-0" />
            </div>
          </div>

          {/* Piano key motif */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 opacity-[0.06]"
            style={{
              maskImage: "linear-gradient(to bottom, transparent, black 40%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 40%)",
            }}
          >
            <svg
              className="h-full w-full"
              viewBox="0 0 1400 80"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* White keys */}
              {Array.from({ length: 28 }, (_, i) => (
                <rect
                  key={`w${i}`}
                  x={i * 50}
                  y="0"
                  width="48"
                  height="80"
                  fill="currentColor"
                  className="text-foreground"
                />
              ))}
              {/* Black keys */}
              {[1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 22, 23, 25, 26, 27].map(
                (i) => (
                  <rect
                    key={`b${i}`}
                    x={i * 50 - 15}
                    y="0"
                    width="30"
                    height="50"
                    fill="currentColor"
                    className="text-foreground"
                    opacity="0.6"
                  />
                )
              )}
            </svg>
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="scroll-mt-24 px-4 py-20"
          ref={howItWorksRef}
        >
          <div className="mx-auto max-w-5xl">
            <h2
              className={`text-center text-3xl font-bold text-foreground transition-opacity duration-500 ${
                howItWorksVisible ? "animate-fade-in" : "opacity-0"
              }`}
            >
              How it works
            </h2>
            <p
              className={`mt-3 text-center text-muted-foreground transition-opacity duration-500 ${
                howItWorksVisible ? "animate-fade-in" : "opacity-0"
              }`}
            >
              Book a piano tuner in three simple steps
            </p>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Search,
                  title: "Easy Discovery",
                  description:
                    "Search by location, read reviews, compare prices, and find the perfect technician for your piano.",
                },
                {
                  icon: CalendarCheck,
                  title: "Instant Booking",
                  description:
                    "Book appointments online in seconds. No phone calls, no waiting. Real-time availability.",
                },
                {
                  icon: ShieldCheck,
                  title: "Verified Professionals",
                  description:
                    "Every technician is verified with credentials, certifications, and background checks.",
                },
                {
                  icon: Star,
                  title: "Transparent Reviews",
                  description:
                    "Read honest reviews from real customers. See ratings, photos, and detailed service feedback.",
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className={`rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                    howItWorksVisible
                      ? `animate-fade-up animation-delay-${(i + 1) * 100}`
                      : "opacity-0"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary transition-transform duration-300 hover:scale-110">
                    <step.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-y border-border bg-secondary/50 px-4 py-20" ref={testimonialsRef}>
          <div className="mx-auto max-w-5xl">
            <p
              className={`text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground ${
                testimonialsVisible ? "animate-fade-in" : "opacity-0"
              }`}
            >
              Trusted by piano owners
            </p>

            <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
              {/* Featured testimonial — large */}
              <div
                className={`relative rounded-2xl border border-border bg-card p-8 shadow-sm ${
                  testimonialsVisible ? "animate-fade-up animation-delay-100" : "opacity-0"
                }`}
              >
                <Quote className="absolute right-6 top-6 h-8 w-8 text-accent/20" />
                <p className="text-lg leading-relaxed text-foreground">
                  &ldquo;I&apos;ve been searching for a reliable tuner for years.
                  Within 10 minutes I found someone with 20 years of experience,
                  read their reviews, and booked for the same week. My Steinway
                  has never sounded better.&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    SM
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Sarah Mitchell
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Steinway owner &middot; Boston, MA
                    </p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Stacked smaller testimonials */}
              <div className="flex flex-col gap-6">
                <div
                  className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${
                    testimonialsVisible ? "animate-fade-up animation-delay-200" : "opacity-0"
                  }`}
                >
                  <p className="text-sm leading-relaxed text-foreground">
                    &ldquo;The booking process was incredibly smooth. Our technician
                    was punctual, professional, and took the time to explain
                    everything about our piano&apos;s condition.&rdquo;
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent-foreground">
                      TW
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Tom Williams
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Yamaha owner &middot; Chicago, IL
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${
                    testimonialsVisible ? "animate-fade-up animation-delay-300" : "opacity-0"
                  }`}
                >
                  <p className="text-sm leading-relaxed text-foreground">
                    &ldquo;As a piano teacher, I need my instruments in top shape.
                    PianoTuner makes it easy to schedule regular tunings and keep
                    track of my service history.&rdquo;
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      ML
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Maria Lopez
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Piano teacher &middot; Austin, TX
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* For Technicians — dark section */}
        <section
          id="for-technicians"
          className="scroll-mt-24 bg-[#0f1729] px-4 py-20"
          ref={forTechniciansRef}
        >
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: copy */}
            <div>
              <div
                className={`inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-accent ${
                  forTechniciansVisible ? "animate-fade-up" : "opacity-0"
                }`}
              >
                For Piano Technicians
              </div>

              <h2
                className={`mt-6 text-3xl font-bold text-[#f5f0e8] sm:text-4xl ${
                  forTechniciansVisible
                    ? "animate-fade-up animation-delay-100"
                    : "opacity-0"
                }`}
              >
                Replace your entire tool stack
              </h2>

              <p
                className={`mt-4 text-[#8a94a8] leading-relaxed ${
                  forTechniciansVisible
                    ? "animate-fade-up animation-delay-200"
                    : "opacity-0"
                }`}
              >
                PianoTuner replaces Square, QuickBooks, Google Calendar, and paper
                logs. Everything you need to run your business in one platform.
              </p>

              <ul
                className={`mt-8 space-y-3 ${
                  forTechniciansVisible
                    ? "animate-fade-up animation-delay-300"
                    : "opacity-0"
                }`}
              >
                {[
                  "Manage bookings, invoicing, and payments in one place",
                  "Automated 6-month and annual tuning reminders",
                  "Customer CRM with piano details and service history",
                  "Route optimization for daily scheduling",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span className="text-sm text-[#c5c9d4]">{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={`group mt-10 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all duration-300 hover:bg-accent/90 ${
                  forTechniciansVisible
                    ? "animate-fade-up animation-delay-400"
                    : "opacity-0"
                }`}
              >
                Join as a Technician
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Right: schedule mockup */}
            <div
              className={`rounded-xl border border-[#1e2d4a] bg-[#162040] p-6 shadow-lg ${
                forTechniciansVisible
                  ? "animate-fade-in animation-delay-200"
                  : "opacity-0"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#f5f0e8]">
                  Today&apos;s Schedule
                </h3>
                <span className="text-sm text-[#8a94a8]">March 29</span>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  {
                    time: "9:00 AM",
                    name: "Sarah M.",
                    service: "Tuning - Steinway Grand",
                  },
                  {
                    time: "11:30 AM",
                    name: "Tom W.",
                    service: "Repair - Yamaha Upright",
                  },
                  {
                    time: "2:00 PM",
                    name: "Maria L.",
                    service: "Regulation - Bosendorfer",
                  },
                ].map((appointment, i) => (
                  <div
                    key={appointment.time}
                    className={`flex items-center gap-4 rounded-lg border border-[#1e2d4a] bg-[#162040]/50 p-4 ${
                      forTechniciansVisible
                        ? `animate-slide-in-right animation-delay-${(i + 2) * 200}`
                        : "opacity-0"
                    }`}
                  >
                    <span className="text-sm font-semibold text-accent w-20 shrink-0">
                      {appointment.time}
                    </span>
                    <div>
                      <p className="font-medium text-[#f5f0e8] text-sm">
                        {appointment.name}
                      </p>
                      <p className="text-xs text-[#8a94a8]">
                        {appointment.service}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
