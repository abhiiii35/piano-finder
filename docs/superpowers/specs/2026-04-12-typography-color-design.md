# Typography & Color System Redesign

## Summary

Replace the default Geist font and scattered amber color usage with a cohesive design system: Inter typeface, navy/ivory/gold palette, and full light/dark mode support with a user toggle.

## Typography

### Font: Inter

- **Replaces**: Geist (default Next.js font)
- **Source**: Google Fonts via `next/font/google`
- **CSS variable**: `--font-inter` applied to `<html>`, mapped to `--font-sans` and `--font-heading`
- **Mono font**: Keep Geist Mono (`--font-geist-mono`) — only used in code contexts
- **Weights used**: 400 (body), 500 (labels), 600 (card titles), 700 (section headings), 800 (hero headings)

### Changes

- `src/app/layout.tsx`: Import `Inter` instead of `Geist`. Keep `Geist_Mono`.
- `src/app/globals.css`: Map `--font-sans: var(--font-inter)`, `--font-heading: var(--font-inter)`
- No component changes — all inherit from CSS variables.

## Color Palette

### Design Tokens

Hex values below are for reference. Implementation must convert to OKLCH format to match the existing `globals.css` convention. Use a converter or compute manually.

#### Light mode (`:root`)

| Token | Color | Hex | Purpose |
|---|---|---|---|
| `--background` | Warm ivory | `#faf8f5` | Page background |
| `--foreground` | Deep navy | `#0f1729` | Primary text |
| `--card` | White | `#ffffff` | Card surfaces |
| `--card-foreground` | Deep navy | `#0f1729` | Card text |
| `--popover` | White | `#ffffff` | Dropdown/popover bg |
| `--popover-foreground` | Deep navy | `#0f1729` | Dropdown text |
| `--primary` | Deep navy | `#0f1729` | CTAs, primary buttons |
| `--primary-foreground` | Warm ivory | `#f5f0e8` | Text on primary buttons |
| `--secondary` | Light ivory | `#f5f0e8` | Subtle backgrounds |
| `--secondary-foreground` | Deep navy | `#0f1729` | Text on secondary |
| `--muted` | Light ivory | `#f5f0e8` | Disabled/subtle fills |
| `--muted-foreground` | Slate gray | `#6b7280` | Secondary text |
| `--accent` | Burnished gold | `#d4a84b` | Stars, logo accent, highlights |
| `--accent-foreground` | Deep navy | `#0f1729` | Text on gold |
| `--destructive` | Red | (unchanged) | Error states |
| `--border` | Warm gray | `#e5e0d5` | Borders, dividers |
| `--input` | Warm gray | `#e5e0d5` | Input borders |
| `--ring` | Gold at 50% | `#d4a84b80` | Focus rings |

#### Dark mode (`.dark`)

| Token | Color | Hex | Purpose |
|---|---|---|---|
| `--background` | Deep navy | `#0f1729` | Page background |
| `--foreground` | Warm ivory | `#f5f0e8` | Primary text |
| `--card` | Lighter navy | `#162040` | Card surfaces |
| `--card-foreground` | Warm ivory | `#f5f0e8` | Card text |
| `--popover` | Lighter navy | `#162040` | Dropdown/popover bg |
| `--popover-foreground` | Warm ivory | `#f5f0e8` | Dropdown text |
| `--primary` | Burnished gold | `#d4a84b` | CTAs flip to gold |
| `--primary-foreground` | Deep navy | `#0f1729` | Text on gold buttons |
| `--secondary` | Navy tint | `#1e2d4a` | Subtle backgrounds |
| `--secondary-foreground` | Warm ivory | `#f5f0e8` | Text on secondary |
| `--muted` | Navy tint | `#1e2d4a` | Disabled/subtle fills |
| `--muted-foreground` | Blue-gray | `#8a94a8` | Secondary text |
| `--accent` | Burnished gold | `#d4a84b` | Stars, logo accent |
| `--accent-foreground` | Deep navy | `#0f1729` | Text on gold |
| `--destructive` | Red | (adjusted for dark bg) | Error states |
| `--border` | White 10% | `rgba(255,255,255,0.1)` | Borders |
| `--input` | White 15% | `rgba(255,255,255,0.15)` | Input borders |
| `--ring` | Gold at 50% | `#d4a84b80` | Focus rings |

#### Sidebar tokens

Light mode:
- `--sidebar`: Warm ivory `#faf8f5`
- `--sidebar-foreground`: Deep navy `#0f1729`
- `--sidebar-primary`: Deep navy `#0f1729`
- `--sidebar-primary-foreground`: Warm ivory `#f5f0e8`
- `--sidebar-accent`: Light ivory `#f5f0e8`
- `--sidebar-accent-foreground`: Deep navy `#0f1729`
- `--sidebar-border`: Warm gray `#e5e0d5`
- `--sidebar-ring`: Gold 50% `#d4a84b80`

Dark mode:
- `--sidebar`: Lighter navy `#162040`
- `--sidebar-foreground`: Warm ivory `#f5f0e8`
- `--sidebar-primary`: Burnished gold `#d4a84b`
- `--sidebar-primary-foreground`: Deep navy `#0f1729`
- `--sidebar-accent`: Navy tint `#1e2d4a`
- `--sidebar-accent-foreground`: Warm ivory `#f5f0e8`
- `--sidebar-border`: White 10% `rgba(255,255,255,0.1)`
- `--sidebar-ring`: Gold 50% `#d4a84b80`

## Gold Usage Rules (Moderate)

### Gold stays on:
- Primary CTA buttons (via `--primary` in dark, `--accent` when used directly)
- Star ratings → `fill-accent text-accent`
- Logo accent text
- "Instant Book" bolt icon → `text-accent`

### Gold removed from:
- Stat icons on landing page → `text-foreground` or `text-muted-foreground`
- Auth page backgrounds → `bg-secondary`
- Timestamps and metadata → `text-muted-foreground`
- Service/tag badges → `bg-secondary text-secondary-foreground`
- Verification dots → `text-primary`
- Hero gradient backgrounds → use `bg-background` or navy gradient in dark

### Principle:
Components use semantic tokens (`bg-primary`, `text-accent`, `text-muted-foreground`) instead of hardcoded Tailwind colors (`bg-amber-500`, `text-slate-600`). This makes dark/light mode automatic.

### Exception:
`STATUS_COLORS` map (pending=amber, confirmed=blue, etc.) keeps hardcoded colors — these are semantic status indicators, not brand colors.

## Dark Mode Toggle

### Implementation:
- Install `next-themes` package
- Wrap app in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` in `layout.tsx`
- Add `suppressHydrationWarning` to `<html>` element
- Create a toggle button component (sun/moon icon) in the header
- Respects system preference by default, user can override
- Persists preference to localStorage

## Parallel Workstreams

**Conflict avoidance**: Both agents touch `globals.css`. To avoid merge conflicts, Agent 2 owns all `globals.css` changes (color tokens AND font variable mappings). Agent 1 only touches `layout.tsx`, installs packages, and creates/modifies components.

### Agent 1 — Typography & Dark Mode Toggle
- `src/app/layout.tsx`: Swap `Geist` import for `Inter`, keep `Geist_Mono`, add ThemeProvider wrapper, add `suppressHydrationWarning` to `<html>`
- Install `next-themes`
- Create theme toggle component (`src/components/ui/theme-toggle.tsx` or similar)
- Add toggle to header component

### Agent 2 — Color Palette & Font Variables
- `src/app/globals.css`: Replace all `:root` and `.dark` color tokens with new palette, update `--font-sans` and `--font-heading` to map to `--font-inter`
- Scan and replace hardcoded Tailwind color classes across all components:
  - `src/app/page.tsx` (landing page — heaviest amber usage)
  - `src/components/search/technician-card.tsx`
  - Auth page layouts
  - Dashboard components
  - Header/footer components
- Replace `amber-*` and `slate-*` references with semantic tokens

## Not in Scope
- Dark mode toggle UI beyond a simple header button
- Motion/animation (Round 3)
- Mobile navigation (Round 2)
- Component layout changes
- Landing page content/copy changes

## Testing
- Visual check in dev server after each agent's work
- Run `npm run test:run` for regressions
- Verify both light and dark modes render correctly
- Check key pages: landing, search results, technician profile, booking flow, dashboards
