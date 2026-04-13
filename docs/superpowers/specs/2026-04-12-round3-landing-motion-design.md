# Round 3: Landing Page Personality & Motion Design

## Summary

Transform the landing page from generic template to distinctive branded experience with piano-themed visuals and scroll-triggered animations. Add motion design across all landing page sections using CSS animations triggered by a lightweight IntersectionObserver hook.

## 1. Animation Infrastructure

### Custom Hook: `src/hooks/use-animate-on-scroll.ts`

A ~20-line custom hook using `IntersectionObserver`:
- Accepts an optional threshold (default 0.1)
- Returns a `ref` callback and `isVisible` boolean
- `isVisible` flips to `true` when element enters viewport, stays `true` permanently (one-time trigger)
- No dependencies, SSR-safe (guard on `typeof window`)

### CSS Animations: added to `src/app/globals.css`

New `@keyframes` and utility classes:
- `animate-fade-up`: opacity 0→1, translateY 20px→0, 0.6s ease-out
- `animate-fade-in`: opacity 0→1, 0.6s ease-out
- `animate-slide-in-right`: opacity 0→1, translateX 30px→0, 0.5s ease-out

Animation delay utilities (if not already available in Tailwind v4):
- `animation-delay-100` through `animation-delay-700` in 100ms increments

All animations use `animation-fill-mode: both` so elements stay in their final state.

## 2. Hero Section Redesign

### File: `src/app/page.tsx`

**Replace fake stats with benefit pills:**
- Remove the 4-stat grid (`500+`, `50K+`, `4.9`, `48hrs`)
- Replace with a horizontal row of 3 benefit pills below the search bar:
  - "No phone calls" with `CheckCircle2` icon
  - "Verified credentials" with `ShieldCheck` icon
  - "Instant booking" with `CalendarCheck` icon
- Styled as inline-flex items: `text-sm text-muted-foreground` with icon + label, separated by subtle dots or spacing
- Centered, wrapping on mobile

**Piano key motif:**
- Inline SVG positioned absolutely at the bottom of the hero section
- Renders 20-30 alternating white and dark rectangles simulating piano keys
- Full width, 60-80px tall
- Opacity: 5-8% (`opacity-[0.06]`)
- Bottom-fading via CSS gradient mask (`mask-image: linear-gradient(to bottom, transparent, black 30%)`) so the keys fade in from the top and are solid at the bottom edge
- Works in both light and dark mode (keys use `currentColor` or fixed colors with low opacity)

**Hero entrance animations (CSS, not scroll-triggered — above the fold):**
Elements animate on page load with staggered `animation-delay`:
1. Badge: delay 0ms, `animate-fade-up`
2. Heading: delay 100ms, `animate-fade-up`
3. Subheading: delay 200ms, `animate-fade-up`
4. Search bar: delay 300ms, `animate-fade-up`
5. Benefit pills: delay 400ms, `animate-fade-up`

All start with `opacity-0` and animate to final state via `animation-fill-mode: both`.

## 3. How It Works Animations

### File: `src/app/page.tsx`

**Scroll-triggered staggered cards:**
- Section wrapper uses `useAnimateOnScroll` hook
- Heading and subheading: `animate-fade-in` when visible
- 4 feature cards animate with staggered delays:
  - Card 1: delay 0ms, `animate-fade-up`
  - Card 2: delay 100ms
  - Card 3: delay 200ms
  - Card 4: delay 300ms
- Cards start `opacity-0`, animate when `isVisible` is true

**Hover micro-interactions (CSS transitions):**
- Cards: add `transition-all duration-300 hover:-translate-y-1 hover:shadow-md`
- Icon wrappers: add `transition-transform duration-300 hover:scale-110`

## 4. For Technicians Section Animations

### File: `src/app/page.tsx`

**Scroll-triggered entrance:**
- Section uses `useAnimateOnScroll` hook
- Left side elements stagger on entrance:
  - Badge: delay 0ms, `animate-fade-up`
  - Heading: delay 100ms
  - Description: delay 200ms
  - Checklist items: delay 300ms
  - CTA button: delay 400ms
- Right side (schedule mockup card): `animate-fade-in`, delay 200ms

**Schedule mockup row animation:**
- 3 appointment rows animate in individually after the card appears:
  - Row 1: delay 400ms, `animate-slide-in-right`
  - Row 2: delay 600ms
  - Row 3: delay 800ms
- Rows start `opacity-0 translate-x-[30px]`, slide in from right

**CTA button hover:**
- Button uses `transition-all duration-300`
- Arrow icon: `transition-transform duration-300 group-hover:translate-x-1` (slides right on hover)
- Button gets `group` class for the group-hover to work

## Workstream

Single agent, sequential. The hook, CSS, and landing page changes are tightly coupled — splitting across agents adds coordination overhead for minimal parallelism gain.

**3 commits:**
1. Animation hook + CSS keyframes (`src/hooks/use-animate-on-scroll.ts` + `src/app/globals.css`)
2. Hero redesign: benefit pills, piano key SVG, entrance animations (`src/app/page.tsx`)
3. Section animations: How It Works + For Technicians scroll-triggered entrances + hover effects (`src/app/page.tsx`)

## Not in Scope
- Animation on non-landing pages (search, dashboard, booking)
- Page transition animations
- Loading skeletons or shimmer effects
- Dark mode-specific animation behavior (animations work the same in both modes)
- Parallax scrolling effects

## Testing
- Visual check of landing page: all animations fire correctly on scroll
- Verify hero entrance plays on page load
- Verify "How It Works" cards stagger on scroll
- Verify schedule mockup rows animate in
- Verify hover effects on cards and CTA
- Check mobile: animations should still work, piano key motif should scale
- Run `npm run test:run` — no test changes expected (animations are visual-only)
- Check both light and dark mode
