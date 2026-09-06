"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { CountryPhoneInput } from "@/components/shared/CountryPhoneInput";
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

function GoogleSmallIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

export default function ParolniTiklashPage() {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("phone");
  const [phone, setPhone] = useState("+998");
  const [phoneValid, setPhoneValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleSendCode(e: FormEvent) {
    e.preventDefault();
    if (!phoneValid || !phone || phone.length < 9) {
      setErrors({ phone: t("auth.errPhone") });
      return;
    }
    setErrors({});
    setSending(true);

    const raw = phone.replace(/\D/g, "");
    const masked = `${raw.slice(0, 2)}***${raw.slice(-2)}@gmail.com`;
    setMaskedEmail(masked);

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
      <p className="mt-2 text-sm text-muted">{t("auth.resetSubtitle")}</p>

      {phase === "phone" ? (
        <form onSubmit={handleSendCode} className="mt-6 flex flex-col gap-4" noValidate>
          <CountryPhoneInput
            value={phone}
            label={t("auth.regPhone")}
            error={errors.phone}
            onChange={(fullNum, isValid) => {
              setPhone(fullNum);
              setPhoneValid(isValid);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
          />
          <Button type="submit" size="lg" loading={sending} className="w-full mt-2">
            {t("auth.resetSendCode")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="mt-6 flex flex-col gap-4" noValidate>
          {/* Tasdiqlangan Google Email xabari */}
          <div className="rounded-2xl border border-line bg-surface/80 p-3.5 flex items-start gap-3">
            <GoogleSmallIcon />
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-bold text-ink leading-snug">
                Tasdiqlangan Google akkountingizga tiklash kodi yuborildi:
              </p>
              <p className="text-xs font-mono font-bold text-primary mt-0.5">
                {maskedEmail}
              </p>
              <p className="text-2xs text-muted mt-1 leading-relaxed">
                Google pochtangizni tekshirib, 6 xonali tiklash kodini kiriting.
              </p>
            </div>
          </div>

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
          className="font-medium text-primary hover:underline cursor-pointer"
        >
          {t("auth.backToLogin")}
        </button>
      </p>
    </Card>
  );
}
