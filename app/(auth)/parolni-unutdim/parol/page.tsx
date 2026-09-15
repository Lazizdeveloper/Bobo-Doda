"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { authService } from "@/lib/api";
import { useT } from "@/lib/i18n";

/** Bosqich 21 — parolni tiklashning YAKUNIY bosqichi. Muvaffaqiyatli
    bo'lsa sessiya AVTOMATIK OCHILMAYDI (backend BARCHA eski sessiyalarni
    bekor qiladi) — foydalanuvchi yangi parol bilan `/kirish`ga qaytadi. */
export default function ParolniUnutdimParolPage() {
  const { t } = useT();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = authService.getSession();
    if (session) {
      const dest = session.role === "xaridor" ? "/xaridor" : session.role === "mutaxassis" ? "/mutaxassis" : "/rol-tanlash";
      if (pathname !== dest) router.replace(dest);
      return;
    }
    const stored = window.sessionStorage.getItem("bd_reset_token");
    if (!stored) {
      router.replace("/parolni-unutdim");
      return;
    }
    setResetToken(stored);
  }, [router, pathname]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8 || !/\S/.test(password)) {
      setError(t("security.passwordRules"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.errPasswordMatch"));
      return;
    }
    setLoading(true);
    try {
      await authService.completePasswordReset(resetToken, password, confirmPassword);
      window.sessionStorage.removeItem("bd_reset_token");
      window.sessionStorage.removeItem("bd_reset_otp_phone");
      toast(t("auth.resetSuccess"));
      router.push("/kirish");
    } catch (err) {
      const errCode = err instanceof Error ? err.message : "";
      if (errCode === "TOKEN_EXPIRED") {
        window.sessionStorage.removeItem("bd_reset_token");
        router.replace("/parolni-unutdim");
        return;
      }
      setError(t("common.error"));
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl sm:rounded-[32px] border border-line/80 bg-card p-7 sm:p-12 lg:p-14 shadow-2xl shadow-black/5">
      <div className="mb-5">
        <BackButton href="/kirish" label={t("auth.backToLogin")} />
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        {t("auth.finalStep")}
      </span>
      <h1 className="mt-2.5 font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-ink tracking-tight">
        {t("auth.newPasswordTitle")}
      </h1>
      <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">{t("auth.newPasswordIntro")}</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <Input
          type="password"
          autoComplete="new-password"
          label={t("auth.newPassword")}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError("");
          }}
          autoFocus
        />
        <Input
          type="password"
          autoComplete="new-password"
          label={t("auth.confirmPassword")}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError("");
          }}
          error={error}
        />
        <Button type="submit" size="lg" loading={loading} className="w-full !h-14 sm:!h-16 !text-base font-bold !rounded-2xl">
          {t("auth.resetSubmit")}
        </Button>
      </form>
    </div>
  );
}
