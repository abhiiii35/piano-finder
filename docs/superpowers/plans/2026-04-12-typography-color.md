# Typography & Color System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Geist font with Inter, replace the neutral gray/amber palette with a navy/ivory/gold design system, and add a dark mode toggle.

**Architecture:** Two parallel workstreams — Agent 1 handles typography + dark mode toggle (layout.tsx, new components, package install). Agent 2 handles all color token changes (globals.css) and migrates hardcoded Tailwind classes across 30 files to semantic tokens. Agent 2 owns globals.css exclusively to avoid merge conflicts.

**Tech Stack:** Next.js 16, Tailwind v4, next-themes, Inter (Google Fonts), lucide-react (Sun/Moon icons)

**Spec:** `docs/superpowers/specs/2026-04-12-typography-color-design.md`

---

## Agent 1: Typography & Dark Mode Toggle

### Task 1: Install next-themes

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install next-themes**

Run: `npm install next-themes`

- [ ] **Step 2: Verify installation**

Run: `npm ls next-themes`
Expected: `next-themes@<version>`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install next-themes for dark mode support"
```

---

### Task 2: Swap fonts and add ThemeProvider in layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace Geist with Inter, add ThemeProvider**

Replace the entire contents of `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Book A Piano Tuner",
  description:
    "Find and book trusted piano technicians in your area. The all-in-one platform for piano tuning, repair, and maintenance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthSessionProvider>
            {children}
            <Toaster />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Key changes:
- `Geist` → `Inter` with `--font-inter` CSS variable
- `Geist_Mono` stays (mono font unchanged)
- `ThemeProvider` wraps `AuthSessionProvider` with `attribute="class"` (toggles `.dark` on `<html>`), `defaultTheme="system"`, and `enableSystem`
- `suppressHydrationWarning` on `<html>` (required by next-themes to avoid hydration mismatch from theme script)

- [ ] **Step 2: Verify dev server starts**

Run: `npx next dev` and confirm no errors in terminal. Check the browser — font should still load (it won't be Inter yet until globals.css maps the variable, which Agent 2 handles).

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: swap Geist for Inter font, add ThemeProvider for dark mode"
```

---

### Task 3: Create theme toggle component

**Files:**
- Create: `src/components/ui/theme-toggle.tsx`

- [ ] **Step 1: Create the toggle component**

Create `src/components/ui/theme-toggle.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4.5 w-4.5" />
      ) : (
        <Moon className="h-4.5 w-4.5" />
      )}
    </button>
  );
}
```

Notes:
- `mounted` guard prevents hydration mismatch (server doesn't know the theme)
- Placeholder `<div>` matches button size to prevent layout shift
- Uses `resolvedTheme` (not `theme`) to handle "system" correctly
- Uses semantic `text-muted-foreground` / `text-foreground` — works in both modes

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/theme-toggle.tsx
git commit -m "feat: add theme toggle component with sun/moon icons"
```

---

### Task 4: Add theme toggle to header

**Files:**
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Import and add the toggle**

In `src/components/layout/header.tsx`, add the import at the top:

```tsx
import { ThemeToggle } from "@/components/ui/theme-toggle";
```

Then find this line:

```tsx
<div className="flex items-center gap-3">
```

Replace it with:

```tsx
<div className="flex items-center gap-2">
  <ThemeToggle />
```

This places the toggle before the "Join as Technician" button / avatar dropdown, with slightly tighter gap.

- [ ] **Step 2: Verify toggle appears in browser**

Run: `npx next dev`, open the site. The sun/moon icon should appear in the header. Clicking it should toggle the `.dark` class on `<html>` (check via browser DevTools). The visual effect won't be complete until Agent 2 updates the color tokens.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat: add dark mode toggle to header"
```

---

## Agent 2: Color Palette & Font Variables

### Task 5: Update globals.css — color tokens and font mapping

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update font variables and all color tokens**

In `src/app/globals.css`, make these changes:

First, update the `@theme inline` block's font lines:

```css
--font-sans: var(--font-inter);
--font-mono: var(--font-geist-mono);
--font-heading: var(--font-inter);
```

(Change `var(--font-sans)` → `var(--font-inter)` for `--font-sans`, and `var(--font-sans)` → `var(--font-inter)` for `--font-heading`)

Then replace the entire `:root` block with:

```css
:root {
  --background: oklch(0.98 0.005 80);
  --foreground: oklch(0.15 0.03 260);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.15 0.03 260);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.15 0.03 260);
  --primary: oklch(0.15 0.03 260);
  --primary-foreground: oklch(0.94 0.01 80);
  --secondary: oklch(0.94 0.01 80);
  --secondary-foreground: oklch(0.15 0.03 260);
  --muted: oklch(0.94 0.01 80);
  --muted-foreground: oklch(0.55 0.01 260);
  --accent: oklch(0.75 0.14 80);
  --accent-foreground: oklch(0.15 0.03 260);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.90 0.01 80);
  --input: oklch(0.90 0.01 80);
  --ring: oklch(0.75 0.14 80 / 50%);
  --chart-1: oklch(0.75 0.14 80);
  --chart-2: oklch(0.55 0.01 260);
  --chart-3: oklch(0.44 0.01 260);
  --chart-4: oklch(0.37 0.01 260);
  --chart-5: oklch(0.27 0.01 260);
  --radius: 0.625rem;
  --sidebar: oklch(0.98 0.005 80);
  --sidebar-foreground: oklch(0.15 0.03 260);
  --sidebar-primary: oklch(0.15 0.03 260);
  --sidebar-primary-foreground: oklch(0.94 0.01 80);
  --sidebar-accent: oklch(0.94 0.01 80);
  --sidebar-accent-foreground: oklch(0.15 0.03 260);
  --sidebar-border: oklch(0.90 0.01 80);
  --sidebar-ring: oklch(0.75 0.14 80 / 50%);
}
```

Then replace the entire `.dark` block with:

```css
.dark {
  --background: oklch(0.15 0.03 260);
  --foreground: oklch(0.94 0.01 80);
  --card: oklch(0.20 0.03 260);
  --card-foreground: oklch(0.94 0.01 80);
  --popover: oklch(0.20 0.03 260);
  --popover-foreground: oklch(0.94 0.01 80);
  --primary: oklch(0.75 0.14 80);
  --primary-foreground: oklch(0.15 0.03 260);
  --secondary: oklch(0.25 0.03 260);
  --secondary-foreground: oklch(0.94 0.01 80);
  --muted: oklch(0.25 0.03 260);
  --muted-foreground: oklch(0.65 0.02 260);
  --accent: oklch(0.75 0.14 80);
  --accent-foreground: oklch(0.15 0.03 260);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.75 0.14 80 / 50%);
  --chart-1: oklch(0.75 0.14 80);
  --chart-2: oklch(0.65 0.02 260);
  --chart-3: oklch(0.44 0.01 260);
  --chart-4: oklch(0.37 0.01 260);
  --chart-5: oklch(0.27 0.01 260);
  --sidebar: oklch(0.20 0.03 260);
  --sidebar-foreground: oklch(0.94 0.01 80);
  --sidebar-primary: oklch(0.75 0.14 80);
  --sidebar-primary-foreground: oklch(0.15 0.03 260);
  --sidebar-accent: oklch(0.25 0.03 260);
  --sidebar-accent-foreground: oklch(0.94 0.01 80);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.75 0.14 80 / 50%);
}
```

OKLCH value mapping reference:
- Deep navy `#0f1729` ≈ `oklch(0.15 0.03 260)`
- Warm ivory `#faf8f5` ≈ `oklch(0.98 0.005 80)`
- Light ivory `#f5f0e8` ≈ `oklch(0.94 0.01 80)`
- Burnished gold `#d4a84b` ≈ `oklch(0.75 0.14 80)`
- Lighter navy `#162040` ≈ `oklch(0.20 0.03 260)`
- Navy tint `#1e2d4a` ≈ `oklch(0.25 0.03 260)`
- Slate gray `#6b7280` ≈ `oklch(0.55 0.01 260)`
- Blue-gray `#8a94a8` ≈ `oklch(0.65 0.02 260)`
- Warm gray border `#e5e0d5` ≈ `oklch(0.90 0.01 80)`

- [ ] **Step 2: Verify in browser**

Run: `npx next dev`. The page should now show warm ivory background, navy text. Toggle dark mode (if Agent 1 is done) to verify dark palette.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: replace gray palette with navy/ivory/gold design system in globals.css"
```

---

### Task 6: Migrate landing page colors

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace all hardcoded colors**

In `src/app/page.tsx`, make these replacements:

**Hero section:**
- `bg-gradient-to-b from-amber-50/60 to-white` → `bg-gradient-to-b from-secondary to-background`
- `border border-amber-200 bg-amber-50 px-3.5 py-1 text-sm font-medium text-amber-700` → `border border-border bg-secondary px-3.5 py-1 text-sm font-medium text-accent`
- `text-slate-900` → `text-foreground` (all instances)
- `text-amber-600` (in hero heading "expert care") → `text-accent`
- `text-slate-600` → `text-muted-foreground` (all instances)
- `border-slate-200` → `border-border`
- `bg-white` (search bar) → `bg-card`
- `text-slate-400` → `text-muted-foreground` (for placeholders, use `placeholder:text-muted-foreground`)
- `text-slate-900` (input text) → `text-foreground`
- `focus-within:border-slate-300` → `focus-within:border-border`
- `bg-amber-500 ... hover:bg-amber-600` (search button) → `bg-primary text-primary-foreground hover:bg-primary/90`
- `text-white` (search button) → remove (covered by `text-primary-foreground`)

**Stats section:**
- `text-amber-600` (stat values) → `text-foreground font-bold` (gold removed per design — stats are informational, not CTAs)
- `text-slate-500` (stat labels) → `text-muted-foreground`

**How It Works section:**
- `text-slate-900` (heading) → `text-foreground`
- `text-slate-500` (subheading, descriptions) → `text-muted-foreground`
- `border-slate-100 bg-white` (cards) → `border-border bg-card`
- `bg-amber-50` (icon background) → `bg-secondary`
- `text-amber-600` (icons) → `text-muted-foreground` (gold removed from informational icons per design)
- `text-slate-900` (card titles) → `text-foreground`

**For Technicians dark section:**
- `bg-slate-900` → `bg-foreground dark:bg-card` — OR better, use a custom approach: `bg-[oklch(0.15_0.03_260)]` to keep this section always dark regardless of mode. Actually, simplest: wrap in a div with explicit dark colors since this section should always appear dark.

Better approach for the "For Technicians" section: This section is intentionally dark in both light and dark modes. Keep explicit dark colors but use the palette's navy/gold tones:
- `bg-slate-900` → `bg-[#0f1729]`
- `border-amber-500/30 bg-amber-500/10 text-amber-400` (badge) → `border-accent/30 bg-accent/10 text-accent`
- `text-white` → `text-[#f5f0e8]`
- `text-slate-400` → `text-[#8a94a8]`
- `text-amber-500` (checkmarks) → `text-accent`
- `text-slate-300` (list items) → `text-[#c5c9d4]`
- `bg-amber-500 ... hover:bg-amber-600` (CTA button) → `bg-accent text-accent-foreground hover:bg-accent/90`
- `text-white` (button) → remove (covered by `text-accent-foreground`)
- `border-slate-700 bg-slate-800` (mockup card) → `border-[#1e2d4a] bg-[#162040]`
- `text-amber-400` (appointment times) → `text-accent`
- `border-slate-700 bg-slate-800/50` (appointment rows) → `border-[#1e2d4a] bg-[#162040]/50`

- [ ] **Step 2: Verify landing page in browser**

Check both light and dark modes. The hero should show ivory gradient in light, navy in dark. The "For Technicians" section should always appear dark with gold accents.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: migrate landing page from amber/slate to semantic color tokens"
```

---

### Task 7: Migrate header and footer

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/footer.tsx`

- [ ] **Step 1: Migrate header colors**

In `src/components/layout/header.tsx`:

- `bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60` → `bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`
- `bg-slate-800` (logo icon bg) → `bg-primary`
- `text-white` (logo icon) → `text-primary-foreground`
- `text-slate-900` (logo text) → `text-foreground`
- `text-slate-600 ... hover:text-slate-900` (nav links) → `text-muted-foreground ... hover:text-foreground`
- `border-slate-200` ("Join as Technician" button border) → `border-border`
- `text-slate-700` ("Join as Technician" text) → `text-foreground`
- `hover:bg-slate-50` → `hover:bg-secondary`
- `bg-slate-100 text-slate-700` (avatar fallback) → `bg-secondary text-foreground`
- `text-slate-900` (dropdown user name) → `text-foreground`
- `text-slate-500` (dropdown email) → `text-muted-foreground`
- `text-slate-600 hover:text-slate-900` (sign-in icon) → `text-muted-foreground hover:text-foreground`

- [ ] **Step 2: Migrate footer colors**

In `src/components/layout/footer.tsx`:

- `bg-white` (footer bg) → `bg-card`
- `bg-slate-800` (logo icon bg) → `bg-primary`
- `text-white` (logo icon) → `text-primary-foreground`
- `text-slate-900` (logo text, section headings) → `text-foreground` (all instances)
- `text-slate-500` (description, links) → `text-muted-foreground` (all instances)
- `hover:text-slate-900` (link hover) → `hover:text-foreground` (all instances)
- `text-slate-400` (copyright) → `text-muted-foreground`

- [ ] **Step 3: Verify header and footer in both modes**

Check: logo renders correctly, nav links readable, dropdown works, footer sections clear.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/header.tsx src/components/layout/footer.tsx
git commit -m "feat: migrate header and footer to semantic color tokens"
```

---

### Task 8: Migrate auth pages

**Files:**
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/app/(auth)/sign-in/page.tsx`
- Modify: `src/app/(auth)/sign-up/page.tsx`
- Modify: `src/app/(auth)/sign-up/technician/page.tsx`
- Modify: `src/app/(auth)/onboarding/page.tsx`
- Modify: `src/app/(auth)/onboarding/submit/page.tsx`

- [ ] **Step 1: Migrate auth layout**

In `src/app/(auth)/layout.tsx`:

- `bg-amber-50/30` → `bg-background`
- `bg-slate-800` (logo icon) → `bg-primary`
- `text-white` (logo icon) → `text-primary-foreground`
- `text-slate-900` (logo text) → `text-foreground`

- [ ] **Step 2: Migrate sign-in page**

In `src/app/(auth)/sign-in/page.tsx`, apply these patterns throughout:

- `bg-slate-800` → `bg-primary`
- `text-white` / `text-slate-50` → `text-primary-foreground`
- `border-slate-200` → `border-border`
- `text-slate-700` → `text-foreground`
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `text-slate-400` → `text-muted-foreground`
- `bg-white` → `bg-card`
- `bg-slate-200` (divider) → `bg-border`
- `focus:ring-slate-300` → `focus:ring-ring`
- `bg-red-50 text-red-600` → keep as-is (error states are semantic)

- [ ] **Step 3: Migrate sign-up pages**

In `src/app/(auth)/sign-up/page.tsx`, apply the same patterns as sign-in:

- `border-slate-100` / `border-slate-200` → `border-border`
- `text-slate-900` → `text-foreground`
- `text-slate-500` / `text-slate-400` → `text-muted-foreground`
- `text-slate-700` → `text-foreground`
- `focus:ring-slate-300` → `focus:ring-ring`
- `bg-red-50 text-red-600` → keep as-is

In `src/app/(auth)/sign-up/technician/page.tsx`:

- `bg-amber-50` (icon bg) → `bg-secondary`
- `text-amber-600` (icon) → `text-muted-foreground` (informational icon, not CTA)
- `bg-amber-500 hover:bg-amber-600` (button) → `bg-primary hover:bg-primary/90`
- `text-white` (button text) → `text-primary-foreground`
- `border-slate-100` → `border-border`
- `text-slate-900` → `text-foreground`
- `text-slate-500` / `text-slate-400` → `text-muted-foreground`
- `text-slate-700` / `text-slate-600` → `text-foreground`
- `border-slate-200` / `border-slate-300` → `border-border`
- `bg-slate-50` → `bg-secondary`
- `bg-slate-900 text-white` → `bg-primary text-primary-foreground`

- [ ] **Step 4: Migrate onboarding pages**

In `src/app/(auth)/onboarding/page.tsx`:
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`

In `src/app/(auth)/onboarding/submit/page.tsx`:
- `border-slate-200` → `border-border`
- `bg-white` → `bg-card`
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`

- [ ] **Step 5: Verify auth flows in both modes**

Check: sign-in, sign-up, technician sign-up, and onboarding pages all render correctly in light and dark.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: migrate auth pages to semantic color tokens"
```

---

### Task 9: Migrate technician card and search components

**Files:**
- Modify: `src/components/search/technician-card.tsx`
- Modify: `src/components/search/search-filters.tsx`
- Modify: `src/app/(public)/search/page.tsx`
- Modify: `src/components/ui/filter-select.tsx`

- [ ] **Step 1: Migrate technician card**

In `src/components/search/technician-card.tsx`:

Update the `avatarColors` array (line 29-36):
```tsx
const avatarColors = [
  "bg-primary text-primary-foreground",
  "bg-accent/20 text-accent-foreground",
  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
];
```

Other replacements:
- `border-slate-200 bg-white` (card) → `border-border bg-card`
- `text-slate-900` (name) → `text-foreground`
- `bg-amber-500` (verified dot) → `bg-primary`
- `text-slate-500` (location, experience) → `text-muted-foreground`
- `text-amber-600` (distance "mi away") → `text-accent`
- `fill-amber-400 text-amber-400` (star) → `fill-accent text-accent`
- `text-slate-900` (rating number) → `text-foreground`
- `text-slate-400` (review count) → `text-muted-foreground`
- `text-amber-600` ("Instant Book") → `text-accent`
- `bg-slate-100` (service tags) → `bg-secondary`
- `text-slate-600` (service tag text) → `text-secondary-foreground`
- `text-slate-400` (overflow "+N") → `text-muted-foreground`
- `text-slate-400` ("Starting at") → `text-muted-foreground`
- `text-slate-900` (price) → `text-foreground`

- [ ] **Step 2: Migrate search filters**

In `src/components/search/search-filters.tsx`:
- `border-slate-200` → `border-border`
- `bg-white` → `bg-card`
- `text-slate-400` → `text-muted-foreground`
- `text-slate-900` → `text-foreground`
- `text-slate-700` → `text-foreground`
- `border-slate-300` → `border-border`
- `focus:ring-slate-300` → `focus:ring-ring`

In `src/components/ui/filter-select.tsx`:
- `border-slate-200` → `border-border`
- `bg-white` → `bg-card`
- `text-slate-700` → `text-foreground`
- `focus:border-slate-300` → `focus:border-border`
- `text-slate-400` → `text-muted-foreground`

- [ ] **Step 3: Migrate search page**

In `src/app/(public)/search/page.tsx`:
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`

- [ ] **Step 4: Verify search page in both modes**

Check: search results page with filters, technician cards render correctly.

- [ ] **Step 5: Commit**

```bash
git add src/components/search/ src/app/\(public\)/search/ src/components/ui/filter-select.tsx
git commit -m "feat: migrate search components and technician cards to semantic tokens"
```

---

### Task 10: Migrate dashboard components

**Files:**
- Modify: `src/app/(dashboard)/dashboard/technician/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/customer/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/submissions/page.tsx`
- Modify: `src/components/dashboard/stat-card.tsx`
- Modify: `src/components/dashboard/calendar.tsx`
- Modify: `src/components/dashboard/calendar-month-view.tsx`
- Modify: `src/components/dashboard/calendar-day-view.tsx`
- Modify: `src/components/dashboard/calendar-week-view.tsx`
- Modify: `src/components/admin/submission-card.tsx`

- [ ] **Step 1: Migrate stat card**

In `src/components/dashboard/stat-card.tsx`:
- `border-slate-200` → `border-border`
- `bg-white` → `bg-card`
- `text-slate-500` → `text-muted-foreground`
- `bg-slate-100` → `bg-secondary`
- `text-slate-900` → `text-foreground`

- [ ] **Step 2: Migrate dashboard pages**

In `src/app/(dashboard)/dashboard/technician/page.tsx`:
- `bg-amber-50 text-amber-600` / `bg-amber-50 text-amber-500` (stat icons) → `bg-secondary text-muted-foreground` (informational icons, not CTAs)
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `border-slate-200` → `border-border`
- `bg-white` → `bg-card`
- `text-slate-300` → `text-muted-foreground`

In `src/app/(dashboard)/dashboard/customer/page.tsx`:
- `bg-amber-50 text-amber-600` (stat icon) → `bg-secondary text-muted-foreground`
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`

In `src/app/(dashboard)/dashboard/admin/submissions/page.tsx`:
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `text-slate-300` → `text-muted-foreground`

- [ ] **Step 3: Migrate calendar components**

In `src/components/dashboard/calendar.tsx`:
- `border-slate-200` → `border-border`
- `text-slate-700` / `text-slate-600` → `text-foreground`
- `text-slate-900` → `text-foreground`
- `bg-slate-900 text-white` → `bg-primary text-primary-foreground`

In `src/components/dashboard/calendar-month-view.tsx`:
- `border-slate-200` → `border-border`
- `text-slate-500` → `text-muted-foreground`
- `bg-slate-50/50` → `bg-secondary/50`
- `text-slate-900` → `text-foreground`
- `text-slate-400` → `text-muted-foreground`
- `bg-amber-500 text-white` (today indicator) → `bg-accent text-accent-foreground`
- Keep `bg-blue-100 text-blue-700` as-is (semantic status color)

In `src/components/dashboard/calendar-day-view.tsx`:
- `border-slate-200` / `border-slate-100` → `border-border`
- `text-slate-400` / `text-slate-500` → `text-muted-foreground`
- `border-slate-300` → `border-border`
- `bg-slate-100` → `bg-secondary`
- Keep `STATUS_COLORS` as-is (semantic status indicators)

In `src/components/dashboard/calendar-week-view.tsx`:
- `border-slate-200` / `border-slate-100` / `border-slate-50` → `border-border`
- `text-slate-600` / `text-slate-500` → `text-muted-foreground`
- `text-slate-900` → `text-foreground`
- `bg-slate-100` → `bg-secondary`
- `bg-amber-50 text-amber-700` (today header) → `bg-accent/10 text-accent`
- `text-amber-700` (today text) → `text-accent`

- [ ] **Step 4: Migrate submission card**

In `src/components/admin/submission-card.tsx`:
- `border-slate-200` → `border-border`
- `bg-white` → `bg-card`
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `bg-slate-100 text-slate-700` → `bg-secondary text-secondary-foreground`
- `bg-amber-100 text-amber-800` (PTG badge) → `bg-accent/15 text-accent`

- [ ] **Step 5: Verify dashboards in both modes**

Check: technician dashboard, customer dashboard, admin submissions, calendar views all render correctly in light and dark.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/ src/components/dashboard/ src/components/admin/
git commit -m "feat: migrate dashboard and calendar components to semantic tokens"
```

---

### Task 11: Migrate remaining components

**Files:**
- Modify: `src/components/onboarding/wizard.tsx`
- Modify: `src/components/onboarding/banner.tsx`
- Modify: `src/components/onboarding/services-step.tsx`
- Modify: `src/app/(public)/technicians/[id]/book/page.tsx`
- Modify: `src/app/(public)/jobs/page.tsx`
- Modify: `src/app/(public)/jobs/[id]/page.tsx`
- Modify: `src/app/(public)/jobs/post/page.tsx`
- Modify: `src/components/jobs/apply-button.tsx`

- [ ] **Step 1: Migrate onboarding components**

In `src/components/onboarding/wizard.tsx`:
- `bg-amber-500` (progress bar fill) → `bg-accent`
- `text-slate-500` → `text-muted-foreground`
- `text-slate-900` → `text-foreground`
- `bg-slate-200` (progress bar track) → `bg-secondary`

In `src/components/onboarding/banner.tsx`:
- `border-amber-200 bg-amber-50` → `border-border bg-secondary`
- `text-amber-900` → `text-foreground`
- `text-amber-700` → `text-muted-foreground`
- `bg-amber-200` → `bg-border`
- `bg-amber-500` (progress fill) → `bg-accent`
- `text-slate-600` / `text-slate-400` / `text-slate-500` → `text-muted-foreground`
- `text-slate-900` → `text-foreground`

In `src/components/onboarding/services-step.tsx`:
- `border-slate-300` / `border-slate-200` → `border-border`
- `bg-white` → `bg-card`
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `text-white` → `text-primary-foreground`

- [ ] **Step 2: Migrate booking page**

In `src/app/(public)/technicians/[id]/book/page.tsx`:
- `border-amber-200 bg-amber-50` (conflict warning) → `border-border bg-secondary`
- `text-amber-900` → `text-foreground`
- `text-amber-700` → `text-muted-foreground`
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `border-slate-200` → `border-border`

- [ ] **Step 3: Migrate jobs pages**

In `src/app/(public)/jobs/page.tsx`:
- `border-l-amber-400` → `border-l-accent`
- `bg-amber-500 text-white hover:bg-amber-600` (post button) → `bg-primary text-primary-foreground hover:bg-primary/90`
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `border-slate-200` → `border-border`
- `bg-white` → `bg-card`

In `src/app/(public)/jobs/[id]/page.tsx`:
- `bg-amber-500 text-white` (status badge) → `bg-accent text-accent-foreground`
- `text-slate-900` → `text-foreground`
- `text-slate-500` / `text-slate-400` → `text-muted-foreground`
- `bg-slate-100` → `bg-secondary`
- `text-slate-600` → `text-muted-foreground`
- `bg-slate-200` → `bg-border`

In `src/app/(public)/jobs/post/page.tsx`:
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `border-slate-200` → `border-border`
- `bg-white` → `bg-card`
- `text-slate-700` → `text-foreground`
- `focus:ring-slate-300` → `focus:ring-ring`
- `text-slate-400` → `text-muted-foreground`

- [ ] **Step 4: Migrate apply button**

In `src/components/jobs/apply-button.tsx`:
- `bg-amber-500 hover:bg-amber-600` → `bg-primary hover:bg-primary/90`
- Keep `text-emerald-600` (semantic success color)
- `bg-white border-white` → `bg-card border-border`

- [ ] **Step 5: Verify all remaining pages**

Check: onboarding flow, booking page, job board, job detail, post job form, apply button.

- [ ] **Step 6: Commit**

```bash
git add src/components/onboarding/ src/app/\(public\)/ src/components/jobs/
git commit -m "feat: migrate onboarding, booking, and jobs pages to semantic tokens"
```

---

### Task 12: Run tests and final verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass. If any fail due to color class changes in snapshot tests or class assertions, update them.

- [ ] **Step 2: Grep for remaining hardcoded amber/slate**

Run a search for any remaining `amber-` or `slate-` usage in `src/` (excluding `node_modules`, `generated`, and `components/ui/` shadcn primitives):

```bash
grep -r "amber-\|slate-" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules\|generated\|STATUS_COLORS"
```

Any remaining instances in non-UI files should be evaluated:
- `STATUS_COLORS` entries → keep (semantic status colors)
- `components/ui/` shadcn files → keep (don't edit shadcn primitives)
- Anything else → migrate to semantic tokens

- [ ] **Step 3: Visual check of all major pages**

Open in browser and check both light and dark modes:
1. Landing page (/)
2. Search results (/search)
3. Sign in (/sign-in)
4. Sign up (/sign-up)
5. Technician dashboard (/dashboard/technician)
6. Customer dashboard (/dashboard/customer)
7. Booking flow (/technicians/[id]/book)
8. Job board (/jobs)

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: resolve remaining color migration issues"
```
