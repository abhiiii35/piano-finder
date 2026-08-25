# 2026-08-25 — Competitor gap analysis PRD (research session)

## What was done
- Deep-crawled www.getcantus.com and www.pianoops.com (marketing sites, pricing, roadmaps, app-store listings/version history, review search) via parallel research subagents.
- Code-verified feature inventory of this repo (src/, prisma/schema.prisma, PRD.txt, docs/build-prompts/).
- Produced docs/prd-competitor-gap-2026-08-25.md: comparison tables, prioritized epics A–H with developer specs, PM question checklist Q-1..Q-23.

## Key findings
- Cantus: flat $19.95 beta / $47.95 std, web-only PWA, flagship = recall queue + piano condition graphs + Stripe Connect invoicing + business insights; invite-only beta, no independent reviews.
- PianoOps: $25/seat + $1/appt over 20, cap $85; native iOS/Android; strong CRM structure (multi-contact/multi-location) + SMS reminders; invoicing/bookkeeping still roadmap; launched 2025-12, ~no reviews yet.
- Our unique strengths: two-sided marketplace (search/SEO/job board/reviews), travel-aware slots, live card payments, QuickBooks CSV.
- Dead code found: TuneReminder pipeline never populated, Payment.tipCents has no UI writer, TechnicianProfile.stripeAccountId unused, lifecycle-email templates never called, no messages inbox page.

## Decisions
- P0 batch = wire existing reminder pipeline, reschedule flow, time blocks/days off, messages inbox, tel:/mailto: links.
- Strategy framing: "come for the leads, stay for the business OS"; open question Q-1 (marketplace vs SaaS pricing) blocks monetization work.

## Open items
- All Q-1..Q-23 in the PRD await PM answers; no code changes made this session.
