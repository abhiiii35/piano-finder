"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/actions/technician";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/technician/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
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
            <div className="space-y-2">
              <Label htmlFor="serviceRadius">Service Radius (miles)</Label>
              <Input
                id="serviceRadius"
                name="serviceRadius"
                type="number"
                defaultValue={profile.serviceRadius ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </div>
  );
}
