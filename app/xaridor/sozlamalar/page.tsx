"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CardManager } from "@/components/shared/cards";
import { AccountControls } from "@/components/shared/AccountControls";
import { AccountSecurity } from "@/components/shared/AccountSecurity";
import { getCards, getCurrentUser, logout, updateUserName } from "@/lib/api";
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

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) {
        setFullName(user.fullName);
        setPhone(user.phone);
      }
      setLoading(false);
    });
    getCards().then(setCards);
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setNameError(t("onboard.errName"));
      return;
    }
    setSaving(true);
    try {
      await updateUserName(fullName.trim());
      toast(t("settings.saved"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    router.push("/kirish");
  }

  if (loading) return <SkeletonCard />;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-heading text-2xl font-extrabold text-ink">
        {t("settings.title")}
      </h1>

      {/* Hisob ma'lumotlari */}
      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("bset.accountSection")}
        </h2>
        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4" noValidate>
          <Input
            label={t("onboard.fullName")}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setNameError("");
            }}
            error={nameError}
          />
          <Input label={t("auth.regPhone")} value={phone} disabled readOnly />
          <Button type="submit" loading={saving} className="self-start">
            {t("common.save")}
          </Button>
        </form>
      </Card>

      {/* Til */}
      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("settings.langSection")}
        </h2>
        <p className="mt-1 text-xs text-muted">{t("settings.langHint")}</p>
        <div className="mt-4">
          <RadioGroup
            options={[
              { value: "uz", label: "O'zbekcha" },
              { value: "ru", label: "Русский" },
              { value: "en", label: "English" },
            ]}
            value={lang}
            onChange={(value) => setLang(value as Lang)}
          />
        </div>
      </Card>

      {/* Kartalarim (Uzcard / Humo) */}
      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("card.section")}
        </h2>
        <p className="mt-1 text-xs text-muted">{t("card.sectionHint")}</p>
        <div className="mt-4">
          <CardManager cards={cards} onChange={setCards} />
        </div>
      </Card>

      <AccountSecurity />
      <AccountControls />

      {/* Hisob */}
      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("settings.accountSection")}
        </h2>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => setLogoutOpen(true)}
        >
          {t("common.logout")}
        </Button>
      </Card>

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
