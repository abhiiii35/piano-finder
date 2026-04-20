"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createReview } from "@/actions/review";
import { uploadPhoto, deletePhoto } from "@/actions/photos";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRatingInput } from "@/components/reviews/star-rating-input";
import { toast } from "sonner";
import { ImagePlus, X, Loader2 } from "lucide-react";

const MAX_PHOTOS = 10;

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<{ url: string; publicId: string }[]>([]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    for (const file of filesToUpload) {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "reviews");
      const result = await uploadPhoto(formData);
      if (result.error) {
        toast.error(result.error);
      } else if (result.url && result.publicId) {
        setPhotos((prev) => [
          ...prev,
          { url: result.url!, publicId: result.publicId! },
        ]);
      }
    }

    setUploading(false);
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemovePhoto(index: number) {
    const photo = photos[index];
    await deletePhoto(photo.publicId);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setLoading(true);
    const result = await createReview({
      bookingId: params.id as string,
      rating,
      comment: comment || undefined,
      photos: photos.map((p) => p.url),
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Review submitted!");
      router.push(`/dashboard/customer/bookings/${params.id}`);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Leave a Review</h1>
      <p className="mt-1 text-muted-foreground">
        How was your experience?
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Your Review</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Rating</Label>
              <StarRatingInput value={rating} onChange={setRating} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Tell others about your experience..."
                maxLength={1000}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Photos (optional, up to {MAX_PHOTOS})</Label>
              <div className="flex flex-wrap gap-3">
                {photos.map((photo, i) => (
                  <div key={photo.publicId} className="relative group">
                    <img
                      src={photo.url}
                      alt={`Upload ${i + 1}`}
                      className="h-20 w-20 rounded-md object-cover border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <ImagePlus className="h-6 w-6" />
                    )}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <Button type="submit" disabled={loading || uploading || rating === 0}>
              {loading ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
