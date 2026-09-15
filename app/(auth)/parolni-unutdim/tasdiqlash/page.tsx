"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authService } from "@/lib/api";
import { useT } from "@/lib/i18n";

/** Bosqich 21 — OTP tasdiqlangach `resetToken` (qisqa umrli, bir martalik)
    sessionStorage'da saqlanib `/parolni-unutdim/parol`ga o'tiladi. */
export default function ParolniUnutdimTasdiqlashPage() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const session = authService.getSession();
    if (session) {
      const dest = session.role === "xaridor" ? "/xaridor" : session.role === "mutaxassis" ? "/mutaxassis" : "/rol-tanlash";
      if (pathname !== dest) router.replace(dest);
      return;
    }
    const stored = window.sessionStorage.getItem("bd_reset_otp_phone");
    if (!stored) {
      router.replace("/parolni-unutdim");
      return;
    }
    setPhone(stored);
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
      const { resetToken } = await authService.verifyPasswordResetOtp(phone, code);
      window.sessionStorage.setItem("bd_reset_token", resetToken);
      router.push("/parolni-unutdim/parol");
    } catch (err) {
      const errCode = err instanceof Error ? err.message : "";
      setError(errCode === "RATE_LIMITED" ? t("auth.errRateLimited") : t("auth.codeError"));
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    try {
      await authService.requestPasswordResetOtp(phone);
    } catch {
      /* jimgina — foydalanuvchi baribir kodni qayta kiritishga urinadi */
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="rounded-3xl sm:rounded-[32px] border border-line/80 bg-card p-7 sm:p-12 lg:p-14 shadow-2xl shadow-black/5">
      <div className="mb-5">
        <BackButton href="/parolni-unutdim" label={t("common.back")} />
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        {t("auth.stepOtp")}
      </span>
      <h1 className="mt-2.5 font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-ink tracking-tight">
        {t("auth.confirmResetTitle")}
      </h1>
      <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
        {t("auth.otpSentTo")} <strong className="text-ink">{phone}</strong>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
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
    </div>
  );
}
