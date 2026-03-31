import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { ONBOARDING_STATUS } from "@/lib/constants";

type Props = {
  onboardingStatus: string;
  hasAvailability: boolean;
  rejectionReason: string | null;
};

type Step = {
  label: string;
  done: boolean;
  href?: string;
};

export function OnboardingBanner({ onboardingStatus, hasAvailability, rejectionReason }: Props) {
  if (onboardingStatus === ONBOARDING_STATUS.APPROVED) return null;

  const steps: Step[] = [
    { label: "Profile details", done: true },
    { label: "Services & pricing", done: true },
    { label: "Set availability", done: hasAvailability, href: "/dashboard/technician/availability" },
    { label: "Submit for review", done: onboardingStatus === ONBOARDING_STATUS.SUBMITTED, href: "/onboarding/submit" },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  if (onboardingStatus === ONBOARDING_STATUS.SUBMITTED) {
    return (
      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="font-medium text-blue-900">Profile under review</p>
        <p className="mt-1 text-sm text-blue-700">
          We're reviewing your profile. You'll receive an email once it's approved.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
      {onboardingStatus === ONBOARDING_STATUS.REJECTED && rejectionReason && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-900">Changes requested</p>
          <p className="mt-1 text-sm text-red-700">{rejectionReason}</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium text-amber-900">Complete your profile to appear in search</p>
        <span className="text-sm text-amber-700">{doneCount} of {steps.length} steps done</span>
      </div>
      <div className="mb-3 h-2 rounded-full bg-amber-200">
        <div
          className="h-2 rounded-full bg-amber-500 transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        {steps.map((step) => (
          <span key={step.label} className="flex items-center gap-1.5 text-sm">
            {step.done ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-green-700">{step.label}</span>
              </>
            ) : step.href ? (
              <Link href={step.href} className="flex items-center gap-1.5 text-slate-600 underline hover:text-slate-900">
                <Circle className="h-4 w-4" />
                {step.label}
              </Link>
            ) : (
              <>
                <Circle className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">{step.label}</span>
              </>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
