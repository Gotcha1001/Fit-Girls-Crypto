"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { ImageUploader, type ProfilePhoto } from "./ImageUploader";
import { MapPin, Loader2 } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

export type Gender = "male" | "female" | "non_binary";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Woman" },
  { value: "male", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
];

interface ProfileFormProps {
  existingProfile?: Doc<"profiles"> | null;
  onSaved?: () => void;
}

export function ProfileForm({
  existingProfile,
  onSaved,
}: ProfileFormProps): React.JSX.Element {
  const router = useRouter();
  const createOrUpdateProfile = useMutation(api.profiles.createOrUpdateProfile);

  const [displayName, setDisplayName] = useState<string>(
    existingProfile?.displayName ?? "",
  );
  const [age, setAge] = useState<string>(
    existingProfile ? String(existingProfile.age) : "",
  );
  const [gender, setGender] = useState<Gender>(
    (existingProfile?.gender as Gender) ?? "female",
  );
  const [seekingGenders, setSeekingGenders] = useState<Gender[]>(
    (existingProfile?.seekingGenders as Gender[] | undefined) ?? ["male"],
  );
  const [bio, setBio] = useState<string>(existingProfile?.bio ?? "");
  const [photos, setPhotos] = useState<ProfilePhoto[]>(
    existingProfile?.photos ?? [],
  );
  const [city, setCity] = useState<string>(existingProfile?.city ?? "");
  const [latitude, setLatitude] = useState<number | null>(
    existingProfile?.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    existingProfile?.longitude ?? null,
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSeeking(value: Gender): void {
    setSeekingGenders((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value],
    );
  }

  function useMyLocation(): void {
    if (!("geolocation" in navigator)) {
      setError(
        "Your browser doesn't support location detection — enter your city manually.",
      );
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsLocating(false);
      },
      () => {
        setError(
          "Couldn't get your location — you can still enter your city manually.",
        );
        setIsLocating(false);
      },
    );
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    const parsedAge = Number(age);
    if (!displayName.trim()) return setError("Enter your name.");
    if (!Number.isFinite(parsedAge) || parsedAge < 18) {
      return setError("You must be 18 or older to join.");
    }
    if (!city.trim()) return setError("Enter your city.");
    if (latitude === null || longitude === null) {
      return setError("Share your location so we can find matches near you.");
    }
    if (seekingGenders.length === 0) {
      return setError("Choose at least one preference for who you're seeking.");
    }
    if (photos.length === 0) {
      return setError("Add at least one photo.");
    }

    setIsSubmitting(true);
    try {
      await createOrUpdateProfile({
        displayName: displayName.trim(),
        age: parsedAge,
        gender,
        seekingGenders,
        bio: bio.trim(),
        photos,
        city: city.trim(),
        latitude,
        longitude,
      });
      onSaved?.();
      router.push("/discover");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium">Your photos</label>
        <ImageUploader photos={photos} onChange={setPhotos} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          placeholder="What should we call you?"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Age</label>
        <input
          value={age}
          onChange={(e) => setAge(e.target.value)}
          type="number"
          min={18}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">I am a</label>
        <div className="flex gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGender(opt.value)}
              className={`rounded-full border px-4 py-2 text-sm ${
                gender === opt.value
                  ? "border-rose-500 bg-rose-500 text-white"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Seeking</label>
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleSeeking(opt.value)}
              className={`rounded-full border px-4 py-2 text-sm ${
                seekingGenders.includes(opt.value)
                  ? "border-rose-500 bg-rose-500 text-white"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={500}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          placeholder="Tell people a bit about yourself..."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Location</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          placeholder="City, State/Country"
        />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={isLocating}
          className="flex items-center gap-2 text-sm text-rose-600 hover:underline"
        >
          {isLocating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <MapPin size={14} />
          )}
          {latitude !== null ? "Location shared ✓" : "Use my current location"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-rose-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-rose-500 disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Save & continue"}
      </button>
    </form>
  );
}
