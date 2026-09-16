"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authService } from "@/lib/api";
import { mapOtpVerifyError } from "@/lib/api/otp-error";
import { peekDevOtp } from "@/lib/api/dev-otp-bridge";
import { useT } from "@/lib/i18n";

/** Bosqich 21 — OTP tasdiqlangach User HALI yaratilmaydi: `verifyRegisterOtp`
    qisqa umrli `registrationToken` qaytaradi, u sessionStorage'da saqlanib
    `/royxatdan-otish/parol`ga (parol yaratish bosqichi) o'tiladi. Telefon
    allaqachon ro'yxatdan o'tganligi ENDI bu yerda emas, parol bosqichida
    (`completeRegistration`) tekshiriladi. */
export default function RoyxatdanOtishTasdiqlashPage() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  /** Bosqich 22 — FAQAT development (`dev-otp-bridge.ts`), hech qachon
      Storage'ga yozilmaydi. */
  const [devOtp, setDevOtp] = useState<string | undefined>();

  useEffect(() => {
    const session = authService.getSession();
    if (session) {
      const dest = session.role === "xaridor" ? "/xaridor" : session.role === "mutaxassis" ? "/mutaxassis" : "/rol-tanlash";
      if (pathname !== dest) router.replace(dest);
      return;
    }
    const stored = window.sessionStorage.getItem("bd_register_otp_phone");
    if (!stored) {
      router.replace("/royxatdan-otish");
      return;
    }
    setPhone(stored);
    setDevOtp(peekDevOtp());
  }, [router, pathname]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError(t("auth.codeError"));
      return;
    }
    setLoading(true);
    try {
      const { registrationToken } = await authService.verifyRegisterOtp(phone, code);
      window.sessionStorage.setItem("bd_registration_token", registrationToken);
      router.push("/royxatdan-otish/parol");
    } catch (err) {
      setError(mapOtpVerifyError(err, t));
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    try {
      const res = await authService.requestRegisterOtp(phone);
      setDevOtp(res.devOtp);
    } catch {
      /* jimgina — foydalanuvchi baribir kodni qayta kiritishga urinadi */
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="rounded-3xl sm:rounded-[32px] border border-line/80 bg-card p-7 sm:p-12 lg:p-14 shadow-2xl shadow-black/5">
      <div className="mb-5">
        <BackButton href="/royxatdan-otish" label={t("auth.tabRegister")} />
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        {t("auth.stepOtp")}
      </span>
      <h1 className="mt-2.5 font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-ink tracking-tight">
        {t("auth.confirmRegisterTitle")}
      </h1>
      <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
        {t("auth.otpSentTo")} <strong className="text-ink">{phone}</strong>
      </p>

      {devOtp && (
        <div className="mt-5 rounded-xl border border-dashed border-warning/50 bg-warning/10 p-3 text-xs sm:text-sm">
          <p className="font-bold uppercase tracking-wide text-warning-deep">{t("auth.devOtpLabel")}</p>
          <p className="mt-1 text-ink">
            {t("auth.devOtpCode")} <span className="font-mono font-bold tracking-wider">{devOtp}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setCode(devOtp);
              if (error) setError("");
            }}
            className="mt-1.5 text-xs font-semibold text-primary hover:underline"
          >
            {t("auth.devOtpFillBtn")}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            if (error) setError("");
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          aria-label={t("auth.verifyTitle")}
          error={error}
          className="!h-16 sm:!h-20 text-center text-2xl sm:text-3xl font-black tracking-[0.5em] !rounded-2xl"
          autoFocus
        />
        <Button type="submit" size="lg" loading={loading} className="w-full !h-14 sm:!h-16 !text-base font-bold !rounded-2xl">
          {t("auth.verifyBtn")}
        </Button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-xs sm:text-sm font-semibold text-primary hover:underline py-1 disabled:opacity-50"
        >
          {resending ? t("common.loading") : t("auth.resendCode")}
        </button>
      </form>

      <div className="mt-10 pt-6 border-t border-line/60 flex items-center justify-center gap-2.5 text-xs sm:text-sm text-muted">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span>{t("auth.trustBadgeEscrow")}</span>
      </div>
    </div>
  );
}
