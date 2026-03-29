"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { createTechnicianProfile } from "@/actions/technician-signup";
import { Music, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const SERVICE_OPTIONS = [
  "Tuning",
  "Repair",
  "Regulation",
  "Voicing",
  "Appraisal",
  "Humidity System",
];

const PIANO_TYPE_OPTIONS = [
  "Grand",
  "Upright",
  "Baby Grand",
  "Digital",
  "Player",
];

export default function TechnicianSignupPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPianoTypes, setSelectedPianoTypes] = useState<string[]>([]);
  const [ptgMember, setPtgMember] = useState(false);

  if (!session) {
    return (
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
        <p className="text-slate-600">Please sign in first to join as a technician.</p>
        <Link
          href="/sign-in"
          className="mt-4 inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Sign In
        </Link>
      </div>
    );
  }

  function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("services", selectedServices.join(","));
    formData.set("pianoTypes", selectedPianoTypes.join(","));
    formData.set("ptgMember", String(ptgMember));

    const result = await createTechnicianProfile(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Technician profile created!");
      // Force session refresh to pick up new role
      window.location.href = "/dashboard/technician";
    }
  }

  const defaultName = session.user.name ?? "";
  const nameParts = defaultName.split(" ");

  return (
    <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
      {/* Back */}
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Header */}
      <div className="mt-6 flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <Music className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Join as a Technician
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Set up your profile and start accepting bookings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {/* Personal Info */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Personal Info</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                name="firstName"
                required
                defaultValue={nameParts[0] ?? ""}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                name="lastName"
                required
                defaultValue={nameParts.slice(1).join(" ")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <input
                name="phone"
                type="tel"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Years of Experience
              </label>
              <input
                name="yearsExperience"
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Bio</label>
            <textarea
              name="bio"
              rows={3}
              placeholder="Tell customers about yourself..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>
        </section>

        {/* Service Area */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Service Area</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                City <span className="text-red-500">*</span>
              </label>
              <input
                name="city"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                State <span className="text-red-500">*</span>
              </label>
              <input
                name="state"
                required
                maxLength={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Zip Code</label>
              <input
                name="zipCode"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </div>
          <div className="mt-4 space-y-1.5 sm:w-1/2">
            <label className="text-sm font-medium text-slate-700">
              Service Radius (miles)
            </label>
            <input
              name="serviceRadius"
              type="number"
              min="1"
              defaultValue="25"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>
        </section>

        {/* Services Offered */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Services Offered</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SERVICE_OPTIONS.map((svc) => (
              <label
                key={svc}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  selectedServices.includes(svc)
                    ? "border-slate-900 bg-slate-50 font-medium text-slate-900"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedServices.includes(svc)}
                  onChange={() => toggleItem(selectedServices, setSelectedServices, svc)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {svc}
              </label>
            ))}
          </div>
        </section>

        {/* Piano Types */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Piano Types</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PIANO_TYPE_OPTIONS.map((type) => (
              <label
                key={type}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  selectedPianoTypes.includes(type)
                    ? "border-slate-900 bg-slate-50 font-medium text-slate-900"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPianoTypes.includes(type)}
                  onChange={() => toggleItem(selectedPianoTypes, setSelectedPianoTypes, type)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {type}
              </label>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Pricing</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Base Tuning Price ($)
              </label>
              <input
                name="baseTuningPrice"
                type="number"
                min="0"
                step="1"
                placeholder="150"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Travel Fee ($)
              </label>
              <input
                name="travelFee"
                type="number"
                min="0"
                step="1"
                placeholder="25"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Pitch Raise Fee ($)
              </label>
              <input
                name="pitchRaiseFee"
                type="number"
                min="0"
                step="1"
                placeholder="50"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </div>
        </section>

        {/* PTG Member */}
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-4 transition-colors hover:border-slate-300">
          <input
            type="checkbox"
            checked={ptgMember}
            onChange={() => setPtgMember(!ptgMember)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <div>
            <p className="text-sm font-medium text-slate-900">
              Piano Technician Guild Member
            </p>
            <p className="text-xs text-slate-500">
              Check if you&apos;re a registered PTG member
            </p>
          </div>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "Creating profile..." : "Create Technician Profile"}
        </button>
      </form>
    </div>
  );
}
