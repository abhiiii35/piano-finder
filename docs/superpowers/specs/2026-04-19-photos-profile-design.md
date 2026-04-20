# Review Photos & Technician Profile Improvements Design

## Summary

Two features: (1) photo uploads for reviews and technician portfolios via Cloudinary, and (2) technician profile improvements including an interactive booking calendar and Google Maps service area display.

## 1. Cloudinary Photo Upload Infrastructure

### Package
`cloudinary` (Node SDK)

### Env Vars
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Upload Flow
Client selects files → client-side preview → calls server action `uploadPhoto(formData)` → server uploads to Cloudinary via Node SDK → returns `{ url, publicId }`.

### Shared Upload Action
New file: `src/actions/photos.ts`

`uploadPhoto(file: File, folder: string)` — single function used by both review and portfolio uploads.
- Folders: `reviews/` and `portfolio/`
- Max file size: 5MB
- Accepted types: JPEG, PNG, WebP
- Returns `{ url: string, publicId: string }` or `{ error: string }`

### Auto-optimization
Cloudinary URL transforms — serve as WebP, max 1200px wide for full display, 400px for thumbnails. Transform via URL parameters (e.g., `/w_400,c_fill,f_auto/`), no server-side processing needed.

## 2. Review Photos

### Schema Change
Add to Review model: `photos String @default("[]")`

JSON string array of Cloudinary URLs. Max 10 photos per review.

### Review Submission
Modify: `src/app/(dashboard)/dashboard/customer/bookings/[id]/review/page.tsx`

- Photo upload area below comment field (drag-and-drop or click to select)
- Client-side previews before upload
- Each file uploaded to Cloudinary individually, URLs collected in state
- URLs passed to `createReview()` on form submit

### Review Action
Modify: `src/actions/review.ts`

`createReview()` accepts optional `photos: string[]` parameter. Validates max 10, each must be valid URL. Stores as JSON string.

### Review Display
Modify: `src/components/reviews/review-card.tsx`

- Parse `photos` JSON string
- Show first 3 photos as thumbnails (400px Cloudinary transform)
- If more than 3: "+N more" badge on the 3rd thumbnail
- Click opens a shared lightbox component

### Photo Lightbox
New file: `src/components/ui/photo-lightbox.tsx`

Client component — modal overlay with:
- Full-size image (1200px Cloudinary transform)
- Left/right navigation arrows
- Close button (X) and click-outside-to-close
- Keyboard navigation (arrow keys, Escape to close)
- No external library — simple React state + portal

Shared between review photos and portfolio photos.

## 3. Technician Portfolio

### Schema Change
Add to TechnicianProfile model: `portfolioPhotos String @default("[]")`

JSON string array of Cloudinary URLs. Max 20 photos.

### Dashboard Upload UI
Modify: `src/app/(dashboard)/dashboard/technician/profile/page.tsx`

- New "Portfolio" section with grid of existing photos
- Delete button on each photo (removes from array, deletes from Cloudinary)
- "Add Photos" button — same `uploadPhoto()` action with `portfolio/` folder
- Max 20 photos enforced

### Public Profile Display
Modify: `src/app/(public)/technicians/[id]/page.tsx`

- New "Portfolio" section between About/Certifications and Reviews
- 3-column grid (2-column on mobile)
- Show first 6 photos, "View All" expands to show rest
- Click opens shared lightbox

## 4. Interactive Booking Calendar

### Component
New file: `src/components/profile/booking-calendar.tsx` (client component)

- Mini month calendar (current + next month navigation)
- Days with availability slots highlighted (gold dot or background)
- Past dates and no-availability days grayed out
- Click a date → fetches available times via existing `getAvailableSlots()` server action
- Time slots displayed as grid below the calendar
- Selecting a time navigates to `/technicians/[id]/book?date=YYYY-MM-DD&time=HH:MM`

### Booking Page Integration
Modify: `src/app/(public)/technicians/[id]/book/page.tsx`

Read `date` and `time` from URL searchParams. If present, pre-fill `selectedDate` and `selectedTime` state. If both are set, start at Step 1 (services) — user picks services then skips to Step 3 (address) since date/time are already chosen.

### Profile Page Integration
Modify: `src/app/(public)/technicians/[id]/page.tsx`

Replace the text availability list in the sidebar with the booking calendar component. Pass `technicianId` and `availabilitySlots` as props.

## 5. Google Maps Service Area

### Package
`@googlemaps/js-api-loader`

### Env Var
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — client-side

### Component
New file: `src/components/profile/service-area-map.tsx` (client component)

- Loads Google Maps on demand via API loader
- Centers on technician's `latitude`/`longitude`
- Draws `google.maps.Circle` with `serviceRadius` (miles → meters conversion)
- Circle: gold fill 10% opacity, gold stroke
- Map: minimal controls (zoom only, no street view, no fullscreen)
- Fixed height: 250px, rounded corners
- Text below: "Serves within X miles of [City, State]"

### Fallback
If `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is empty or technician has no lat/lng: show text-only fallback with icon, city name, and radius. No map rendered, no error.

### Profile Page Integration
Add below the booking calendar in the sidebar.

## Parallel Workstreams

Two agents:
- **Agent 1**: Photo infrastructure + review photos + portfolio (Sections 1-3). All Cloudinary-related work, schema changes, upload UI, lightbox.
- **Agent 2**: Profile improvements (Sections 4-5). Booking calendar, Google Maps, profile page layout changes.

Agent 1's schema migration must run before Agent 2 modifies the profile page, but the code changes are in different areas of the profile page (Agent 1 adds portfolio section in main content, Agent 2 modifies sidebar). Minimal conflict risk.

## Not in Scope
- Video uploads
- Photo cropping/editing UI
- Drag-to-reorder portfolio
- Photo moderation / content filtering (future: Cloudinary has this built-in)
- Multiple service area polygons (only circular radius)

## Testing
- Test `uploadPhoto()` action with mock Cloudinary SDK
- Test `createReview()` with photos array
- Test review card renders photos and lightbox opens
- Test booking calendar fetches slots on date click
- Test Google Maps fallback when API key is missing
- Run `npm run test:run` — all tests pass
- Run `npm run build` — build succeeds
