"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileStep } from "./profile-step";
import { ServicesStep } from "./services-step";
import { completeWizard } from "@/actions/onboarding";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMin: number;
  isActive: boolean;
};

type Props = {
  profile: {
    bio: string | null;
    businessName: string | null;
    yearsExperience: number | null;
  };
  services: Service[];
};

const STEPS = ["Profile Details", "Services & Pricing"];

export function OnboardingWizard({ profile, services }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<FormData | null>(null);

  async function handleProfileNext(formData: FormData) {
    setProfileData(formData);
    setStep(1);
  }

  async function handleComplete() {
    if (!profileData) {
      toast.error("Please complete the profile step first");
      setStep(0);
      return;
    }

    setLoading(true);
    const result = await completeWizard(profileData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      if (result.error.includes("Bio")) setStep(0);
    } else {
      toast.success("Setup complete!");
      router.push("/dashboard/technician");
    }
  }

  return (
    <div className="w-full max-w-lg">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-500 mb-2">
          {STEPS.map((label, i) => (
            <span key={label} className={i <= step ? "font-medium text-slate-900" : ""}>
              {label}
            </span>
          ))}
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-amber-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      {step === 0 && (
        <ProfileStep
          defaultValues={{
            bio: profile.bio ?? "",
            businessName: profile.businessName ?? "",
            yearsExperience: profile.yearsExperience ?? 0,
          }}
          onNext={handleProfileNext}
          loading={false}
        />
      )}
      {step === 1 && (
        <ServicesStep
          initialServices={services}
          onComplete={handleComplete}
          loading={loading}
        />
      )}
    </div>
  );
}
