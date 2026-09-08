"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authService, resetDemoData } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { LangSwitch } from "@/components/shared/LangSwitch";
import { CountryPhoneInput } from "@/components/shared/CountryPhoneInput";

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
        width="21"
        height="21"
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
      width="21"
      height="21"
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
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M21.5 4.6 18.6 19c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.5L18 7c.4-.3-.1-.5-.6-.2L7.3 13.2l-4.4-1.4c-1-.3-1-1 .2-1.4L20.2 3.3c.8-.3 1.5.2 1.3 1.3Z"
        fill="#229ED9"
      />
    </svg>
  );
}

function KirishForm() {
  const { t, lang } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* Boshlang'ich holat: /kirish sahifasida odatiy holat login */
  const [mode, setMode] = useState<Mode>(
    searchParams.get("tab") === "register" ? "register" : "login"
  );

  /* Ro'yxatdan o'tish holati */
  const [regFullName, setRegFullName] = useState("");
  const [regPhone, setRegPhone] = useState("+998");
  const [regPhoneValid, setRegPhoneValid] = useState(false);
  const [regPassword, setRegPassword] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  /* Kirish holati */
  const [loginPhone, setLoginPhone] = useState("+998");
  const [loginPhoneValid, setLoginPhoneValid] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  /* Umumiy xatolar va yuklanish */
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"telegram" | "google" | null>(null);
  const [resetFeedback, setResetFeedback] = useState(false);

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
    const nameWords = regFullName.trim().split(/\s+/).filter(Boolean);
    if (nameWords.length < 2 || nameWords.some((w) => w.length < 2)) {
      next.fullName = t("auth.errFullNameValid");
    }
    if (!regPhone || regPhone.length < 9 || !regPhoneValid) {
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
    if (!loginPhone || loginPhone.length < 9 || !loginPhoneValid) {
      next.phone = t("auth.errPhone");
    }
    if (loginPassword.length < 6) {
      next.password = t("auth.errPassword");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /* Ro'yxatdan o'tish submit: Ism, telefon, parol kiritiladi -> darhol Telegram/Google orqali tasdiqlashga */
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
      if (wanted === "mutaxassis" || wanted === "xaridor") {
        await authService.chooseRole(wanted);
      }
      router.push("/kirish/tasdiqlash");
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
      if (!session.verified) {
        router.push("/kirish/tasdiqlash");
      } else if (session.role === "xaridor") {
        router.push("/xaridor");
      } else if (session.role === "mutaxassis") {
        router.push("/mutaxassis");
      } else {
        router.push("/rol-tanlash");
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "INVALID_CREDENTIALS") setErrors({ form: t("auth.errCredentials") });
      else if (code === "ACCOUNT_BLOCKED") setErrors({ form: t("auth.errAccountBlocked") });
      else if (code === "STORAGE_FULL") setErrors({ form: t("err.storageFull") });
      else setErrors({ form: t("common.error") });
      setLoading(false);
    }
  }

  /* ⚡ 1-bosishda tezkor demo hisob bilan kirish */
  async function handleDemoLogin(phone: string, targetRole: "mutaxassis" | "xaridor") {
    setLoading(true);
    setErrors({});
    try {
      const session = await authService.login({
        phone: phone.trim(),
        password: "demo123",
      });
      if (session.role === "xaridor") {
        router.push("/xaridor");
      } else if (session.role === "mutaxassis") {
        router.push("/mutaxassis");
      } else {
        router.push("/rol-tanlash");
      }
    } catch {
      setErrors({ form: t("auth.errCredentials") });
      setLoading(false);
    }
  }

  /* 🔄 Barcha demo ma'lumotlarni qayta tiklash */
  function handleResetDemo() {
    resetDemoData();
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 3500);
  }

  const isLogin = mode === "login";

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-card">
      {/* 🌐 O'ng yuqoridagi doimiy til almashtirgich (Desktop) */}
      <div className="hidden md:block absolute top-6 right-6 lg:top-8 lg:right-8 z-40">
        <LangSwitch />
      </div>

      {/* 📱 Mobil boshqaruv paneli (faqat kichik ekranlarda ko'rinadi) */}
      <div className="border-b border-line/60 bg-surface/80 p-4 sm:p-6 md:hidden">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img
              src="/logo-icon.png"
              alt="Bobo&Doda"
              className="h-8 w-8 object-contain drop-shadow-sm"
            />
            <span className="font-heading font-black text-lg tracking-tight text-ink">
              BOBO&amp;DODA
            </span>
          </Link>
          <LangSwitch />
        </div>

        <div className="flex rounded-2xl border border-line bg-card p-1 shadow-sm">
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`h-10 flex-1 rounded-xl text-xs font-bold transition-all ${
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
            className={`h-10 flex-1 rounded-xl text-xs font-bold transition-all ${
              isLogin
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {t("auth.tabLogin")}
          </button>
        </div>
      </div>

      {/* 🖥️ Asosiy 2 ustunli Full-Screen Container */}
      <div className="grid min-h-[calc(100vh-80px)] md:min-h-screen grid-cols-1 md:grid-cols-2">
        {/* ============================================================== */}
        {/* CHAP USTUN: TIZIMGA KIRISH FORMASI (Login Form)                 */}
        {/* ============================================================== */}
        <div
          className={`flex-col justify-center px-6 py-10 sm:px-10 md:px-12 lg:px-16 xl:px-20 transition-all duration-300 ${
            isLogin
              ? "flex visible opacity-100"
              : "hidden md:flex md:invisible md:opacity-0 md:pointer-events-none"
          }`}
          aria-hidden={!isLogin}
        >
          <div className="w-full max-w-md sm:max-w-lg xl:max-w-[530px] mx-auto">
            {/* Desktop Brand Logo */}
            <Link href="/" className="mb-8 lg:mb-9 hidden md:inline-flex items-center gap-3.5 group">
              <img
                src="/logo-icon.png"
                alt="Bobo&Doda"
                className="h-11 w-11 lg:h-12 lg:w-12 object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-heading font-black text-2xl lg:text-3xl tracking-tight text-ink">
                BOBO&amp;DODA
              </span>
            </Link>

            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-ink tracking-tight">
              {t("auth.loginTitle")}
            </h1>
            <p className="mt-2.5 sm:mt-3 text-sm sm:text-base lg:text-lg text-muted leading-relaxed font-normal">
              {t("auth.loginSubtitle")}
            </p>

            {/* 1-klikli tezkor ijtimoiy kirish */}
            <div className="mt-6 sm:mt-7 grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                disabled={!!socialLoading || loading}
                className="flex h-13 sm:h-14 items-center justify-center gap-3 rounded-2xl border border-line bg-surface/80 px-4 text-sm font-bold text-ink transition-all hover:border-[#4285F4]/60 hover:bg-card hover:shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <GoogleIcon />
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("telegram")}
                disabled={!!socialLoading || loading}
                className="flex h-13 sm:h-14 items-center justify-center gap-3 rounded-2xl border border-line bg-surface/80 px-4 text-sm font-bold text-ink transition-all hover:border-[#229ED9]/60 hover:bg-card hover:shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <TelegramIcon />
                <span>Telegram</span>
              </button>
            </div>

            {/* Ajratuvchi chiziq */}
            <div className="relative my-6 sm:my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
                <span className="bg-card px-3.5 text-muted">{t("auth.orDivider")}</span>
              </div>
            </div>

            {/* Kirish formasi */}
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4.5 sm:gap-5" noValidate>
              <CountryPhoneInput
                id="login-phone"
                value={loginPhone}
                label={t("auth.regPhone")}
                error={errors.phone}
                onChange={(fullNum, isValid) => {
                  setLoginPhone(fullNum);
                  setLoginPhoneValid(isValid);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
              />

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs sm:text-sm font-bold text-ink mb-2"
                >
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={loginShowPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={t("auth.passwordPh")}
                    className={`w-full h-13 sm:h-14 rounded-2xl border px-4.5 sm:px-5 pr-12 sm:pr-14 text-sm sm:text-base text-ink placeholder:text-muted/60 transition-all outline-none ${
                      errors.password
                        ? "border-danger focus:ring-2 focus:ring-danger/20"
                        : "border-line bg-surface/60 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setLoginShowPassword(!loginShowPassword)}
                    className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors p-1.5"
                    aria-label={loginShowPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    <EyeIcon open={loginShowPassword} />
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-danger font-medium" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Eslab qolish va Parolni unutdingizmi */}
              <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-muted hover:text-ink font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-line text-primary focus:ring-primary/20 accent-[#FF7A1A]"
                  />
                  <span>{t("auth.rememberMe")}</span>
                </label>
                <button
                  type="button"
                  onClick={() => router.push("/kirish/parolni-tiklash")}
                  className="font-bold text-primary hover:text-primary-hover transition-colors"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>

              {errors.form && (
                <div className="rounded-2xl border border-danger/30 bg-danger/5 p-3.5 text-center text-xs sm:text-sm font-semibold text-danger" role="alert">
                  {errors.form}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!socialLoading}
                className="mt-2.5 flex h-14 sm:h-15 w-full items-center justify-center rounded-2xl bg-primary px-6 text-sm sm:text-base font-black uppercase tracking-wider text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
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

            {/* ⚡ Tezkor Demo Hisoblar (1-bosishda sinab ko'rish) */}
            <div className="mt-7 rounded-2xl border border-primary/25 bg-primary/[0.03] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-black">
                    ⚡
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-ink">
                    {lang === "ru" ? "Тестовые демо-аккаунты (вход в 1 клик):" : "Tezkor demo hisoblar (1-bosishda kiring):"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="text-[11px] font-semibold text-muted hover:text-primary transition-colors underline cursor-pointer"
                  title={lang === "ru" ? "Сбросить и обновить все демо-данные" : "Barcha demo ma'lumotlarni qayta tiklash"}
                >
                  {lang === "ru" ? "Сброс данных" : "Ma'lumotlarni tiklash"}
                </button>
              </div>

              {resetFeedback && (
                <div className="mb-3 rounded-xl bg-success/10 border border-success/20 p-2 text-center text-xs font-semibold text-success animate-fadeIn">
                  ✓ {lang === "ru" ? "Демо-данные успешно обновлены!" : "Demo ma'lumotlar muvaffaqiyatli tiklandi!"}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. Rustam Qosimov — Mutaxassis */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin("+998901234567", "mutaxassis")}
                  disabled={loading}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-3 text-left transition-all hover:border-primary hover:shadow-sm active:scale-[0.99] cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-sm group-hover:bg-primary group-hover:text-white transition-colors">
                      RQ
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-ink truncate">Rustam Qosimov</span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary shrink-0">
                          Mutaxassis
                        </span>
                      </div>
                      <p className="text-[11px] text-muted truncate">
                        Senior Dasturchi • 7.6M so'm yechishga tayyor • Faol shartnomalar
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                    Kirish →
                  </span>
                </button>

                {/* 2. ArtSoft Studios — Xaridor */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin("+998918765432", "xaridor")}
                  disabled={loading}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-3 text-left transition-all hover:border-accent hover:shadow-sm active:scale-[0.99] cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent font-black text-sm group-hover:bg-accent group-hover:text-white transition-colors">
                      AS
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-ink truncate">ArtSoft Studios</span>
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent shrink-0">
                          Xaridor
                        </span>
                      </div>
                      <p className="text-[11px] text-muted truncate">
                        Buyurtmachi • 4.5M so'm balans • Ish qabul qilish, Escrow to'lov
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-accent group-hover:translate-x-0.5 transition-transform">
                    Kirish →
                  </span>
                </button>

                {/* 3. Nigora Karimova — Dizayner */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin("+998912345678", "mutaxassis")}
                  disabled={loading}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-3 text-left transition-all hover:border-emerald-500 hover:shadow-sm active:scale-[0.99] cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-black text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      NK
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-ink truncate">Nigora Karimova</span>
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 shrink-0">
                          Dizayner
                        </span>
                      </div>
                      <p className="text-[11px] text-muted truncate">
                        UI/UX Dizayner • 5.0 reyting • Sharhlar, Bank yechish so'rovi
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                    Kirish →
                  </span>
                </button>
              </div>
            </div>

            {/* Mobil switch taklifi */}
            <div className="mt-8 text-center text-xs sm:text-sm text-muted md:hidden">
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
          className={`flex-col justify-center px-6 py-10 sm:px-10 md:px-12 lg:px-16 xl:px-20 transition-all duration-300 ${
            !isLogin
              ? "flex visible opacity-100"
              : "hidden md:flex md:invisible md:opacity-0 md:pointer-events-none"
          }`}
          aria-hidden={isLogin}
        >
          <div className="w-full max-w-md sm:max-w-lg xl:max-w-[530px] mx-auto">
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-ink tracking-tight">
              {t("auth.registerTitle")}
            </h1>
            <p className="mt-2.5 sm:mt-3 text-sm sm:text-base lg:text-lg text-muted leading-relaxed font-normal">
              {t("auth.subtitle")}
            </p>

            {/* Ro'yxatdan o'tish formasi — Google va Telegram tugmalari yo'q, toza ro'yxatdan o'tish */}
            <form onSubmit={handleRegisterSubmit} className="mt-8 flex flex-col gap-4.5 sm:gap-5" noValidate>
              <div>
                <label
                  htmlFor="register-name"
                  className="block text-xs sm:text-sm font-bold text-ink mb-2"
                >
                  {t("auth.regName")}
                </label>
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  value={regFullName}
                  onChange={(e) => {
                    setRegFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  placeholder={t("auth.regNamePh")}
                  className={`w-full h-13 sm:h-14 rounded-2xl border px-4.5 sm:px-5 text-sm sm:text-base text-ink placeholder:text-muted/60 transition-all outline-none ${
                    errors.fullName
                      ? "border-danger focus:ring-2 focus:ring-danger/20"
                      : "border-line bg-surface/60 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />
                {errors.fullName && (
                  <p className="mt-1.5 text-xs text-danger font-medium" role="alert">
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Markaziy Osiyo Davlatlari tanlovi bilan Telefon Input */}
              <CountryPhoneInput
                id="register-phone"
                value={regPhone}
                label={t("auth.regPhone")}
                error={errors.phone}
                onChange={(fullNum, isValid) => {
                  setRegPhone(fullNum);
                  setRegPhoneValid(isValid);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
              />

              <div>
                <label
                  htmlFor="register-password"
                  className="block text-xs sm:text-sm font-bold text-ink mb-2"
                >
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={regShowPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    placeholder={
                      lang === "uz"
                        ? "Kamida 8 belgi (harf va raqam)"
                        : lang === "ru"
                        ? "Минимум 8 символов (буквы и цифры)"
                        : "At least 8 chars (letters and digits)"
                    }
                    className={`w-full h-13 sm:h-14 rounded-2xl border px-4.5 sm:px-5 pr-12 sm:pr-14 text-sm sm:text-base text-ink placeholder:text-muted/60 transition-all outline-none ${
                      errors.password
                        ? "border-danger focus:ring-2 focus:ring-danger/20"
                        : "border-line bg-surface/60 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setRegShowPassword(!regShowPassword)}
                    className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors p-1.5 cursor-pointer"
                    aria-label={regShowPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    <EyeIcon open={regShowPassword} />
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-danger font-medium" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Shartlarga rozilik chekboksi */}
              <div className="flex items-start gap-3 pt-1 text-xs sm:text-sm">
                <input
                  type="checkbox"
                  id="terms-check"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4.5 w-4.5 rounded border-line text-primary focus:ring-primary/20 accent-[#FF7A1A]"
                />
                <label htmlFor="terms-check" className="cursor-pointer text-muted leading-relaxed select-none font-medium">
                  {lang === "en" ? (
                    <>
                      I agree to the{" "}
                      <Link href="/shartlar" target="_blank" className="font-bold text-ink underline hover:text-primary">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/maxfiylik" target="_blank" className="font-bold text-ink underline hover:text-primary">
                        Privacy Policy
                      </Link>
                    </>
                  ) : lang === "ru" ? (
                    <>
                      Я принимаю{" "}
                      <Link href="/shartlar" target="_blank" className="font-bold text-ink underline hover:text-primary">
                        Условия использования
                      </Link>{" "}
                      и{" "}
                      <Link href="/maxfiylik" target="_blank" className="font-bold text-ink underline hover:text-primary">
                        Политику конфиденциальности
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/shartlar" target="_blank" className="font-bold text-ink underline hover:text-primary">
                        {t("auth.termsLink")}
                      </Link>{" "}
                      va{" "}
                      <Link href="/maxfiylik" target="_blank" className="font-bold text-ink underline hover:text-primary">
                        {t("auth.privacyLink")}
                      </Link>{" "}
                      {t("auth.termsAccept")}
                    </>
                  )}
                </label>
              </div>
              {errors.terms && (
                <p className="text-xs text-danger font-medium" role="alert">
                  {errors.terms}
                </p>
              )}

              {errors.form && (
                <div className="rounded-2xl border border-danger/30 bg-danger/5 p-3.5 text-center text-xs sm:text-sm font-semibold text-danger" role="alert">
                  {errors.form}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!socialLoading}
                className="mt-2.5 flex h-14 sm:h-15 w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 text-sm sm:text-base font-black uppercase tracking-wider text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>{t("common.loading")}</span>
                  </span>
                ) : (
                  <>
                    <span>{t("auth.continueToVerify")}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>

              {/* Aniq eslatma: Telegram yoki Google orqali tasdiqlanadi */}
              <div className="mt-3.5 rounded-xl border border-primary/15 bg-primary/5 p-3 flex items-center justify-center gap-2 text-center text-xs text-ink/80 leading-relaxed font-medium">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary shrink-0" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span>{t("auth.regVerificationNotice")}</span>
              </div>
            </form>

            {/* Tezkor sinab ko'rish taklifi */}
            <div className="mt-5 rounded-xl border border-line bg-surface/60 p-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted">
                {lang === "ru"
                  ? "Хотите сразу протестировать платформу с готовыми данными?"
                  : "Platformani barcha imkoniyatlari bilan sinab ko'rmoqchimisiz?"}
              </span>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-bold text-primary hover:underline shrink-0"
              >
                {lang === "ru" ? "Демо-вход →" : "Demo hisoblar →"}
              </button>
            </div>

            {/* Mobil switch taklifi */}
            <div className="mt-8 text-center text-xs sm:text-sm text-muted md:hidden">
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
      {/* 🌟 FULL-SCREEN SLIDING OVERLAY PANEL (Desktop)                 */}
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
        <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#FF7A1A] via-[#FF6600] to-[#E65300] p-10 lg:p-14 xl:p-20 text-white shadow-2xl pointer-events-auto">
          {/* Ambient Glow Lights */}
          <div className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-black/20 blur-3xl" />

          {/* Yuqori 3D brend logotipi (faqat panel chapda bo'lganda ko'rinadi) */}
          <div
            className={`relative z-10 flex items-center gap-4 transition-all duration-400 ${
              !isLogin ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
            }`}
          >
            <Link href="/" className="inline-flex items-center gap-4 group">
              <img
                src="/logo-icon.png"
                alt="Bobo&Doda"
                className="h-12 w-12 lg:h-14 lg:w-14 object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-heading font-black text-2xl lg:text-3xl tracking-tight text-white drop-shadow-sm">
                BOBO&amp;DODA
              </span>
            </Link>
          </div>

          {/* Markaziy interaktiv kontent */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto px-4 lg:px-10">
            {/* 1-HOLAT: Ro'yxatdan o'tishda (Panel chapda, Kirish taklifi) */}
            <div
              className={`flex flex-col items-center transition-all duration-500 ${
                !isLogin
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-4 scale-95 pointer-events-none absolute"
              }`}
            >
              <h2 className="font-heading text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight max-w-lg">
                {t("auth.alreadyHaveAccount")}
              </h2>
              <p className="mt-4 sm:mt-5 max-w-md text-base lg:text-lg text-white/95 leading-relaxed font-medium">
                {t("auth.alreadyHaveAccountDesc")}
              </p>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="mt-8 lg:mt-10 inline-flex items-center justify-center rounded-2xl border-2 border-white bg-transparent px-10 lg:px-12 py-3.5 lg:py-4 text-xs lg:text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all duration-200 hover:bg-white hover:text-[#FF7A1A] active:scale-95 cursor-pointer"
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
              <h2 className="font-heading text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight max-w-lg">
                {t("auth.dontHaveAccount")}
              </h2>
              <p className="mt-4 sm:mt-5 max-w-md text-base lg:text-lg text-white/95 leading-relaxed font-medium">
                {t("auth.dontHaveAccountDesc")}
              </p>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="mt-8 lg:mt-10 inline-flex items-center justify-center rounded-2xl border-2 border-white bg-transparent px-10 lg:px-12 py-3.5 lg:py-4 text-xs lg:text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all duration-200 hover:bg-white hover:text-[#FF7A1A] active:scale-95 cursor-pointer"
              >
                {t("auth.tabRegister")}
              </button>
            </div>
          </div>

          {/* Pastki xavfsiz kafolat nishoni */}
          <div className="relative z-10 flex items-center justify-center gap-2.5 text-white/90 text-xs sm:text-sm font-semibold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>{t("auth.secureBadge")}</span>
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
