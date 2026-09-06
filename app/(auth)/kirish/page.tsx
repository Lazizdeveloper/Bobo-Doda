"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/lib/api";
import { useT } from "@/lib/i18n";

type Mode = "register" | "login";

interface Errors {
  fullName?: string;
  phone?: string;
  password?: string;
  terms?: string;
  form?: string;
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
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

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M21.5 4.6 18.6 19c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.5L18 7c.4-.3-.1-.5-.6-.2L7.3 13.2l-4.4-1.4c-1-.3-1-1 .2-1.4L20.2 3.3c.8-.3 1.5.2 1.3 1.3Z"
        fill="#229ED9"
      />
    </svg>
  );
}

function KirishForm() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* Boshlang'ich holat ?tab=kirish yoki ro'yxatdan o'tish */
  const [mode, setMode] = useState<Mode>(
    searchParams.get("tab") === "kirish" ? "login" : "register"
  );

  /* Ro'yxatdan o'tish holati */
  const [regFullName, setRegFullName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  /* Kirish holati */
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  /* Umumiy xatolar va yuklanish */
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"telegram" | "google" | null>(null);

  /* Sessiya tekshiruvi: tasdiqlangan foydalanuvchi kabinetga yo'naltiriladi */
  useEffect(() => {
    const session = authService.getSession();
    if (!session || !session.verified) return;

    let dest = null;
    if (session.role === "xaridor") dest = "/xaridor";
    else if (session.role === "mutaxassis" && session.profileDone) dest = "/mutaxassis";

    if (dest && pathname !== dest) {
      router.replace(dest);
    }
  }, [router, pathname]);

  /* Rejimni almashtirish */
  function switchMode(next: Mode) {
    if (loading || socialLoading) return;
    setMode(next);
    setErrors({});
  }

  /* 1-klikli ijtimoiy kirish (Google & Telegram) */
  async function handleSocialLogin(provider: "telegram" | "google") {
    if (socialLoading || loading) return;
    setSocialLoading(provider);
    setErrors({});
    try {
      const wanted = searchParams.get("role");
      const chosenRole = wanted === "mutaxassis" || wanted === "xaridor" ? wanted : undefined;
      const session =
        provider === "telegram"
          ? await authService.loginWithTelegram({ role: chosenRole })
          : await authService.loginWithGoogle({ role: chosenRole });

      if (!session.role) {
        router.push(wanted ? `/rol-tanlash?role=${wanted}` : "/rol-tanlash");
      } else if (session.role === "xaridor") {
        router.push("/xaridor");
      } else {
        router.push("/mutaxassis");
      }
    } catch {
      setErrors({ form: t("common.error") });
    } finally {
      setSocialLoading(null);
    }
  }

  /* Ro'yxatdan o'tish validatsiyasi */
  function validateRegister(): boolean {
    const next: Errors = {};
    if (regFullName.trim().length < 2) {
      next.fullName = t("auth.errName");
    }
    if (!/^\+?\d{9,15}$/.test(regPhone.replace(/[\s-]/g, ""))) {
      next.phone = t("auth.errPhone");
    }
    if (regPassword.length < 8 || !/[A-Za-z]/.test(regPassword) || !/\d/.test(regPassword)) {
      next.password = t("security.passwordRules");
    }
    if (!acceptedTerms) {
      next.terms = t("auth.termsAccept");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /* Kirish validatsiyasi */
  function validateLogin(): boolean {
    const next: Errors = {};
    if (!/^\+?\d{9,15}$/.test(loginPhone.replace(/[\s-]/g, ""))) {
      next.phone = t("auth.errPhone");
    }
    if (loginPassword.length < 6) {
      next.password = t("auth.errPassword");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /* Ro'yxatdan o'tish submit */
  async function handleRegisterSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateRegister()) return;
    setLoading(true);
    setErrors({});
    try {
      await authService.register({
        fullName: regFullName.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      });
      const wanted = searchParams.get("role");
      router.push(
        wanted === "mutaxassis" || wanted === "xaridor"
          ? `/rol-tanlash?role=${wanted}`
          : "/rol-tanlash"
      );
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "PHONE_EXISTS") setErrors({ phone: t("auth.errPhoneExists") });
      else if (code === "WEAK_PASSWORD") setErrors({ password: t("security.passwordRules") });
      else if (code === "REGISTRATION_PAUSED") setErrors({ form: t("auth.errRegistrationPaused") });
      else if (code === "STORAGE_FULL") setErrors({ form: t("err.storageFull") });
      else setErrors({ form: t("common.error") });
      setLoading(false);
    }
  }

  /* Kirish submit */
  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoading(true);
    setErrors({});
    try {
      const session = await authService.login({
        phone: loginPhone.trim(),
        password: loginPassword,
      });
      if (session.role === "xaridor") router.push("/xaridor");
      else if (session.role === "mutaxassis") router.push("/mutaxassis");
      else router.push("/rol-tanlash");
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "INVALID_CREDENTIALS") setErrors({ form: t("auth.errCredentials") });
      else if (code === "ACCOUNT_BLOCKED") setErrors({ form: t("auth.errAccountBlocked") });
      else if (code === "STORAGE_FULL") setErrors({ form: t("err.storageFull") });
      else setErrors({ form: t("common.error") });
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="relative mx-auto w-full max-w-[980px] overflow-hidden rounded-[26px] sm:rounded-[32px] border border-line/60 bg-card shadow-[0_24px_70px_-15px_rgba(20,20,20,0.08)]">
      {/* 📱 Mobil boshqaruv paneli (faqat kichik ekranlarda ko'rinadi) */}
      <div className="border-b border-line/60 bg-surface/60 p-4 sm:p-5 md:hidden">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm font-heading font-black text-sm">
              B
            </div>
            <span className="font-heading font-black text-base tracking-tight text-ink">
              BOBO&DODA
            </span>
          </div>
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted bg-card px-2.5 py-1 rounded-full border border-line">
            {isLogin ? t("auth.tabLogin") : t("auth.tabRegister")}
          </span>
        </div>

        <div className="flex rounded-xl border border-line bg-card p-1">
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`h-9 flex-1 rounded-lg text-xs font-bold transition-all ${
              !isLogin
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {t("auth.tabRegister")}
          </button>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`h-9 flex-1 rounded-lg text-xs font-bold transition-all ${
              isLogin
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {t("auth.tabLogin")}
          </button>
        </div>
      </div>

      {/* Asosiy 2 ustunli konteyner */}
      <div className="grid min-h-[580px] sm:min-h-[620px] grid-cols-1 md:grid-cols-2">
        {/* ============================================================== */}
        {/* CHAP USTUN: TIZIMGA KIRISH FORMASI (Login Form)                 */}
        {/* ============================================================== */}
        <div
          className={`flex-col justify-center px-6 py-8 sm:px-10 sm:py-12 lg:px-14 transition-all duration-300 ${
            isLogin
              ? "flex visible opacity-100"
              : "hidden md:flex md:invisible md:opacity-0 md:pointer-events-none"
          }`}
          aria-hidden={!isLogin}
        >
          <div className="w-full max-w-sm mx-auto">
            {/* Desktop logo */}
            <div className="mb-6 hidden md:flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm font-heading font-black text-sm">
                B
              </div>
              <span className="font-heading font-black text-base tracking-tight text-ink">
                BOBO&DODA
              </span>
            </div>

            <h2 className="font-heading text-2xl sm:text-3xl font-black text-ink tracking-tight">
              {t("auth.loginTitle")}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
              {t("auth.loginSubtitle")}
            </p>

            {/* 1-klikli ijtimoiy tugmalar */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                disabled={!!socialLoading || loading}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface/80 px-3 text-xs font-bold text-ink transition-all hover:border-[#4285F4]/40 hover:bg-card hover:shadow-sm disabled:opacity-50"
              >
                <GoogleIcon />
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("telegram")}
                disabled={!!socialLoading || loading}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface/80 px-3 text-xs font-bold text-ink transition-all hover:border-[#229ED9]/40 hover:bg-card hover:shadow-sm disabled:opacity-50"
              >
                <TelegramIcon />
                <span>Telegram</span>
              </button>
            </div>

            {/* Ajratuvchi chiziq */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="bg-card px-2.5 text-faint">{t("auth.orDivider")}</span>
              </div>
            </div>

            {/* Kirish formasi */}
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5" noValidate>
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  {t("auth.regPhone")}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-ink placeholder:text-faint transition-all outline-none ${
                    errors.phone
                      ? "border-danger focus:ring-2 focus:ring-danger/20"
                      : "border-line bg-surface/60 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-2xs text-danger font-medium" role="alert">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    type={loginShowPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={t("auth.passwordPh")}
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-faint transition-all outline-none ${
                      errors.password
                        ? "border-danger focus:ring-2 focus:ring-danger/20"
                        : "border-line bg-surface/60 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setLoginShowPassword(!loginShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors p-1"
                    aria-label={loginShowPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  >
                    <EyeIcon open={loginShowPassword} />
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-2xs text-danger font-medium" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Eslab qolish & Parolni unutdingizmi */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-muted hover:text-ink">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-line text-primary focus:ring-primary/20 accent-[#FF7A1A]"
                  />
                  <span>{t("auth.rememberMe")}</span>
                </label>
                <button
                  type="button"
                  onClick={() => router.push("/kirish/parolni-tiklash")}
                  className="font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>

              {errors.form && (
                <div className="rounded-xl border border-danger/30 bg-danger/5 p-2.5 text-center text-xs font-semibold text-danger" role="alert">
                  {errors.form}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!socialLoading}
                className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-black uppercase tracking-wider text-white shadow-md transition-all duration-200 hover:bg-primary-hover hover:shadow-lg active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>{t("common.loading")}</span>
                  </span>
                ) : (
                  t("auth.loginBtn")
                )}
              </button>
            </form>

            {/* Mobil foydalanuvchilar uchun almashtirish taklifi */}
            <div className="mt-6 text-center text-xs text-muted md:hidden">
              {t("auth.dontHaveAccount")}{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="font-bold text-primary hover:underline ml-1"
              >
                {t("auth.tabRegister")}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* O'NG USTUN: RO'YXATDAN O'TISH FORMASI (Sign Up Form)            */}
        {/* ============================================================== */}
        <div
          className={`flex-col justify-center px-6 py-8 sm:px-10 sm:py-12 lg:px-14 transition-all duration-300 ${
            !isLogin
              ? "flex visible opacity-100"
              : "hidden md:flex md:invisible md:opacity-0 md:pointer-events-none"
          }`}
          aria-hidden={isLogin}
        >
          <div className="w-full max-w-sm mx-auto">

            <h2 className="font-heading text-2xl sm:text-3xl font-black text-ink tracking-tight">
              {t("auth.registerTitle")}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
              {t("auth.subtitle")}
            </p>

            {/* 1-klikli ijtimoiy tugmalar */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                disabled={!!socialLoading || loading}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface/80 px-3 text-xs font-bold text-ink transition-all hover:border-[#4285F4]/40 hover:bg-card hover:shadow-sm disabled:opacity-50"
              >
                <GoogleIcon />
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("telegram")}
                disabled={!!socialLoading || loading}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface/80 px-3 text-xs font-bold text-ink transition-all hover:border-[#229ED9]/40 hover:bg-card hover:shadow-sm disabled:opacity-50"
              >
                <TelegramIcon />
                <span>Telegram</span>
              </button>
            </div>

            {/* Ajratuvchi chiziq */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="bg-card px-2.5 text-faint">{t("auth.orDivider")}</span>
              </div>
            </div>

            {/* Ro'yxatdan o'tish formasi */}
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5" noValidate>
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  {t("auth.regName")}
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder={t("auth.regNamePh")}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-ink placeholder:text-faint transition-all outline-none ${
                    errors.fullName
                      ? "border-danger focus:ring-2 focus:ring-danger/20"
                      : "border-line bg-surface/60 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />
                {errors.fullName && (
                  <p className="mt-1 text-2xs text-danger font-medium" role="alert">
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  {t("auth.regPhone")}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-ink placeholder:text-faint transition-all outline-none ${
                    errors.phone
                      ? "border-danger focus:ring-2 focus:ring-danger/20"
                      : "border-line bg-surface/60 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-2xs text-danger font-medium" role="alert">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    type={regShowPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder={t("auth.passwordPh")}
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-faint transition-all outline-none ${
                      errors.password
                        ? "border-danger focus:ring-2 focus:ring-danger/20"
                        : "border-line bg-surface/60 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setRegShowPassword(!regShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors p-1"
                    aria-label={regShowPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  >
                    <EyeIcon open={regShowPassword} />
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-2xs text-danger font-medium" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Shartlarga rozilik chekboksi */}
              <div className="flex items-start gap-2 pt-0.5 text-2xs">
                <input
                  type="checkbox"
                  id="terms-check"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-line text-primary focus:ring-primary/20 accent-[#FF7A1A]"
                />
                <label htmlFor="terms-check" className="cursor-pointer text-muted leading-relaxed select-none">
                  <Link href="/shartlar" target="_blank" className="font-semibold text-ink underline hover:text-primary">
                    {t("auth.termsLink")}
                  </Link>{" "}
                  va{" "}
                  <Link href="/maxfiylik" target="_blank" className="font-semibold text-ink underline hover:text-primary">
                    {t("auth.privacyLink")}
                  </Link>{" "}
                  {t("auth.termsAccept")}
                </label>
              </div>
              {errors.terms && (
                <p className="text-2xs text-danger font-medium" role="alert">
                  {errors.terms}
                </p>
              )}

              {errors.form && (
                <div className="rounded-xl border border-danger/30 bg-danger/5 p-2.5 text-center text-xs font-semibold text-danger" role="alert">
                  {errors.form}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!socialLoading}
                className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-black uppercase tracking-wider text-white shadow-md transition-all duration-200 hover:bg-primary-hover hover:shadow-lg active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>{t("common.loading")}</span>
                  </span>
                ) : (
                  t("auth.registerBtn")
                )}
              </button>
            </form>

            {/* Mobil foydalanuvchilar uchun almashtirish taklifi */}
            <div className="mt-6 text-center text-xs text-muted md:hidden">
              {t("auth.alreadyHaveAccount")}{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-bold text-primary hover:underline ml-1"
              >
                {t("auth.tabLogin")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🌟 SURILUVCHI BREND PANEL (Sliding Overlay Panel - Desktop)      */}
      {/* ============================================================== */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/2 md:block z-30 transition-all duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
        style={{
          transform: isLogin ? "translateX(100%)" : "translateX(0%)",
          clipPath: isLogin
            ? "polygon(14% 0, 100% 0, 100% 100%, 0% 100%)"
            : "polygon(0 0, 100% 0, 86% 100%, 0 100%)",
        }}
      >
        <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#FF7A1A] via-[#FF6600] to-[#E65300] p-8 lg:p-12 text-white shadow-2xl pointer-events-auto">
          {/* Orqa fon nur effekti */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-black/15 blur-3xl" />

          {/* Yuqori brend logotipi (faqat panel chapda bo'lganda ko'rinadi) */}
          <div
            className={`relative z-10 flex items-center gap-3 transition-all duration-400 ${
              !isLogin ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-sm">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white font-heading font-black text-sm text-[#FF7A1A]">
                B
              </div>
            </div>
            <span className="font-heading font-black text-lg tracking-wide text-white">
              BOBO&DODA
            </span>
          </div>

          {/* Markaziy interaktiv kontent */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto px-4">
            {/* 1-HOLAT: Ro'yxatdan o'tishda (Panel chapda, Kirish taklifi) */}
            <div
              className={`flex flex-col items-center transition-all duration-500 ${
                !isLogin
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-4 scale-95 pointer-events-none absolute"
              }`}
            >
              <h3 className="font-heading text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                {t("auth.alreadyHaveAccount")}
              </h3>
              <p className="mt-3.5 max-w-xs text-xs lg:text-sm text-white/90 leading-relaxed font-medium">
                {t("auth.alreadyHaveAccountDesc")}
              </p>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="mt-8 inline-flex items-center justify-center rounded-xl border-2 border-white bg-transparent px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-all duration-200 hover:bg-white hover:text-[#FF7A1A] active:scale-95 cursor-pointer"
              >
                {t("auth.tabLogin")}
              </button>
            </div>

            {/* 2-HOLAT: Kirishda (Panel o'ngda, Ro'yxatdan o'tish taklifi) */}
            <div
              className={`flex flex-col items-center transition-all duration-500 ${
                isLogin
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 -translate-y-4 scale-95 pointer-events-none absolute"
              }`}
            >
              <h3 className="font-heading text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                {t("auth.dontHaveAccount")}
              </h3>
              <p className="mt-3.5 max-w-xs text-xs lg:text-sm text-white/90 leading-relaxed font-medium">
                {t("auth.dontHaveAccountDesc")}
              </p>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="mt-8 inline-flex items-center justify-center rounded-xl border-2 border-white bg-transparent px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-all duration-200 hover:bg-white hover:text-[#FF7A1A] active:scale-95 cursor-pointer"
              >
                {t("auth.tabRegister")}
              </button>
            </div>
          </div>

          {/* Pastki xavfsiz kafolat nishoni */}
          <div className="relative z-10 flex items-center justify-center gap-2 text-white/80 text-2xs font-semibold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Kafolatlangan xavfsiz to'lov tizimi</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KirishPage() {
  return (
    <Suspense fallback={null}>
      <KirishForm />
    </Suspense>
  );
}
