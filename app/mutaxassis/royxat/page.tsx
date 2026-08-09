"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { TagInput } from "@/components/ui/TagInput";
import { useToast } from "@/components/ui/Toast";
import { CATEGORIES } from "@/lib/category-fields";
import { usersService } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { LIMITS } from "@/lib/validate";

interface Errors {
  fullName?: string;
  bio?: string;
  skills?: string;
  categories?: string;
  location?: string;
}

export default function RoyxatPage() {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    usersService
      .getCurrent()
      .then((user) => {
        if (user?.fullName) setFullName(user.fullName);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!fullName.trim()) next.fullName = t("onboard.errName");
    if (bio.trim().length < 20) next.bio = t("onboard.errBio");
    if (bio.trim().length > LIMITS.bio) next.bio = t("onboard.errBioLong");
    if (!skills.length) next.skills = t("onboard.errSkills");
    if (!categories.length) next.categories = t("onboard.errCategories");
    if (!location.trim()) next.location = t("onboard.errLocation");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await usersService.completeSellerProfile({
        fullName: fullName.trim(),
        bio: bio.trim(),
        skills,
        categories,
        location: location.trim(),
      });
      toast(t("settings.saved"));
      router.push("/kirish/tasdiqlash");
    } catch {
      toast(t("common.error"), "error");
      setLoading(false);
    }
  }

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;

  return (
    <Card padding="lg">
      <h1 className="font-heading text-xl font-bold text-ink">
        {t("onboard.title")}
      </h1>
      <p className="mt-2 text-sm text-muted">{t("onboard.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <Input
          label={t("onboard.fullName")}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t("onboard.fullNamePh")}
          error={errors.fullName}
        />
        <Textarea
          label={t("onboard.bio")}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t("onboard.bioPh")}
          error={errors.bio}
          maxLength={LIMITS.bio}
          hint={`${bio.length}/${LIMITS.bio}`}
        />
        <TagInput
          label={t("onboard.skills")}
          value={skills}
          onChange={setSkills}
          placeholder={t("onboard.skillsPh")}
          error={errors.skills}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">
            {t("onboard.categories")}
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const selected = categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  aria-pressed={selected}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors duration-150 ${
                    selected
                      ? "border-primary bg-primary/15 font-medium text-ink"
                      : "border-line bg-card text-muted hover:text-ink"
                  }`}
                >
                  {t(`cat.${cat}`)}
                </button>
              );
            })}
          </div>
          {errors.categories && (
            <p className="text-2xs text-danger" role="alert">
              {errors.categories}
            </p>
          )}
        </div>

        <Input
          label={t("onboard.location")}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("onboard.locationPh")}
          error={errors.location}
        />

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          {t("onboard.submit")}
        </Button>
      </form>
    </Card>
  );
}
