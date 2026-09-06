"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CardManager } from "@/components/shared/cards";
import { AccountControls } from "@/components/shared/AccountControls";
import { AccountSecurity } from "@/components/shared/AccountSecurity";
import { authService, paymentsService, usersService } from "@/lib/api";
import type { PaymentCard } from "@/lib/types";
import { useT, type Lang } from "@/lib/i18n";

export default function XaridorSozlamalarPage() {
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState("");
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([usersService.getCurrent(), paymentsService.getCards()])
      .then(([user, cardList]) => {
        if (user) {
          setFullName(user.fullName);
          setPhone(user.phone);
        }
        setCards(cardList);
        setLoading(false);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setNameError(t("onboard.errName"));
      return;
    }
    setSaving(true);
    try {
      await usersService.updateName(fullName.trim());
      toast(t("settings.saved"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    authService.logout();
    router.push("/kirish");
  }

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;
  if (loading) return <SkeletonCard />;

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-extrabold text-ink">
          {t("settings.title")}
        </h1>
        <p className="text-muted mt-2">{t("bset.subtitle")}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h2 className="font-heading text-lg font-bold text-ink">{t("bset.accountSection")}</h2>
          <p className="text-sm text-muted mt-1">{t("bset.accountHint")}</p>
        </div>
        <div className="md:col-span-2">
          <Card padding="lg">
            <form onSubmit={handleSave} className="flex flex-col gap-5" noValidate>
              <Input
                label={t("onboard.fullName")}
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setNameError(""); }}
                error={nameError}
              />
              <Input label={t("auth.regPhone")} value={phone} disabled readOnly />
              <Button type="submit" loading={saving} className="self-end px-8">
                {t("common.save")}
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <div className="w-full h-px bg-line"></div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h2 className="font-heading text-lg font-bold text-ink">{t("card.section")}</h2>
          <p className="text-sm text-muted mt-1">{t("card.sectionHint")}</p>
        </div>
        <div className="md:col-span-2">
          <Card padding="lg">
            <CardManager cards={cards} onChange={setCards} />
          </Card>
        </div>
      </div>

      <div className="w-full h-px bg-line"></div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h2 className="font-heading text-lg font-bold text-ink">{t("bset.prefsSection")}</h2>
          <p className="text-sm text-muted mt-1">{t("bset.prefsHint")}</p>
        </div>
        <div className="md:col-span-2 flex flex-col gap-6">
          <Card padding="lg">
            <h3 className="font-bold text-ink mb-3">{t("settings.langSection")}</h3>
            <RadioGroup
              options={[
                { value: "uz", label: "O'zbekcha" },
                { value: "ru", label: "Русский" },
                { value: "en", label: "English" },
              ]}
              value={lang}
              onChange={(value) => setLang(value as Lang)}
            />
          </Card>

          <Card padding="lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-ink">{t("nav.verification")}</h3>
                <p className="text-sm text-muted mt-1">{t("bset.verificationHint")}</p>
              </div>
              <Link
                href="/xaridor/verifikatsiya"
                className="inline-flex h-9 shrink-0 items-center rounded-btn border border-field bg-card px-3.5 text-xs font-medium text-ink shadow-card transition-colors duration-150 hover:border-primary hover:bg-card-hover"
              >
                {t("bset.verificationOpen")}
              </Link>
            </div>
          </Card>

          <AccountSecurity />
          <AccountControls />

          <Card padding="lg" className="border-danger/20 bg-danger/5">
            <h3 className="font-bold text-danger-deep mb-2">{t("settings.accountSection")}</h3>
            <p className="text-sm text-muted mb-4">{t("bset.dangerZoneHint")}</p>
            <Button variant="danger" onClick={() => setLogoutOpen(true)}>
              {t("common.logout")}
            </Button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title={t("settings.logoutTitle")}
        description={t("settings.logoutDesc")}
        confirmLabel={t("common.logout")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
