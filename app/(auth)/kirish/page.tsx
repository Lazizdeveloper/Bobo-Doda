"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CountryPhoneInput } from "@/components/shared/CountryPhoneInput";

/** Bosqich 21 — telefon + PAROL, SMS ISHTIROK ETMAYDI (asosiy invariant:
    oddiy login uchun SMS soni = 0). Noto'g'ri telefon va noto'g'ri parol
    bir xil generic `INVALID_CREDENTIALS`ga tushadi (enumeration-safe) —
    qaysi biri xato ekanini frontend ham bilmaydi/ko'rsatmaydi. */
export default function KirishPage() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();

  const [phone, setPhone] = useState("+998");
  const [phoneValid, setPhoneValid] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* Sessiya tekshiruvi: allaqachon kirgan foydalanuvchi o'z kabinetiga qaytariladi */
  useEffect(() => {
    const session = authService.getSession();
    if (!session) {
      // "Hisob allaqachon mavjud" CTA'dan kelgan bo'lsa telefon oldindan to'ldiriladi.
      const prefill = window.sessionStorage.getItem("bd_prefill_phone");
      if (prefill) {
        setPhone(prefill);
        setPhoneValid(true);
        window.sessionStorage.removeItem("bd_prefill_phone");
      }
      return;
    }
    let dest = "/rol-tanlash";
    if (session.role === "xaridor") dest = "/xaridor";
    else if (session.role === "mutaxassis") dest = session.profileDone ? "/mutaxassis" : "/mutaxassis/royxat";
    if (pathname !== dest) router.replace(dest);
  }, [router, pathname]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!phoneValid) {
      setError(t("auth.errPhone"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const session = await authService.login(phone.trim(), password);
      router.push(!session.role ? "/rol-tanlash" : session.role === "xaridor" ? "/xaridor" : "/mutaxassis");
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(
        code === "RATE_LIMITED"
          ? t("auth.errRateLimited")
          : code === "ACCOUNT_BLOCKED" || code === "ACCOUNT_SUSPENDED"
            ? t("auth.errAccountBlocked")
            : t("auth.errCredentials"),
      );
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl sm:rounded-[32px] border border-line/80 bg-card p-7 sm:p-12 lg:p-14 shadow-2xl shadow-black/5">
      <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="Bobo&Doda" className="h-9 w-9 object-contain" />
        <span className="font-heading font-black text-lg tracking-tight text-ink">BOBO&amp;DODA</span>
      </Link>
      <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-ink tracking-tight">
        {t("auth.loginTitle")}
      </h1>
      <p className="mt-2.5 text-sm sm:text-base text-muted leading-relaxed">{t("auth.loginSubtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <CountryPhoneInput
          id="login-phone"
          value={phone}
          label={t("auth.regPhone")}
          onChange={(fullNum, isValid) => {
            setPhone(fullNum);
            setPhoneValid(isValid);
            if (error) setError("");
          }}
        />
        <Input
          type="password"
          autoComplete="current-password"
          label={t("auth.password")}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError("");
          }}
          error={error}
        />
        <Button type="submit" size="lg" loading={loading} className="w-full !h-14 sm:!h-16 !text-base font-bold !rounded-2xl">
          {t("auth.loginBtn")}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link href="/parolni-unutdim" className="font-semibold text-primary hover:underline">
          {t("auth.forgotPassword")}
        </Link>
      </p>

      <p className="mt-6 text-center text-sm text-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/royxatdan-otish" className="font-semibold text-primary hover:underline">
          {t("auth.tabRegister")}
        </Link>
      </p>

      <div className="mt-8 flex items-center justify-center gap-2.5 text-xs sm:text-sm text-muted">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span>{t("auth.secureBadge")}</span>
      </div>
    </div>
  );
}
