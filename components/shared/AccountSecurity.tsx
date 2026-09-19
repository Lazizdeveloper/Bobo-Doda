"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { usersService } from "@/lib/api";
import { useT } from "@/lib/i18n";

export function AccountSecurity() {
  const { t } = useT();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    // Bosqich 21 — backend siyosati bilan bir xil: kamida 8 belgi, faqat
    // bo'sh joylardan iborat bo'lmasin. Composition-fetish qoidalari
    // (harf+raqam majburiyligi) ATAYLAB yo'q — backend authoritative,
    // frontend undan qattiqroq bo'lmasligi kerak.
    if (newPassword.length < 8 || !/\S/.test(newPassword)) {
      setError(t("security.passwordRules"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("security.passwordMismatch"));
      return;
    }
    setSaving(true);
    try {
      await usersService.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast(t("security.passwordChanged"));
    } catch (cause) {
      setError(
        cause instanceof Error &&
          cause.message === "INVALID_CURRENT_PASSWORD"
          ? t("security.currentInvalid")
          : t("common.error")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="lg">
      <h2 className="font-heading text-base font-bold text-ink">
        {t("security.title")}
      </h2>
      <p className="mt-1 text-xs text-muted">{t("security.hint")}</p>
      <div className="mt-4 flex max-w-md flex-col gap-4">
        <Input
          type="password"
          autoComplete="current-password"
          label={t("security.current")}
          value={currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value);
            setError("");
          }}
        />
        <Input
          type="password"
          autoComplete="new-password"
          label={t("security.new")}
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
            setError("");
          }}
        />
        <Input
          type="password"
          autoComplete="new-password"
          label={t("security.confirm")}
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setError("");
          }}
          error={error}
        />
        <Button
          className="self-start"
          loading={saving}
          disabled={!currentPassword || !newPassword || !confirmPassword}
          onClick={submit}
        >
          {t("security.change")}
        </Button>
      </div>
    </Card>
  );
}
