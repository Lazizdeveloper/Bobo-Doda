"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { CountryPhoneInput } from "@/components/shared/CountryPhoneInput";
import { authService } from "@/lib/api";
import { useT } from "@/lib/i18n";

type Phase = "phone" | "reset";
type RecoveryMethod = "telegram" | "google";

interface Errors {
  phone?: string;
  code?: string;
  password?: string;
  confirm?: string;
  form?: string;
}

function TelegramSmallIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M21.5 4.6 18.6 19c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.5L18 7c.4-.3-.1-.5-.6-.2L7.3 13.2l-4.4-1.4c-1-.3-1-1 .2-1.4L20.2 3.3c.8-.3 1.5.2 1.3 1.3Z"
        fill="#229ED9"
      />
    </svg>
  );
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
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function ParolniTiklashPage() {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("phone");
  const [method, setMethod] = useState<RecoveryMethod>("telegram");
  const [phone, setPhone] = useState("+998");
  const [phoneValid, setPhoneValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [maskedTelegram, setMaskedTelegram] = useState("");
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
    const maskedMail = `${raw.slice(0, 2)}***${raw.slice(-2)}@gmail.com`;
    const maskedTg = `Telegram (+${raw.slice(0, 3)} ${raw.slice(3, 5)} *** ** ${raw.slice(-2)})`;
    setMaskedEmail(maskedMail);
    setMaskedTelegram(maskedTg);

    setTimeout(() => {
      setSending(false);
      setPhase("reset");
      toast(
        method === "telegram"
          ? "Telegram orqali 6 xonali tiklash kodi yuborildi"
          : "Google pochtangizga 6 xonali tiklash kodi yuborildi"
      );
    }, 800);
  }

  function handleSwitchMethod(newMethod: RecoveryMethod) {
    setMethod(newMethod);
    setCode("");
    setErrors({});
    toast(
      newMethod === "telegram"
        ? "Telegram orqali yangi tiklash kodi yuborildi"
        : "Google pochtangizga yangi tiklash kodi yuborildi"
    );
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
      await authService.resetPassword({
        phone: phone.trim(),
        code,
        newPassword: password,
        method,
      });
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
    <div className="rounded-3xl sm:rounded-[32px] border border-line/80 bg-card p-7 sm:p-12 lg:p-14 shadow-2xl shadow-black/5 transition-all duration-300">
      <div className="mb-6">
        <BackButton href="/kirish?tab=kirish" label={t("auth.backToLogin")} />
      </div>
      <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl xl:text-[38px] font-black text-ink tracking-tight leading-tight">
        {t("auth.resetTitle")}
      </h1>
      <p className="mt-3 text-sm sm:text-base lg:text-lg text-muted leading-relaxed font-normal">
        {t("auth.resetSubtitle")}
      </p>

      {phase === "phone" ? (
        <form onSubmit={handleSendCode} className="mt-8 flex flex-col gap-6" noValidate>
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

          {/* Qaysi usul orqali kod olish tanlovi: Telegram yoki Google */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs sm:text-sm font-semibold text-ink">
              {t("auth.resetMethodDesc")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Telegram Card */}
              <button
                type="button"
                onClick={() => setMethod("telegram")}
                className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  method === "telegram"
                    ? "border-[#229ED9] bg-[#229ED9]/5 shadow-sm ring-2 ring-[#229ED9]/20"
                    : "border-line bg-surface/50 hover:border-line hover:bg-surface"
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/20">
                  <TelegramSmallIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-ink">{t("auth.resetViaTelegram")}</span>
                    {method === "telegram" && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#229ED9] text-white text-2xs font-black">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-muted truncate mt-0.5">Tezkor 6 xonali kod</p>
                </div>
              </button>

              {/* Google Card */}
              <button
                type="button"
                onClick={() => setMethod("google")}
                className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  method === "google"
                    ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                    : "border-line bg-surface/50 hover:border-line hover:bg-surface"
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card border border-line shadow-xs">
                  <GoogleSmallIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-ink">{t("auth.resetViaGoogle")}</span>
                    {method === "google" && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-2xs font-black">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-muted truncate mt-0.5">Xavfsiz Google Email</p>
                </div>
              </button>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={sending}
            className="w-full !h-14 sm:!h-16 !text-base sm:!text-lg font-bold !rounded-2xl shadow-lg shadow-primary/20 mt-2"
          >
            {t("auth.resetSendCode")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="mt-8 flex flex-col gap-5" noValidate>
          {/* Tanlangan usul bo'yicha xabar kartasi */}
          {method === "telegram" ? (
            <div className="rounded-2xl border border-[#229ED9]/30 bg-[#229ED9]/5 p-4 sm:p-5 flex items-start gap-3.5 transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#229ED9]/15">
                <TelegramSmallIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-ink leading-snug">
                  {t("auth.resetTelegramNotice")}
                </p>
                <p className="text-sm font-mono font-bold text-[#229ED9] mt-1 truncate">
                  {maskedTelegram || phone}
                </p>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {t("auth.resetTelegramHint")}
                </p>

                {/* Boshqa usulga (Google pochtaga) almashtirish havolasi */}
                <div className="mt-3 pt-3 border-t border-[#229ED9]/15 flex items-center justify-between">
                  <span className="text-2xs text-muted">Telegramga kod kelmadimi?</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchMethod("google")}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    <GoogleSmallIcon />
                    <span>Google Email orqali olish</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex items-start gap-3.5 transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-line shadow-xs">
                <GoogleSmallIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-ink leading-snug">
                  {t("auth.resetGoogleNotice")}
                </p>
                <p className="text-sm font-mono font-bold text-primary mt-1 truncate">
                  {maskedEmail}
                </p>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {t("auth.resetGoogleHint")}
                </p>

                {/* Boshqa usulga (Telegramga) almashtirish havolasi */}
                <div className="mt-3 pt-3 border-t border-primary/15 flex items-center justify-between">
                  <span className="text-2xs text-muted">Pochtaga kod kelmadimi?</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchMethod("telegram")}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#229ED9] hover:underline cursor-pointer"
                  >
                    <TelegramSmallIcon />
                    <span>Telegram orqali olish</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>6 xonali tasdiqlash kodi:</span>
              <button
                type="button"
                onClick={() => setPhase("phone")}
                className="text-primary hover:underline cursor-pointer font-medium text-2xs"
              >
                Raqamni o&apos;zgartirish
              </button>
            </div>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              aria-label={t("auth.verifyTitle")}
              error={errors.code}
              className="!h-16 sm:!h-20 text-center text-2xl sm:text-3xl font-black tracking-[0.5em] !rounded-2xl"
              autoFocus
            />
          </div>

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
            <p className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger" role="alert">
              {errors.form}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            loading={saving}
            className="w-full !h-14 sm:!h-16 !text-base sm:!text-lg font-bold !rounded-2xl shadow-lg shadow-primary/20"
          >
            {t("auth.resetSubmit")}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-xs sm:text-sm text-muted">
        <button
          type="button"
          onClick={() => router.push("/kirish?tab=kirish")}
          className="font-semibold text-primary hover:underline cursor-pointer"
        >
          {t("auth.backToLogin")}
        </button>
      </p>
    </div>
  );
}
