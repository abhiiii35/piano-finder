# Round 3: Landing Page Personality & Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scroll-triggered animations, piano-themed hero visuals, and hover micro-interactions to the landing page.

**Architecture:** A custom `useAnimateOnScroll` hook using IntersectionObserver triggers CSS animations defined in globals.css. The landing page (`src/app/page.tsx`) uses the hook for scroll-triggered sections and CSS animation-delay for the hero entrance. No external animation libraries.

**Tech Stack:** React 19, Tailwind v4, CSS @keyframes, IntersectionObserver API

**Spec:** `docs/superpowers/specs/2026-04-12-round3-landing-motion-design.md`

---

### Task 1: Animation infrastructure — hook + CSS keyframes

**Files:**
- Create: `src/hooks/use-animate-on-scroll.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create the useAnimateOnScroll hook**

Create `src/hooks/use-animate-on-scroll.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

export function useAnimateOnScroll(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
```

- [ ] **Step 2: Add CSS keyframes and animation utilities to globals.css**

In `src/app/globals.css`, add the following at the end of the file (after the `@layer base` block):

```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@layer utilities {
  .animate-fade-up {
    animation: fade-up 0.6s ease-out both;
  }

  .animate-fade-in {
    animation: fade-in 0.6s ease-out both;
  }

  .animate-slide-in-right {
    animation: slide-in-right 0.5s ease-out both;
  }

  .animation-delay-100 { animation-delay: 100ms; }
  .animation-delay-200 { animation-delay: 200ms; }
  .animation-delay-300 { animation-delay: 300ms; }
  .animation-delay-400 { animation-delay: 400ms; }
  .animation-delay-500 { animation-delay: 500ms; }
  .animation-delay-600 { animation-delay: 600ms; }
  .animation-delay-700 { animation-delay: 700ms; }
  .animation-delay-800 { animation-delay: 800ms; }
}
```

The `both` value in `animation-fill-mode` (shorthand in the `animation` property) ensures elements stay in their final animated state. The `@layer utilities` makes these classes available as Tailwind utilities.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-animate-on-scroll.ts src/app/globals.css
git commit -m "feat: add scroll animation hook and CSS keyframe utilities"
```

---

### Task 2: Hero section redesign — benefit pills, piano keys, entrance animations

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the stats section with benefit pills and add piano key SVG**

In `src/app/page.tsx`, replace the entire hero `<section>` (from `{/* Hero */}` through the closing `</section>` that contains the stats grid) with:

```tsx
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
```

Key changes:
- Each hero element gets `animate-fade-up` with staggered `animation-delay-*` classes
- Stats grid removed, replaced with 3 benefit pills (icon + label)
- Piano key SVG added as absolutely-positioned element at bottom of hero
- Hero section gets `relative overflow-hidden` for the SVG positioning
- SVG uses `currentColor` with `text-foreground` class so it adapts to dark mode
- Gradient mask fades keys in from top (transparent) to bottom (solid)

- [ ] **Step 2: Verify hero in browser**

Run: `npx next dev`. The hero should show staggered fade-up animation on page load. Benefit pills replace stats. Piano keys should be barely visible at the bottom edge. Check dark mode too.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redesign hero with benefit pills, piano key motif, and entrance animations"
```

---

### Task 3: Section animations — How It Works + For Technicians

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add the useAnimateOnScroll import**

At the top of `src/app/page.tsx`, add to the imports:

```tsx
import { useAnimateOnScroll } from "@/hooks/use-animate-on-scroll";
```

- [ ] **Step 2: Add scroll animation hooks inside the component**

Inside the `HomePage` function, after the existing `useState` declarations, add:

```tsx
  const howItWorks = useAnimateOnScroll();
  const forTechnicians = useAnimateOnScroll();
```

- [ ] **Step 3: Replace the How It Works section**

Replace the entire `{/* How It Works */}` section with:

```tsx
        {/* How It Works */}
        <section className="px-4 py-20" ref={howItWorks.ref}>
          <div className="mx-auto max-w-5xl">
            <h2
              className={`text-center text-3xl font-bold text-foreground transition-opacity duration-500 ${
                howItWorks.isVisible ? "animate-fade-in" : "opacity-0"
              }`}
            >
              How it works
            </h2>
            <p
              className={`mt-3 text-center text-muted-foreground transition-opacity duration-500 ${
                howItWorks.isVisible ? "animate-fade-in" : "opacity-0"
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
                    howItWorks.isVisible
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
```

Key changes:
- Section gets `ref={howItWorks.ref}`
- Heading/subheading: conditional `animate-fade-in` or `opacity-0`
- Cards: conditional `animate-fade-up` with staggered delays via `animation-delay-${(i+1)*100}`
- Cards get `transition-all duration-300 hover:-translate-y-1 hover:shadow-md`
- Icon wrappers get `transition-transform duration-300 hover:scale-110`

Note: The dynamic class `animation-delay-${(i+1)*100}` generates `animation-delay-100`, `animation-delay-200`, `animation-delay-300`, `animation-delay-400` which are all defined in globals.css.

- [ ] **Step 4: Replace the For Technicians section**

Replace the entire `{/* For Technicians — dark section */}` section with:

```tsx
        {/* For Technicians — dark section */}
        <section className="bg-[#0f1729] px-4 py-20" ref={forTechnicians.ref}>
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: copy */}
            <div>
              <div
                className={`inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-accent ${
                  forTechnicians.isVisible ? "animate-fade-up" : "opacity-0"
                }`}
              >
                For Piano Technicians
              </div>

              <h2
                className={`mt-6 text-3xl font-bold text-[#f5f0e8] sm:text-4xl ${
                  forTechnicians.isVisible
                    ? "animate-fade-up animation-delay-100"
                    : "opacity-0"
                }`}
              >
                Replace your entire tool stack
              </h2>

              <p
                className={`mt-4 text-[#8a94a8] leading-relaxed ${
                  forTechnicians.isVisible
                    ? "animate-fade-up animation-delay-200"
                    : "opacity-0"
                }`}
              >
                PianoTune replaces Square, QuickBooks, Google Calendar, and paper
                logs. Everything you need to run your business in one platform.
              </p>

              <ul
                className={`mt-8 space-y-3 ${
                  forTechnicians.isVisible
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
                  forTechnicians.isVisible
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
                forTechnicians.isVisible
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
                      forTechnicians.isVisible
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
```

Key changes:
- Section gets `ref={forTechnicians.ref}`
- Left side elements get conditional `animate-fade-up` with staggered delays (0 through 400ms)
- Schedule card container gets `animate-fade-in animation-delay-200`
- Schedule rows get `animate-slide-in-right` with staggered delays (600ms, 800ms, 1000ms) — computed as `animation-delay-${(i + 2) * 200 + 200}` which produces `animation-delay-600`, `animation-delay-800` (need to add 1000ms delay to globals.css — see note below)
- CTA button gets `group` class, arrow gets `group-hover:translate-x-1`

Schedule row delays: `animation-delay-${(i + 2) * 200}` produces `animation-delay-400`, `animation-delay-600`, `animation-delay-800` — all defined in globals.css.

- [ ] **Step 5: Verify all animations in browser**

Run: `npx next dev`. Check:
1. Hero: staggered fade-up on page load, benefit pills visible, piano keys at bottom
2. Scroll to "How It Works": cards stagger in left-to-right
3. Hover a card: lifts slightly with shadow
4. Hover an icon: scales up
5. Scroll to "For Technicians": copy fades up left side, schedule card fades in, rows slide in from right one by one
6. Hover CTA: arrow slides right
7. Check dark mode: all animations work, piano keys visible

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add scroll-triggered animations and hover effects to landing page sections"
```

---

### Task 4: Run tests and final verification

**Files:** None (verification only)

- [ ] **Step 1: Run test suite**

Run: `npm run test:run`
Expected: All 184 tests pass (no test changes — animations are visual-only).

- [ ] **Step 2: Final visual check**

Check both light and dark mode:
- Hero entrance animation plays smoothly
- Piano keys motif visible at bottom of hero (subtle, ~6% opacity)
- Benefit pills display correctly (3 items, centered, wrapping on mobile)
- "How It Works" cards stagger in on scroll
- Card hover lifts and shadows
- "For Technicians" copy staggers in
- Schedule rows slide in from right
- CTA arrow slides on hover
- Mobile viewport (375px): all animations work, nothing overflows

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve remaining Round 3 animation issues"
```
