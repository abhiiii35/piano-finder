"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

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
          <div className="mx-auto max-w-3xl text-center">
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
              className="animate-fade-up animation-delay-300 mx-auto mt-10 flex max-w-md items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm transition-shadow focus-within:shadow-md focus-within:border-border"
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
            <div className="animate-fade-up animation-delay-400 mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
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
        <section className="px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold text-foreground">
              How it works
            </h2>
            <p className="mt-3 text-center text-muted-foreground">
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
                  className="rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
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

        {/* For Technicians — dark section */}
        <section className="bg-[#0f1729] px-4 py-20">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                For Piano Technicians
              </div>

              <h2 className="mt-6 text-3xl font-bold text-[#f5f0e8] sm:text-4xl">
                Replace your entire tool stack
              </h2>

              <p className="mt-4 text-[#8a94a8] leading-relaxed">
                PianoTune replaces Square, QuickBooks, Google Calendar, and paper
                logs. Everything you need to run your business in one platform.
              </p>

              <ul className="mt-8 space-y-3">
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
                className="mt-10 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
              >
                Join as a Technician
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Right: schedule mockup */}
            <div className="rounded-xl border border-[#1e2d4a] bg-[#162040] p-6 shadow-lg">
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
                ].map((appointment) => (
                  <div
                    key={appointment.time}
                    className="flex items-center gap-4 rounded-lg border border-[#1e2d4a] bg-[#162040]/50 p-4"
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
