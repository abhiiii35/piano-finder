# Round 2 UI Improvements Design

## Summary

Four independent UI improvements executed in parallel: mobile bottom nav, rating-first search cards, dashboard redesigns, and booking flow trust signals.

## 1. Mobile Navigation — Bottom Tab Bar

### Component
- New file: `src/components/layout/bottom-nav.tsx` (client component)
- Modify: `src/app/(public)/layout.tsx` and `src/app/(dashboard)/layout.tsx` — render the BottomNav and add `pb-16 sm:pb-0` to the main content area. Auth layout (`src/app/(auth)/layout.tsx`) does NOT get the bottom nav (centered forms don't need it).

### Behavior
- Fixed bar at bottom of screen, visible only on mobile (`sm:hidden`)
- 4 tabs with lucide icons + labels:
  - **Home** (`/`) — `Home` icon
  - **Search** (`/search`) — `Search` icon
  - **Jobs** (`/jobs`) — `Briefcase` icon
  - **Dashboard** — `LayoutDashboard` icon, routes to `/dashboard/technician` or `/dashboard/customer` based on session role
- If user is not logged in: Dashboard tab replaced with **Sign In** (`/sign-in`) using `User` icon
- Active tab determined by `usePathname()`: `text-foreground` with gold dot indicator beneath icon. Inactive tabs: `text-muted-foreground`
- **Hidden during booking flow**: When pathname matches `/technicians/*/book`, the bar is not rendered

### Styling
- Background: `bg-card` with `border-t border-border`
- Height: ~56px (icon 20px + label 10px + padding)
- Tab layout: `justify-around` flex

## 2. Search Card Hierarchy — Rating-First

### File
- Modify: `src/components/search/technician-card.tsx`

### New Visual Hierarchy (top to bottom)
1. **Top row**: Avatar + name (left), **Rating badge** (top-right) — `4.9 ★ (24)` in bold, gold star. This is the key change: rating moves from buried inline to a prominent top-right position.
2. **Second row**: Location, experience, distance, verified dot. Slightly more breathing room than current layout.
3. **Third row**: "Instant Book" badge in accent color.
4. **Service tags**: Same as current (3 max + overflow), secondary visual weight.
5. **Bottom**: Price "Starting at $X" anchored bottom-right.

### Changes
- Rating badge: larger font (`text-base font-bold`), positioned top-right with `fill-accent text-accent` star
- Name: bumped from `font-semibold` to `text-base font-bold`
- No changes to component props, data flow, or card wrapper — purely layout rearrangement within existing markup

## 3. Dashboard Improvements

### Technician Dashboard
- File: `src/app/(dashboard)/dashboard/technician/page.tsx`

**Changes:**
- Extract calendar from the Bookings tab and place it as a hero section directly below stat cards
- Calendar defaults to today's view (day view)
- Bookings tab retains only the list/filter view (no duplicate calendar)
- Tabs (Customers, Invoices, Revenue) unchanged

### Customer Dashboard
- File: `src/app/(dashboard)/dashboard/customer/page.tsx`

**Changes:**
- Remove current layout (3 stat cards + single CTA)
- Replace with:

**Hero: Next upcoming booking card**
- Gold left-border accent (`border-l-4 border-l-accent`)
- Shows: "Upcoming" badge, "In X days" relative time, technician avatar + name, service type, date/time, "Details" button
- Empty state: "No upcoming appointments" with "Find a Tuner" CTA button

**Section: Past bookings**
- Section heading "Past Bookings"
- List of completed bookings, each showing: technician avatar + name, service, date, gold "Rebook" button
- "Rebook" links to `/technicians/[technicianId]/book`
- Show most recent 5, with "View All" link to `/dashboard/customer/bookings`

**Data requirements:**
- Fetch customer's bookings split by status (upcoming vs completed)
- Already available via existing Prisma queries — just needs to be called and partitioned in the page component

## 4. Booking Flow Trust Signals

### File
- Modify: `src/app/(public)/technicians/[id]/book/page.tsx`

### Sticky Technician Card
- Compact card showing: initials avatar, technician name, star rating + review count, verified badge
- **Desktop**: Sidebar to the right of the form. Uses a 2-column grid layout (`lg:grid-cols-[1fr_280px]`). Sidebar is `sticky top-24` so it follows scroll.
- **Mobile**: Horizontal bar below progress indicator. Shows avatar + name + rating inline. Not expandable.
- Data source: technician details already fetched at page level — just rendered persistently instead of only in the title

### Persistent Running Total
- Displayed beneath the technician card (in the sidebar on desktop, below the bar on mobile)
- Lists each selected service: name + price
- Total line at bottom with sum
- Visible in **all 4 steps** (currently only Steps 1 and 4)
- Updates reactively when services are toggled in Step 1. Static display in Steps 2-4.

### "What to Expect" Section
- Added to Step 4 (Review & Confirm), above the confirm button
- Bordered card with icon and heading "What to Expect"
- 4 static checklist items:
  - "Tuning typically takes 1-2 hours"
  - "Please ensure clear access to your piano"
  - "Your technician will confirm the appointment"
  - "You can message your technician after booking"
- Styling: `bg-secondary border border-border rounded-lg p-4`, items in `text-muted-foreground text-sm`
- Static content, no data dependency

## Parallel Workstreams

All 4 improvements are independent — no shared files, no ordering dependencies. Can be implemented by 4 separate agents simultaneously.

- **Agent 1**: Mobile bottom nav (new component + layout padding)
- **Agent 2**: Search card hierarchy (single file modification)
- **Agent 3**: Dashboard improvements (2 page files)
- **Agent 4**: Booking flow trust signals (single file modification, layout restructure)

## Not in Scope
- Dark mode toggle (already done in Round 1)
- Typography changes (already done in Round 1)
- Landing page content/copy (Round 3)
- Motion/animation (Round 3)
- Technician dashboard sidebar navigation (future work)
- Bottom nav for tablet breakpoints (mobile only for now)

## Testing
- Run `npm run test:run` after each agent's work
- Visual check on mobile viewport (375px) for bottom nav
- Visual check of search results page for card hierarchy
- Visual check of both dashboards (technician + customer)
- Visual check of booking flow on both desktop and mobile
- Verify bottom nav hides during booking flow
- Verify "Rebook" links route correctly
