"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/actions/technician";
import { uploadPhoto, deletePhoto } from "@/actions/photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ImagePlus, X, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [portfolioPhotos, setPortfolioPhotos] = useState<
    { url: string; publicId: string }[]
  >([]);
  const [proposeTimesEnabled, setProposeTimesEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/technician/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setProposeTimesEnabled(!!data.profile.proposeTimesEnabled);
          try {
            const stored = JSON.parse(data.profile.portfolioPhotos || "[]");
            // stored is an array of {url, publicId} objects or plain URL strings
            const normalized = stored.map((item: string | { url: string; publicId: string }) =>
              typeof item === "string" ? { url: item, publicId: "" } : item
            );
            setPortfolioPhotos(normalized);
          } catch {
            // ignore parse errors
          }
        }
      });
  }, []);

  async function handlePortfolioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "portfolio");
      const result = await uploadPhoto(formData);
      if (result.error) {
        toast.error(result.error);
      } else if (result.url && result.publicId) {
        setPortfolioPhotos((prev) => [
          ...prev,
          { url: result.url!, publicId: result.publicId! },
        ]);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemovePhoto(index: number) {
    const photo = portfolioPhotos[index];
    if (photo.publicId) {
      await deletePhoto(photo.publicId);
    }
    setPortfolioPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("portfolioPhotos", JSON.stringify(portfolioPhotos));
    formData.set("proposeTimesEnabled", String(proposeTimesEnabled));
    const result = await updateProfile(formData);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated");
      router.refresh();
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Edit Profile</h1>
      <p className="mt-1 text-muted-foreground">
        Set up your public profile for customers to see
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  defaultValue={profile.businessName ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={profile.phone ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                rows={4}
                defaultValue={profile.bio ?? ""}
                placeholder="Tell customers about your experience and expertise..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Input
                  id="yearsExperience"
                  name="yearsExperience"
                  type="number"
                  defaultValue={profile.yearsExperience ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Input
                  id="certifications"
                  name="certifications"
                  defaultValue={profile.certifications ?? ""}
                  placeholder="e.g. RPT, PTG Member"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Area</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address</Label>
              <Input
                id="addressLine1"
                name="addressLine1"
                defaultValue={profile.addressLine1 ?? ""}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={profile.city ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  maxLength={2}
                  defaultValue={profile.state ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  defaultValue={profile.zipCode ?? ""}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serviceRadius">Service Radius (miles)</Label>
                <Input
                  id="serviceRadius"
                  name="serviceRadius"
                  type="number"
                  defaultValue={profile.serviceRadius ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="travelBufferMin">Travel Buffer (minutes)</Label>
                <Input
                  id="travelBufferMin"
                  name="travelBufferMin"
                  type="number"
                  min={0}
                  max={240}
                  defaultValue={profile.travelBufferMin ?? 30}
                />
                <p className="text-xs text-muted-foreground">
                  Padding added on each side of a job on top of estimated drive
                  time, when offering time slots to customers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rescheduling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rescheduleCutoffHours">
                Client reschedule notice (hours)
              </Label>
              <Input
                id="rescheduleCutoffHours"
                name="rescheduleCutoffHours"
                type="number"
                min={0}
                max={336}
                defaultValue={profile.rescheduleCutoffHours ?? 48}
              />
              <p className="text-xs text-muted-foreground">
                How far in advance clients can reschedule their own appointment
                online. After this window, they&apos;ll need to contact you directly.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <p className="font-medium">Offer suggested times when rescheduling</p>
                <p className="text-sm text-muted-foreground">
                  When you need to move a booking, send the client 2-4 times to
                  choose from instead of asking them to pick from your full schedule.
                </p>
              </div>
              <Switch
                checked={proposeTimesEnabled}
                onCheckedChange={(checked) => setProposeTimesEnabled(!!checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Photos */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Showcase your work to attract more customers. Upload photos of pianos you&apos;ve tuned, repaired, or restored.
            </p>
            <div className="flex flex-wrap gap-3">
              {portfolioPhotos.map((photo, i) => (
                <div key={photo.publicId || i} className="relative group">
                  <img
                    src={photo.url}
                    alt={`Portfolio ${i + 1}`}
                    className="h-24 w-24 rounded-md object-cover border"
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-24 w-24 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <ImagePlus className="h-6 w-6" />
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePortfolioUpload}
              className="hidden"
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading || uploading}>
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </div>
  );
}
