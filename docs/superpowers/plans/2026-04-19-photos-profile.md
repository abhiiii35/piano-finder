# Review Photos & Technician Profile Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Cloudinary photo uploads for reviews and technician portfolios, an interactive booking calendar, and a Google Maps service area display on technician profiles.

**Architecture:** Two parallel agents. Agent 1 handles all photo-related work (Cloudinary setup, schema migration, review photos, portfolio, lightbox). Agent 2 handles profile improvements (booking calendar, Google Maps, profile page layout updates). Agent 1's schema migration runs first, then both agents work in parallel on non-overlapping files.

**Tech Stack:** Next.js 16, Prisma 7, Cloudinary Node SDK, @googlemaps/js-api-loader, Vitest

**Spec:** `docs/superpowers/specs/2026-04-19-photos-profile-design.md`

---

## Agent 1: Photo Infrastructure + Review Photos + Portfolio

### Task 1: Install Cloudinary and add schema migration

**Files:**
- Modify: `package.json`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Install Cloudinary**

Run: `npm install cloudinary`

- [ ] **Step 2: Add photo fields to schema**

In `prisma/schema.prisma`, add to the Review model (after `comment`):

```prisma
  photos    String  @default("[]") // JSON array of Cloudinary URLs
```

Add to the TechnicianProfile model (after `rejectionReason`):

```prisma
  portfolioPhotos String @default("[]") // JSON array of Cloudinary URLs
```

- [ ] **Step 3: Create and apply migration**

Run: `npx prisma migrate dev --name add_photo_fields`

Then apply to Turso:

Run: `turso db shell piano-finder < prisma/migrations/<timestamp>_add_photo_fields/migration.sql`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Cloudinary and photo fields to Review and TechnicianProfile"
```

---

### Task 2: Create photo upload server action

**Files:**
- Create: `src/actions/photos.ts`
- Create: `src/lib/cloudinary.ts`
- Modify: `.env.example`

- [ ] **Step 1: Create Cloudinary config helper**

Create `src/lib/cloudinary.ts`:

```typescript
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
```

- [ ] **Step 2: Create upload action**

Create `src/actions/photos.ts`:

```typescript
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadPhoto(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const file = formData.get("file") as File;
  const folder = formData.get("folder") as string;

  if (!file || !folder) return { error: "Missing file or folder" };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only JPEG, PNG, and WebP images are allowed" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "File must be under 5MB" };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: `piano-finder/${folder}`,
              transformation: [{ width: 1200, crop: "limit" }],
              format: "webp",
            },
            (error, result) => {
              if (error || !result) reject(error || new Error("Upload failed"));
              else resolve({ secure_url: result.secure_url, public_id: result.public_id });
            }
          )
          .end(buffer);
      }
    );

    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    console.error("[UPLOAD] Failed:", error);
    return { error: "Failed to upload photo" };
  }
}

export async function deletePhoto(publicId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  try {
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error) {
    console.error("[DELETE] Failed:", error);
    return { error: "Failed to delete photo" };
  }
}
```

- [ ] **Step 3: Update .env.example**

Add to `.env.example`:

```
# Cloudinary (photo uploads)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

- [ ] **Step 4: Commit**

```bash
git add src/actions/photos.ts src/lib/cloudinary.ts .env.example
git commit -m "feat: add Cloudinary photo upload and delete server actions"
```

---

### Task 3: Create photo lightbox component

**Files:**
- Create: `src/components/ui/photo-lightbox.tsx`

- [ ] **Step 1: Create the lightbox**

Create `src/components/ui/photo-lightbox.tsx`:

```tsx
"use client";

import { useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Props = {
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function PhotoLightbox({ photos, currentIndex, onClose, onNavigate }: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < photos.length - 1) onNavigate(currentIndex + 1);
    },
    [currentIndex, photos.length, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
      >
        <X className="h-6 w-6" />
      </button>

      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          className="absolute left-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          className="absolute right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <img
        src={photos[currentIndex]}
        alt={`Photo ${currentIndex + 1} of ${photos.length}`}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="absolute bottom-4 text-sm text-white/70">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/photo-lightbox.tsx
git commit -m "feat: add reusable photo lightbox component"
```

---

### Task 4: Add photos to review submission

**Files:**
- Modify: `src/lib/validations/review.ts`
- Modify: `src/actions/review.ts`
- Modify: `src/app/(dashboard)/dashboard/customer/bookings/[id]/review/page.tsx`

- [ ] **Step 1: Update review validation schema**

In `src/lib/validations/review.ts`, add `photos` to the schema:

```typescript
import { z } from "zod";

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  photos: z.array(z.string().url()).max(10).default([]),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
```

- [ ] **Step 2: Update createReview action**

In `src/actions/review.ts`, update the `data` parameter type and the `prisma.review.create` call:

Update the function signature:

```typescript
export async function createReview(data: {
  bookingId: string;
  rating: number;
  comment?: string;
  photos?: string[];
}) {
```

Update the `prisma.review.create` call to include photos:

```typescript
  await prisma.review.create({
    data: {
      bookingId,
      authorId: session.user.id,
      rating,
      comment: comment || null,
      photos: JSON.stringify(result.data.photos ?? []),
    },
  });
```

- [ ] **Step 3: Add photo upload UI to review page**

In `src/app/(dashboard)/dashboard/customer/bookings/[id]/review/page.tsx`, add photo upload functionality:

Add imports:

```typescript
import { uploadPhoto } from "@/actions/photos";
import { ImagePlus, X } from "lucide-react";
```

Add state for photos:

```typescript
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
```

Add photo upload handler:

```typescript
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (photos.length + files.length > 10) {
      toast.error("Maximum 10 photos per review");
      return;
    }
    setUploading(true);
    for (const file of files) {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "reviews");
      const result = await uploadPhoto(formData);
      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        setPhotos((prev) => [...prev, result.url]);
      }
    }
    setUploading(false);
    e.target.value = "";
  }
```

Update handleSubmit to include photos:

```typescript
    const result = await createReview({
      bookingId: params.id as string,
      rating,
      comment: comment || undefined,
      photos,
    });
```

Add photo upload UI in the form (after the comment textarea, before the submit button):

```tsx
            <div className="space-y-2">
              <Label>Photos (optional, up to 10)</Label>
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={url.replace("/upload/", "/upload/w_200,h_200,c_fill/")} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < 10 && (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-secondary transition-colors">
                  <ImagePlus className="h-5 w-5" />
                  {uploading ? "Uploading..." : "Add photos"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/validations/review.ts src/actions/review.ts src/app/\(dashboard\)/dashboard/customer/bookings/\[id\]/review/page.tsx
git commit -m "feat: add photo upload to review submission"
```

---

### Task 5: Display photos in review cards

**Files:**
- Modify: `src/components/reviews/review-card.tsx`

- [ ] **Step 1: Add photo display with lightbox**

Replace the contents of `src/components/reviews/review-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import { StarRating } from "./star-rating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PhotoLightbox } from "@/components/ui/photo-lightbox";
import { formatDistanceToNow } from "date-fns";

export function ReviewCard({
  review,
}: {
  review: {
    rating: number;
    comment: string | null;
    photos?: string;
    createdAt: Date;
    author: { name: string | null; image: string | null };
  };
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const photos: string[] = review.photos ? JSON.parse(review.photos) : [];
  const visiblePhotos = photos.slice(0, 3);
  const overflowCount = photos.length - 3;

  return (
    <div className="flex gap-4 py-4">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback>
          {review.author.name?.[0]?.toUpperCase() ?? "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {review.author.name ?? "Anonymous"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(review.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <StarRating rating={review.rating} />
        {review.comment && (
          <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
        )}
        {visiblePhotos.length > 0 && (
          <div className="mt-3 flex gap-2">
            {visiblePhotos.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border"
              >
                <img
                  src={url.replace("/upload/", "/upload/w_400,h_400,c_fill,f_auto/")}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {i === 2 && overflowCount > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm font-semibold">
                    +{overflowCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos.map((url) =>
            url.replace("/upload/", "/upload/w_1200,c_limit,f_auto/")
          )}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
```

Key changes: component is now `"use client"`, parses `photos` JSON, shows first 3 as thumbnails with Cloudinary transforms, "+N" overlay on 3rd if overflow, click opens lightbox with full-size images.

- [ ] **Step 2: Commit**

```bash
git add src/components/reviews/review-card.tsx
git commit -m "feat: display review photos with lightbox in review cards"
```

---

### Task 6: Add portfolio upload to technician profile dashboard

**Files:**
- Modify: `src/app/(dashboard)/dashboard/technician/profile/page.tsx`

- [ ] **Step 1: Add portfolio section to profile page**

In `src/app/(dashboard)/dashboard/technician/profile/page.tsx`, add imports:

```typescript
import { uploadPhoto, deletePhoto } from "@/actions/photos";
import { ImagePlus, X, Trash2 } from "lucide-react";
```

Add portfolio state after the existing `profile` state:

```typescript
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
```

In the `useEffect` that fetches the profile, parse portfolio photos:

```typescript
        if (data.profile) {
          setProfile(data.profile);
          setPortfolioPhotos(
            data.profile.portfolioPhotos
              ? JSON.parse(data.profile.portfolioPhotos)
              : []
          );
        }
```

Add portfolio upload handler:

```typescript
  async function handlePortfolioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (portfolioPhotos.length + files.length > 20) {
      toast.error("Maximum 20 portfolio photos");
      return;
    }
    setPortfolioUploading(true);
    for (const file of files) {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "portfolio");
      const result = await uploadPhoto(formData);
      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        setPortfolioPhotos((prev) => [...prev, result.url]);
      }
    }
    setPortfolioUploading(false);
    e.target.value = "";
  }

  async function handlePortfolioDelete(index: number) {
    const url = portfolioPhotos[index];
    setPortfolioPhotos(portfolioPhotos.filter((_, i) => i !== index));
    // Extract public ID from URL for Cloudinary deletion
    const parts = url.split("/upload/");
    if (parts[1]) {
      const publicId = parts[1].replace(/\.[^.]+$/, "").split("/").slice(1).join("/");
      await deletePhoto(`piano-finder/portfolio/${publicId.split("/").pop()}`);
    }
  }
```

Add a Portfolio Card section after the Service Area card (before the submit button):

```tsx
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Showcase your work — photos of pianos you&apos;ve tuned, restored, or repaired. Up to 20 photos.
            </p>
            {portfolioPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {portfolioPhotos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                    <img
                      src={url.replace("/upload/", "/upload/w_400,h_400,c_fill,f_auto/")}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handlePortfolioDelete(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {portfolioPhotos.length < 20 && (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-secondary transition-colors">
                <ImagePlus className="h-5 w-5" />
                {portfolioUploading ? "Uploading..." : "Add photos"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePortfolioUpload}
                  className="hidden"
                  disabled={portfolioUploading}
                />
              </label>
            )}
          </CardContent>
        </Card>
```

Also, the portfolio photos need to be saved with the profile. Update the `handleSubmit` to include portfolio photos in the form data:

Before `const result = await updateProfile(formData);`, add:

```typescript
    formData.set("portfolioPhotos", JSON.stringify(portfolioPhotos));
```

Note: The `updateProfile` action in `src/actions/technician.ts` will need to accept and save `portfolioPhotos`. Read that file and add `portfolioPhotos` to the update data. It likely uses `prisma.technicianProfile.update()` — just include `portfolioPhotos: formData.get("portfolioPhotos") as string` in the data object.

- [ ] **Step 2: Update the updateProfile action**

Read `src/actions/technician.ts` and add `portfolioPhotos` to the update data in the `updateProfile` function. Find where `prisma.technicianProfile.update()` is called and add:

```typescript
      portfolioPhotos: formData.get("portfolioPhotos") as string || "[]",
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/technician/profile/page.tsx src/actions/technician.ts
git commit -m "feat: add portfolio photo upload to technician profile dashboard"
```

---

### Task 7: Display portfolio on public profile

**Files:**
- Modify: `src/app/(public)/technicians/[id]/page.tsx`

- [ ] **Step 1: Add portfolio section to public profile**

In `src/app/(public)/technicians/[id]/page.tsx`, the portfolio goes in the main content area (left column, `lg:col-span-2`), between Certifications and Reviews.

This needs to be a client-interactive section (for lightbox), so create a small client component.

Create `src/components/profile/portfolio-gallery.tsx`:

```tsx
"use client";

import { useState } from "react";
import { PhotoLightbox } from "@/components/ui/photo-lightbox";

export function PortfolioGallery({ photos }: { photos: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visiblePhotos = showAll ? photos : photos.slice(0, 6);

  if (photos.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold">Portfolio</h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visiblePhotos.map((url, i) => (
          <button
            key={i}
            onClick={() => setLightboxIndex(i)}
            className="aspect-square overflow-hidden rounded-lg border border-border"
          >
            <img
              src={url.replace("/upload/", "/upload/w_400,h_400,c_fill,f_auto/")}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </button>
        ))}
      </div>
      {!showAll && photos.length > 6 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View all {photos.length} photos
        </button>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={(showAll ? photos : photos).map((url) =>
            url.replace("/upload/", "/upload/w_1200,c_limit,f_auto/")
          )}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
```

Then in `src/app/(public)/technicians/[id]/page.tsx`, import and add:

```typescript
import { PortfolioGallery } from "@/components/profile/portfolio-gallery";
```

After the Certifications section and before the Reviews section, add:

```tsx
        {/* Portfolio */}
        {(() => {
          const portfolioPhotos: string[] = technician.portfolioPhotos
            ? JSON.parse(technician.portfolioPhotos)
            : [];
          return portfolioPhotos.length > 0 ? <PortfolioGallery photos={portfolioPhotos} /> : null;
        })()}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/profile/portfolio-gallery.tsx src/app/\(public\)/technicians/\[id\]/page.tsx
git commit -m "feat: display technician portfolio gallery on public profile"
```

---

## Agent 2: Profile Improvements (Calendar + Maps)

### Task 8: Install Google Maps loader

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install package**

Run: `npm install @googlemaps/js-api-loader`

- [ ] **Step 2: Update .env.example**

Add to `.env.example`:

```
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: install @googlemaps/js-api-loader"
```

---

### Task 9: Create interactive booking calendar component

**Files:**
- Create: `src/components/profile/booking-calendar.tsx`

- [ ] **Step 1: Create the calendar component**

Create `src/components/profile/booking-calendar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAvailableSlots } from "@/actions/booking";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";

type Props = {
  technicianId: string;
  availabilitySlots: { dayOfWeek: number; startTime: string; endTime: string }[];
};

export function BookingCalendar({ technicianId, availabilitySlots }: Props) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const today = startOfDay(new Date());
  const availableDays = new Set(availabilitySlots.map((s) => s.dayOfWeek));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  async function handleDateClick(date: Date) {
    setSelectedDate(date);
    setLoadingSlots(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const slots = await getAvailableSlots(technicianId, dateStr);
    setTimeSlots(slots);
    setLoadingSlots(false);
  }

  function handleTimeClick(time: string) {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    router.push(`/technicians/${technicianId}/book?date=${dateStr}&time=${time}`);
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          className="rounded-md p-1 hover:bg-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="rounded-md p-1 hover:bg-secondary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 text-center text-sm">
        {days.map((d, i) => {
          const inMonth = isSameMonth(d, currentMonth);
          const isPast = isBefore(d, today);
          const hasAvailability = availableDays.has(d.getDay());
          const isSelectable = inMonth && !isPast && hasAvailability;
          const isSelected = selectedDate && isSameDay(d, selectedDate);
          const isToday = isSameDay(d, today);

          return (
            <button
              key={i}
              onClick={() => isSelectable && handleDateClick(d)}
              disabled={!isSelectable}
              className={`py-1.5 text-xs rounded-md transition-colors ${
                !inMonth
                  ? "text-muted-foreground/30"
                  : !isSelectable
                    ? "text-muted-foreground/50"
                    : isSelected
                      ? "bg-accent text-accent-foreground font-semibold"
                      : isToday
                        ? "bg-secondary font-semibold"
                        : "hover:bg-secondary"
              }`}
            >
              {format(d, "d")}
              {isSelectable && !isSelected && (
                <span className="block mx-auto mt-0.5 h-1 w-1 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-2">
            Available times for {format(selectedDate, "EEE, MMM d")}:
          </p>
          {loadingSlots ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : timeSlots.length > 0 ? (
            <div className="grid grid-cols-4 gap-1.5">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => handleTimeClick(time)}
                  className="rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:border-accent hover:bg-accent/10 transition-colors"
                >
                  {time}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No available slots</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/profile/booking-calendar.tsx
git commit -m "feat: add interactive booking calendar component"
```

---

### Task 10: Create service area map component

**Files:**
- Create: `src/components/profile/service-area-map.tsx`

- [ ] **Step 1: Create the map component**

Create `src/components/profile/service-area-map.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { MapPin } from "lucide-react";

type Props = {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  city: string;
  state: string;
};

export function ServiceAreaMap({ latitude, longitude, radiusMiles, city, state }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    const loader = new Loader({
      apiKey,
      version: "weekly",
    });

    loader.importLibrary("maps").then((google) => {
      const map = new google.Map(mapRef.current!, {
        center: { lat: latitude, lng: longitude },
        zoom: 10,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });

      new google.Circle({
        map,
        center: { lat: latitude, lng: longitude },
        radius: radiusMiles * 1609.34, // miles to meters
        fillColor: "#d4a84b",
        fillOpacity: 0.1,
        strokeColor: "#d4a84b",
        strokeWeight: 2,
      });
    });
  }, [apiKey, latitude, longitude, radiusMiles]);

  // Fallback when no API key
  if (!apiKey) {
    return (
      <div className="flex flex-col items-center py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-3">
          <MapPin className="h-6 w-6 text-accent" />
        </div>
        <p className="font-semibold text-sm">{city}, {state}</p>
        <p className="text-sm text-muted-foreground">
          Serves within <strong className="text-foreground">{radiusMiles} miles</strong>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div ref={mapRef} className="h-[250px] w-full rounded-lg" />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        Serves within <strong className="text-foreground">{radiusMiles} miles</strong> of {city}, {state}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/profile/service-area-map.tsx
git commit -m "feat: add Google Maps service area component with fallback"
```

---

### Task 11: Integrate calendar and map into technician profile page

**Files:**
- Modify: `src/app/(public)/technicians/[id]/page.tsx`
- Modify: `src/app/(public)/technicians/[id]/book/page.tsx`

- [ ] **Step 1: Replace availability sidebar with calendar and map**

In `src/app/(public)/technicians/[id]/page.tsx`, add imports:

```typescript
import { BookingCalendar } from "@/components/profile/booking-calendar";
import { ServiceAreaMap } from "@/components/profile/service-area-map";
```

Replace the Availability Card in the sidebar with the BookingCalendar:

```tsx
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Book an Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BookingCalendar
              technicianId={id}
              availabilitySlots={technician.availabilitySlots}
            />
          </CardContent>
        </Card>
```

Add the ServiceAreaMap below the BookingCalendar card (before the MessageButton):

```tsx
        {technician.latitude && technician.longitude && technician.serviceRadius && (
          <Card>
            <CardHeader>
              <CardTitle>Service Area</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceAreaMap
                latitude={technician.latitude}
                longitude={technician.longitude}
                radiusMiles={technician.serviceRadius}
                city={technician.city ?? ""}
                state={technician.state ?? ""}
              />
            </CardContent>
          </Card>
        )}
```

- [ ] **Step 2: Update booking page to accept pre-filled date/time**

In `src/app/(public)/technicians/[id]/book/page.tsx`, read URL search params. This is a client component, so use `useSearchParams`:

Add import:

```typescript
import { useSearchParams } from "next/navigation";
```

In the component, after existing state declarations, add:

```typescript
  const searchParams = useSearchParams();
```

Update the initial state for `selectedDate` and `selectedTime`:

```typescript
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") ?? "");
  const [selectedTime, setSelectedTime] = useState(searchParams.get("time") ?? "");
```

This pre-fills the date and time if the customer clicked a time slot on the profile calendar. They'll land on Step 1 (services) with date/time already set, and can proceed to Step 3 after picking services.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/technicians/\[id\]/page.tsx src/app/\(public\)/technicians/\[id\]/book/page.tsx
git commit -m "feat: integrate booking calendar and service area map into technician profile"
```

---

### Task 12: Run tests and final verification

**Files:** None (verification only)

- [ ] **Step 1: Run test suite**

Run: `npm run test:run`
Expected: All tests pass. If any fail due to the new `photos` field on Review, update the test fixtures.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve remaining photos and profile issues"
```
