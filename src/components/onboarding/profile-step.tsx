"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Props = {
  defaultValues: {
    bio: string;
    businessName: string;
    yearsExperience: number;
  };
  onNext: (data: FormData) => void;
  loading: boolean;
};

export function ProfileStep({ defaultValues, onNext, loading }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onNext(new FormData(e.currentTarget));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="bio">About You</Label>
        <Textarea
          id="bio"
          name="bio"
          required
          minLength={10}
          rows={4}
          placeholder="Tell customers about your experience, specialties, and approach..."
          defaultValue={defaultValues.bio}
        />
        <p className="text-xs text-muted-foreground">Minimum 10 characters</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessName">Business Name (optional)</Label>
        <Input
          id="businessName"
          name="businessName"
          placeholder="e.g. Mike's Piano Service"
          defaultValue={defaultValues.businessName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="yearsExperience">Years of Experience</Label>
        <Input
          id="yearsExperience"
          name="yearsExperience"
          type="number"
          min="0"
          max="100"
          required
          defaultValue={defaultValues.yearsExperience || ""}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
