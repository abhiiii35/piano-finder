# Build prompt: Travel-aware booking availability (Feature 1)

Paste the block below into Claude Code from the repo root. Run at high effort.

---

I'm making Piano Finder's booking calendar respect travel reality. When a customer enters their address while booking, the app should only offer time slots the technician can actually reach in time, given the technician's other appointments that day plus a travel buffer the technician sets. A slot that would require impossible back-to-back travel must not be shown to the customer at all. Google Maps billing is not enabled yet, so this must ship and run today without any paid API call, and swap to real drive-time data later as a drop-in.

Build a travel-feasibility filter into the existing booking availability flow: given a customer address, hide any candidate slot where travel plus buffer plus service time would not fit between the neighboring appointments.

First read, and follow the conventions in, `CLAUDE.md` and `AGENTS.md`. Then read the current booking and availability code so you extend it rather than replace it: `src/app/(public)/technicians/[id]/book`, the `AvailabilitySlot`, `Booking`, `Service`, and `TechnicianProfile` models in `prisma/schema.prisma`, `src/actions/booking.ts`, `src/lib/validations/booking.ts`, and `src/lib/geocoding.ts`.

Scope:
- Add `travelBufferMin` (Int, default 30) to `TechnicianProfile`, editable on the technician profile page, so each technician sets the padding they want on each side of a job on top of raw travel time.
- Add `latitude` and `longitude` (optional Floats) to `Booking`, geocoded once at booking creation through the existing geocoding path and cached, and backfill existing bookings with a script. These are the fixed points travel is measured against.
- In the booking flow, geocode the customer's entered address, then compute which of the technician's otherwise-available slots on the chosen day are feasible. A slot is feasible only when, treating the technician's profile location as the start and end anchor for the day: travel(previous stop to customer) plus buffer fits the gap before the slot, the service duration fits the slot, and travel(customer to next stop) plus buffer fits the gap after. Previous or next stop falls back to the technician's home base when there is no earlier or later booking that day. Infeasible slots are removed from what the customer sees.
- Put travel-time estimation behind a single interface with two implementations: a free one used now that estimates time from haversine distance and a configurable average local speed (put the assumed speed in `src/lib/constants.ts` so it is tunable, not a magic number), and a Google implementation (Distance Matrix or Directions) selected when an env flag such as `GOOGLE_MAPS_BILLING_ENABLED` is true. Swapping providers must not change the booking UI or the availability action signature.
- Compute availability server-side so an infeasible slot is never returned to the client, not merely hidden with CSS.

Two defaults I am choosing that you can surface for the technician to adjust later: the technician's profile address anchors the start and end of their day, and feasibility is checked only against the immediately neighboring bookings (a pairwise check, sufficient for a technician's daily volume). Don't build a full routing solver; when you have enough to compute feasibility, compute it.

Don't add features or refactor unrelated code beyond what this needs. Make no paid Google API call while `GOOGLE_MAPS_BILLING_ENABLED` is false. Never show the customer a slot the server judged infeasible, and never silently change an existing confirmed booking.

Before reporting done, verify:
- With billing off, entering a customer address returns only feasible slots using haversine plus average-speed math and no paid API call, and infeasible slots are absent from the server response, not just hidden.
- A booking that sits between two existing appointments far apart in distance correctly drops the tight slots; widening `travelBufferMin` removes more slots and narrowing it restores them.
- The first and last slots of a day are checked against the technician's home base as anchor.
- Bookings are geocoded once at creation and cached; the backfill script populates existing rows.
- Vitest covers the feasibility logic across cases (no other bookings, one neighbor, two neighbors, buffer boundary) with mocked Prisma; one Playwright path books with an address and sees a filtered slot list.
- Each completion claim maps to a real command output this session; if a check fails, say so with the output.

Lead with the outcome when you report back: first sentence says what shipped and whether feasibility filtering runs without billing, then anything you need from me.
