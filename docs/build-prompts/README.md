# Build prompts

Ready-to-run prompts for Claude Code, one per feature. Open Claude Code from the repo root and paste the block inside each file (everything below the `---`), or say "implement docs/build-prompts/feature-blog.md".

## Resolved decisions baked into these prompts
- Feature 1 (travel-aware booking): when a customer enters their address, only slots the technician can actually travel to in time (given other appointments that day plus a technician-set buffer) are shown. Google Maps billing is off, so travel time is estimated from haversine distance plus an average speed now, and swaps to real drive-time data behind `GOOGLE_MAPS_BILLING_ENABLED` later.
- Feature 2 (accounting): accountant-handoff totals only. No tax-owed estimates.
- Feature 3 (piano service history): dropped for now.
- Feature 4 (blog): database-backed with a no-code WYSIWYG editor by default, plus an optional markdown mode for technical authors. Both save to the same sanitized HTML.

## Recommended run order (lowest risk first)
1. `feature-blog.md`
2. `feature-accounting.md`
3. `feature-routes.md`

Run and ship one at a time; each is independent.

## Facts each prompt must pull from a live source at build (not from memory)
- IRS standard mileage rate (accounting): from irs.gov for the tax year.
- QuickBooks Online CSV import columns (accounting): from Intuit's current import docs.
- Google Maps Platform pricing and billing setup (routes): confirm your billing tier before enabling the Directions path.
- Next.js 16 `sitemap.ts` / `robots.ts` / `generateMetadata` conventions (blog): from `node_modules/next/dist/docs/`.
