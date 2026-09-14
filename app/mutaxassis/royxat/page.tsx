"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { sellerApplicationService, usersService } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { useT } from "@/lib/i18n";
import { LIMITS } from "@/lib/validate";

interface Errors {
  fullName?: string;
  legalName?: string;
  displayName?: string;
  description?: string;
}

/**
 * Bosqich 17 — real backendda boy sotuvchi profili (bio/skills/kategoriya/
 * joylashuv/portfolio) YO'Q, faqat: (1) `fullName` (`profileDone` gate'i
 * shuni talab qiladi) va (2) sotuvchi arizasi (`legalName`/`displayName`/
 * `description` — real faoliyat huquqi shundan keladi). Boshqa mock
 * maydonlar (skills/categories/location) real backendda saqlanmaydi.
 */
export default function RoyxatPage() {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    usersService
      .getCurrent()
      .then((user) => {
        if (user?.fullName) {
          setFullName(user.fullName);
          setDisplayName((prev) => prev || user.fullName);
        }
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  function validate(): boolean {
    const next: Errors = {};
    if (!fullName.trim()) next.fullName = t("onboard.errName");
    if (!legalName.trim()) next.legalName = t("onboard.errName");
    if (!displayName.trim()) next.displayName = t("onboard.errName");
    if (description.trim().length > 0 && description.trim().length < 20) next.description = t("onboard.errBio");
    if (description.trim().length > LIMITS.bio) next.description = t("onboard.errBioLong");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await usersService.updateName(fullName.trim());
      try {
        await sellerApplicationService.submit({
          legalName: legalName.trim(),
          displayName: displayName.trim(),
          description: description.trim() || undefined,
        });
      } catch (err) {
        /* Ariza allaqachon yuborilgan (masalan orqaga qaytib qayta submit
           qilingan) — bu xato emas, davom etiladi. */
        const alreadyApplied = err instanceof ApiError && err.message === "SELLER_APPLICATION_ALREADY_PENDING";
        if (!alreadyApplied) throw err;
      }
      toast(t("settings.saved"));
      router.push("/mutaxassis");
    } catch {
      toast(t("common.error"), "error");
      setLoading(false);
    }
  }

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;

  return (
    <Card padding="lg">
      <h1 className="font-heading text-xl font-bold text-ink">{t("onboard.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("onboard.applicationSubtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <Input
          label={t("onboard.fullName")}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t("onboard.fullNamePh")}
          error={errors.fullName}
        />
        <Input
          label={t("onboard.legalName")}
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          placeholder={t("onboard.fullNamePh")}
          error={errors.legalName}
        />
        <Input
          label={t("onboard.displayName")}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("onboard.displayNamePh")}
          error={errors.displayName}
        />
        <Textarea
          label={t("onboard.bio")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("onboard.bioPh")}
          error={errors.description}
          maxLength={LIMITS.bio}
          hint={`${description.length}/${LIMITS.bio}`}
        />

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          {t("onboard.submitApplication")}
        </Button>
      </form>
    </Card>
  );
}
