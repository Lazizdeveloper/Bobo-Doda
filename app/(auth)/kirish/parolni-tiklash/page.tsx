"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { authService } from "@/lib/api";
import { useT } from "@/lib/i18n";

type Phase = "phone" | "reset";

interface Errors {
  phone?: string;
  code?: string;
  password?: string;
  confirm?: string;
  form?: string;
}

export default function ParolniTiklashPage() {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleSendCode(e: FormEvent) {
    e.preventDefault();
    if (!/^\+?\d{9,15}$/.test(phone.replace(/[\s-]/g, ""))) {
      setErrors({ phone: t("auth.errPhone") });
      return;
    }
    setErrors({});
    setSending(true);
    /* Mock: real SMS/Telegram yuborilmaydi — istalgan 6 xonali kod qabul qilinadi */
    setTimeout(() => {
      setSending(false);
      setPhase("reset");
    }, 800);
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!/^\d{6}$/.test(code)) next.code = t("auth.codeError");
    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      next.password = t("security.passwordRules");
    }
    if (confirm !== password) next.confirm = t("auth.errPasswordMatch");
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await authService.resetPassword({ phone: phone.trim(), code, newPassword: password });
      toast(t("auth.resetSuccess"));
      router.push("/kirish?tab=kirish");
    } catch (err) {
      const errCode = err instanceof Error ? err.message : "";
      if (errCode === "USER_NOT_FOUND" || errCode === "INVALID_CREDENTIALS") {
        setErrors({ form: t("auth.errUserNotFound") });
      } else if (errCode === "WEAK_PASSWORD") {
        setErrors({ password: t("security.passwordRules") });
      } else if (errCode === "INVALID_CODE") {
        setErrors({ code: t("auth.codeError") });
      } else {
        setErrors({ form: t("common.error") });
      }
      setSaving(false);
    }
  }

  return (
    <Card padding="lg">
      <h1 className="font-heading text-2xl font-extrabold text-ink">
        {t("auth.resetTitle")}
      </h1>
      <p className="mt-3 text-sm text-muted">{t("auth.resetSubtitle")}</p>

      {phase === "phone" ? (
        <form onSubmit={handleSendCode} className="mt-6 flex flex-col gap-4" noValidate>
          <Input
            label={t("auth.regPhone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("auth.regPhonePh")}
            inputMode="tel"
            autoComplete="tel"
            error={errors.phone}
            autoFocus
          />
          <Button type="submit" size="lg" loading={sending} className="w-full">
            {t("auth.resetSendCode")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="mt-6 flex flex-col gap-4" noValidate>
          <p className="text-xs text-muted">{t("auth.verifyHint")}</p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            aria-label={t("auth.verifyTitle")}
            error={errors.code}
            className="text-center text-lg tracking-[0.5em]"
            autoFocus
          />
          <Input
            label={t("auth.resetNewPassword")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            error={errors.password}
          />
          <Input
            label={t("auth.resetConfirmPassword")}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            error={errors.confirm}
          />
          {errors.form && (
            <p className="text-xs text-danger" role="alert">
              {errors.form}
            </p>
          )}
          <Button type="submit" size="lg" loading={saving} className="w-full">
            {t("auth.resetSubmit")}
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-2xs text-faint">
        <button
          type="button"
          onClick={() => router.push("/kirish?tab=kirish")}
          className="font-medium text-primary hover:underline"
        >
          {t("auth.backToLogin")}
        </button>
      </p>
    </Card>
  );
}
