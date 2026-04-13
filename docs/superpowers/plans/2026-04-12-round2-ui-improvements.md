# Round 2 UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 independent UI improvements: mobile bottom nav, rating-first search cards, dashboard redesigns, and booking flow trust signals.

**Architecture:** 4 parallel agents, each owning non-overlapping files. Agent 1 creates a new bottom nav component and modifies 2 layout files. Agent 2 modifies one search card component. Agent 3 modifies 2 dashboard pages. Agent 4 modifies the booking page and extends its API data.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, lucide-react, next-auth, Prisma 7

**Spec:** `docs/superpowers/specs/2026-04-12-round2-ui-improvements-design.md`

---

## Agent 1: Mobile Bottom Navigation

### Task 1: Create BottomNav component

**Files:**
- Create: `src/components/layout/bottom-nav.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/layout/bottom-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Search, Briefcase, LayoutDashboard, User } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Hide during booking flow
  if (pathname.match(/^\/technicians\/[^/]+\/book/)) return null;

  const dashboardHref = session
    ? session.user.role === "TECHNICIAN"
      ? "/dashboard/technician"
      : "/dashboard/customer"
    : null;

  const allTabs = [
    ...tabs,
    dashboardHref
      ? { href: dashboardHref, label: "Dashboard", icon: LayoutDashboard }
      : { href: "/sign-in", label: "Sign In", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card sm:hidden">
      <div className="flex justify-around items-center py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {allTabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
              {isActive && (
                <span className="h-1 w-1 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

Key details:
- `sm:hidden` — only shows on mobile
- `env(safe-area-inset-bottom)` — handles iPhone home bar
- Active detection: exact match for `/`, startsWith for others
- Hidden when pathname matches `/technicians/*/book`
- Dashboard tab adapts to user role, falls back to Sign In

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/bottom-nav.tsx
git commit -m "feat: add mobile bottom navigation component"
```

---

### Task 2: Add BottomNav to layouts and add body padding

**Files:**
- Modify: `src/app/(public)/layout.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Update public layout**

Replace the contents of `src/app/(public)/layout.tsx` with:

```tsx
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-20 sm:px-6 sm:pb-8 lg:px-8">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
```

Changes: import `BottomNav`, render after `Footer`, add `pb-20 sm:pb-8` to main for bottom padding on mobile.

- [ ] **Step 2: Update dashboard layout**

Replace the contents of `src/app/(dashboard)/layout.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-20 sm:px-6 sm:pb-8 lg:px-8">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
```

Same changes: import `BottomNav`, render after `Footer`, add `pb-20 sm:pb-8` to main.

- [ ] **Step 3: Verify in browser**

Open at 375px width. Bottom nav should show 4 tabs. Toggle to desktop width — nav should disappear. Navigate between pages — active tab should highlight. Go to a booking page — nav should hide.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/layout.tsx src/app/\(dashboard\)/layout.tsx
git commit -m "feat: render bottom nav in public and dashboard layouts with mobile padding"
```

---

## Agent 2: Search Card Hierarchy (Rating-First)

### Task 3: Rearrange technician card layout

**Files:**
- Modify: `src/components/search/technician-card.tsx`

- [ ] **Step 1: Rewrite the card JSX with rating-first hierarchy**

Replace the return statement in `TechnicianCard` (everything inside the `<Link>` wrapper) with:

```tsx
  return (
    <Link href={`/technicians/${id}`} className="block">
      <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
        {/* Top row: avatar + name (left), rating badge (right) */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${colorFromId(id)}`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-base font-bold text-foreground">
                  {displayName}
                </h3>
                {isVerified && (
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {city && state && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {city}, {state}
                  </span>
                )}
                {yearsExperience && <span>{yearsExperience}yr exp</span>}
                {distanceMiles != null && (
                  <span className="text-accent font-medium">
                    {distanceMiles} mi
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rating badge - prominent, top-right */}
          {reviewCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 shrink-0">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="text-base font-bold text-foreground">
                {avgRating.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">({reviewCount})</span>
            </div>
          )}
        </div>

        {/* Instant Book badge */}
        <div className="mt-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
            <Zap className="h-3 w-3" />
            Instant Book
          </span>
        </div>

        {/* Service tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleServices.map((svc) => (
            <span
              key={svc.name}
              className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {svc.name}
            </span>
          ))}
          {overflow > 0 && (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              +{overflow}
            </span>
          )}
        </div>

        {/* Price - bottom right */}
        {minPrice > 0 && (
          <div className="mt-4 flex items-baseline justify-end">
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Starting at</span>
              <p className="text-xl font-bold text-foreground">
                ${(minPrice / 100).toFixed(0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
```

Key changes from previous layout:
- Rating badge moves to top-right with `bg-secondary` background, larger star icon (h-4 w-4), `text-base font-bold` rating text
- Name bumped to `text-base font-bold`
- Top row uses `justify-between` to push rating right
- "Instant Book" gets its own row (no longer inline with rating)
- Price aligned to bottom-right with `justify-end`

- [ ] **Step 2: Verify in browser**

Open search results page. Cards should show rating badge prominently in top-right. Name should be visually dominant. Scan multiple cards — rating should be the first thing your eye catches.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/technician-card.tsx
git commit -m "feat: rearrange technician card with rating-first visual hierarchy"
```

---

## Agent 3: Dashboard Improvements

### Task 4: Technician dashboard — hero calendar

**Files:**
- Modify: `src/app/(dashboard)/dashboard/technician/page.tsx`

- [ ] **Step 1: Move calendar above tabs**

In `src/app/(dashboard)/dashboard/technician/page.tsx`, the calendar is currently rendered inside the `{activeTab === "bookings" && ...}` block. We need to:

1. Always fetch calendar bookings (not just when activeTab is "bookings")
2. Render the Calendar component between the stat cards and the tabs
3. Remove the Calendar from inside the bookings tab (keep only BookingFilter and list)

First, change the `tabBookings` fetch condition. Find:

```tsx
  const tabBookings: CalendarBooking[] =
    activeTab === "bookings"
      ? (
```

Replace the condition so bookings are always fetched (remove the `activeTab === "bookings"` guard):

```tsx
  const calendarBookings: CalendarBooking[] = (
```

And remove the corresponding `: [];` at the end — the array is always populated now. The closing should become just `);` instead of `): [];`.

Then, in the JSX, add the calendar between stat cards and tabs. Find the `{/* Tabs */}` comment and insert before it:

```tsx
      {/* Hero Calendar */}
      <div className="mt-8">
        <Calendar
          bookings={calendarBookings}
          initialDate={format(calendarDate, "yyyy-MM-dd")}
          initialView={calendarView}
        />
      </div>
```

Then, inside the bookings tab content, remove the `<Calendar>` component. Change the bookings tab block from:

```tsx
        {activeTab === "bookings" && (
          <>
            <BookingFilter currentFilter={filter} />
            <Calendar
              bookings={tabBookings}
              initialDate={format(calendarDate, "yyyy-MM-dd")}
              initialView={calendarView}
            />
          </>
        )}
```

To:

```tsx
        {activeTab === "bookings" && (
          <BookingFilter currentFilter={filter} />
        )}
```

Also update any remaining references from `tabBookings` to `calendarBookings` if used elsewhere in the file.

- [ ] **Step 2: Verify in browser**

Open technician dashboard. Calendar should appear directly below stat cards, before the tabs. Clicking the "Bookings" tab should show only the filter controls, not a duplicate calendar.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/technician/page.tsx
git commit -m "feat: move calendar to hero position on technician dashboard"
```

---

### Task 5: Customer dashboard — upcoming bookings + rebook

**Files:**
- Modify: `src/app/(dashboard)/dashboard/customer/page.tsx`

- [ ] **Step 1: Rewrite the customer dashboard**

Replace the entire contents of `src/app/(dashboard)/dashboard/customer/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalendarDays, Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default async function CustomerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CUSTOMER") redirect("/dashboard");

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    include: {
      technician: {
        select: {
          id: true,
          businessName: true,
          user: { select: { name: true } },
        },
      },
      services: {
        include: { service: { select: { name: true } } },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  const upcoming = bookings.filter(
    (b) => b.status === "CONFIRMED" || b.status === "PENDING"
  );
  const past = bookings
    .filter((b) => b.status === "COMPLETED")
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back, {session.user.name}
      </p>

      {/* Upcoming booking hero */}
      <div className="mt-8">
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((booking) => {
              const techName =
                booking.technician.businessName ||
                booking.technician.user.name ||
                "Technician";
              const techInitials = techName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const serviceName = booking.services
                .map((s) => s.service.name)
                .join(", ");
              const relativeTime = formatDistanceToNow(booking.scheduledAt, {
                addSuffix: true,
              });

              return (
                <div
                  key={booking.id}
                  className="rounded-xl border border-border border-l-4 border-l-accent bg-card p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {booking.status === "PENDING" ? "Pending" : "Upcoming"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                      {techInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">
                        {techName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {serviceName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.scheduledAt.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {booking.scheduledAt.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/customer/bookings/${booking.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">
              No upcoming appointments
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Find a technician and book your next tuning
            </p>
            <Link href="/search" className="mt-4 inline-block">
              <Button>
                <Search className="mr-2 h-4 w-4" />
                Find a Piano Tuner
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Past bookings with rebook */}
      {past.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Past Bookings
            </h2>
            <Link
              href="/dashboard/customer/bookings"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {past.map((booking) => {
              const techName =
                booking.technician.businessName ||
                booking.technician.user.name ||
                "Technician";
              const techInitials = techName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const serviceName = booking.services
                .map((s) => s.service.name)
                .join(", ");

              return (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-foreground">
                    {techInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{techName}</p>
                    <p className="text-sm text-muted-foreground">
                      {serviceName} &middot;{" "}
                      {booking.scheduledAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Link
                    href={`/technicians/${booking.technician.id}/book`}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
                  >
                    Rebook
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

Key changes from current:
- Removed stat cards — replaced with actionable content
- Upcoming bookings as hero cards with gold left-border accent
- Past bookings with "Rebook" buttons linking to `/technicians/[id]/book`
- Empty state with icon + CTA
- Fetches bookings with technician and service relations (new `include` clause)
- Uses `formatDistanceToNow` from date-fns for relative time display

- [ ] **Step 2: Verify in browser**

Log in as a customer. Dashboard should show upcoming booking card (or empty state). Past bookings with "Rebook" buttons below. Click "Rebook" — should navigate to the correct technician's booking page.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/customer/page.tsx
git commit -m "feat: redesign customer dashboard with upcoming bookings and rebook"
```

---

## Agent 4: Booking Flow Trust Signals

### Task 6: Extend booking page API data to include rating

**Files:**
- Modify: `src/app/api/technicians/[id]/route.ts` (check current state and extend response)

- [ ] **Step 1: Extend the API route to include rating data**

Replace the contents of `src/app/api/technicians/[id]/route.ts` with:

```typescript
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [technician, reviewAgg] = await Promise.all([
    prisma.technicianProfile.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        services: { where: { isActive: true }, orderBy: { priceCents: "asc" } },
      },
    }),
    prisma.review.aggregate({
      _avg: { rating: true },
      _count: true,
      where: { booking: { technicianId: id } },
    }),
  ]);

  if (!technician) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    technician: {
      ...technician,
      avgRating: reviewAgg._avg.rating ?? 0,
      reviewCount: reviewAgg._count,
    },
  });
}
```

Changes: added `Promise.all` to fetch review aggregate in parallel, spread technician data with `avgRating` and `reviewCount` fields. The `isVerified` field is already on the technician profile from Prisma.

- [ ] **Step 2: Update the TechnicianData type in the booking page**

In `src/app/(public)/technicians/[id]/book/page.tsx`, update the `TechnicianData` type:

```typescript
type TechnicianData = {
  id: string;
  businessName: string | null;
  user: { name: string | null };
  services: Service[];
  avgRating: number;
  reviewCount: number;
  isVerified: boolean;
};
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/technicians/\[id\]/route.ts src/app/\(public\)/technicians/\[id\]/book/page.tsx
git commit -m "feat: extend technician API to include rating data for booking page"
```

---

### Task 7: Add sticky technician sidebar and persistent running total

**Files:**
- Modify: `src/app/(public)/technicians/[id]/book/page.tsx`

- [ ] **Step 1: Add the technician sidebar component and running total**

In `src/app/(public)/technicians/[id]/book/page.tsx`, add the following helper component above the `BookingPage` function (after the type definitions):

```tsx
import { Star, ShieldCheck, Info } from "lucide-react";

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
```

- [ ] **Step 2: Restructure the page layout to a 2-column grid**

Wrap the main content in a responsive grid. Find the `return` statement and restructure:

Replace this section (from `<div className="mx-auto max-w-2xl">` down to the closing of the step content area):

```tsx
  return (
    <div className="mx-auto max-w-3xl lg:max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground">
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

      {/* Mobile technician bar */}
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

      <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[1fr_280px] lg:gap-8">
        {/* Form steps (left column) */}
        <div>
          {/* ...existing step 1-4 content stays here unchanged... */}
        </div>

        {/* Desktop sidebar (right column) */}
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
```

Key changes:
- Max width increased from `max-w-2xl` to `max-w-3xl lg:max-w-5xl` to accommodate sidebar
- Mobile bar: compact horizontal card with avatar, name, rating, total. Visible `lg:hidden`
- Desktop sidebar: sticky `TechnicianSidebar` component, visible `hidden lg:block`
- Form steps wrapped in left column of the grid
- Step 1's existing inline total can stay (it's part of the form flow) — the sidebar provides the persistent view

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/technicians/\[id\]/book/page.tsx
git commit -m "feat: add sticky technician sidebar and persistent running total to booking flow"
```

---

### Task 8: Add "What to Expect" section to booking confirmation

**Files:**
- Modify: `src/app/(public)/technicians/[id]/book/page.tsx`

- [ ] **Step 1: Add the What to Expect card in Step 4**

In the Step 4 (Confirm) JSX, add the following after the piano details section and before the action buttons (`<div className="flex justify-between pt-4">`):

```tsx
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
```

Note: `Info` icon was already imported in Task 7. If not, add it to the lucide-react import.

- [ ] **Step 2: Verify in browser**

Walk through the full booking flow to Step 4. The "What to Expect" card should appear above the Back/Confirm buttons with 4 checklist items in muted styling.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/technicians/\[id\]/book/page.tsx
git commit -m "feat: add What to Expect section to booking confirmation step"
```

---

### Task 9: Run tests and final verification

**Files:** None (verification only)

- [ ] **Step 1: Run test suite**

Run: `npm run test:run`
Expected: All tests pass.

- [ ] **Step 2: Visual check**

Open in browser and check:
1. Mobile (375px): Bottom nav visible with 4 tabs, active state works, hides on booking page
2. Search results: Rating badge prominent top-right, visual hierarchy clear
3. Technician dashboard: Calendar visible as hero below stats, not duplicated in tab
4. Customer dashboard: Upcoming booking hero card (or empty state), past bookings with Rebook
5. Booking flow desktop: Technician sidebar sticky on right, running total visible all steps
6. Booking flow mobile: Technician bar at top, total visible
7. Booking Step 4: "What to Expect" card visible above confirm button

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve remaining Round 2 UI issues"
```
