"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { authService } from "@/lib/api";
import { useT } from "@/lib/i18n";

type Mode = "register" | "login";

interface Errors {
  fullName?: string;
  phone?: string;
  password?: string;
  form?: string;
}

function KirishForm() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  /* Landing'dagi "Kirish" tugmasi ?tab=kirish bilan keladi — Login tabi ochiq */
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("tab") === "kirish" ? "login" : "register"
  );
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"telegram" | "google" | null>(null);

  /* Tasdiqlangan sessiya bilan qayta ro'yxatdan o'tib bo'lmaydi —
     o'z kabinetiga yo'naltiriladi (dublikat hisoblar oldini oladi) */
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

  async function handleSocialLogin(provider: "telegram" | "google") {
    if (socialLoading || loading) return;
    setSocialLoading(provider);
    setErrors({});
    try {
      const wanted = searchParams.get("role");
      const chosenRole = wanted === "mutaxassis" || wanted === "xaridor" ? wanted : undefined;
      const session = provider === "telegram"
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

  function switchMode(next: Mode) {
    if (loading || next === mode) return;
    setMode(next);
    setErrors({});
    setPassword("");
  }

  function validate(): boolean {
    const next: Errors = {};
    if (mode === "register" && fullName.trim().length < 2) {
      next.fullName = t("auth.errName");
    }
    if (!/^\+?\d{9,15}$/.test(phone.replace(/[\s-]/g, ""))) {
      next.phone = t("auth.errPhone");
    }
    if (
      (mode === "login" && password.length < 6) ||
      (mode === "register" &&
        (password.length < 8 ||
          !/[A-Za-z]/.test(password) ||
          !/\d/.test(password)))
    ) {
      next.password =
        mode === "register"
          ? t("security.passwordRules")
          : t("auth.errPassword");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      if (mode === "register") {
        await authService.register({ fullName: fullName.trim(), phone: phone.trim(), password });
        /* Landing CTA'si "?role=mutaxassis|xaridor" bilan keladi — tanlovni
           rol sahifasiga uzatamiz, aks holda parametr e'tiborsiz qolar va
           ikkala CTA bir xil ishlardi. */
        const wanted = searchParams.get("role");
        router.push(
          wanted === "mutaxassis" || wanted === "xaridor"
            ? `/rol-tanlash?role=${wanted}`
            : "/rol-tanlash"
        );
      } else {
        /* Onboarding chala qolgan bo'lsa, kabinet guard'lari kerakli
           bosqichga (profil / tasdiqlash) o'zi yo'naltiradi */
        const session = await authService.login({ phone: phone.trim(), password });
        if (session.role === "xaridor") router.push("/xaridor");
        else if (session.role === "mutaxassis") router.push("/mutaxassis");
        else router.push("/rol-tanlash");
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "PHONE_EXISTS") {
        setErrors({ phone: t("auth.errPhoneExists") });
      } else if (code === "INVALID_CREDENTIALS") {
        setErrors({ form: t("auth.errCredentials") });
      } else if (code === "WEAK_PASSWORD") {
        setErrors({ password: t("security.passwordRules") });
      } else if (code === "REGISTRATION_PAUSED") {
        setErrors({ form: t("auth.errRegistrationPaused") });
      } else if (code === "ACCOUNT_BLOCKED") {
        setErrors({ form: t("auth.errAccountBlocked") });
      } else if (code === "STORAGE_FULL") {
        setErrors({ form: t("err.storageFull") });
      } else {
        /* Har qanday boshqa xato ham KO'RSATILISHI shart — aks holda tugma
           aylanishni to'xtatadi va ekranda hech narsa o'zgarmaydi. */
        setErrors({ form: t("common.error") });
      }
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <Card padding="lg">
      <h1 className="font-heading text-2xl font-extrabold text-ink">
        {isLogin ? t("auth.loginTitle") : t("auth.registerTitle")}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {isLogin ? t("auth.loginSubtitle") : t("auth.subtitle")}
      </p>

      <div className="mt-6 flex rounded-input border border-line bg-surface p-1">
        {(
          [
            ["register", t("auth.tabRegister")],
            ["login", t("auth.tabLogin")],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            aria-pressed={mode === m}
            className={`h-9 flex-1 rounded-[8px] text-sm font-medium transition-colors duration-150 ${
              mode === m
                ? "bg-card text-ink shadow-card"
                : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 2 ta asosiy kirish usuli: Telegram va Google */}
      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => handleSocialLogin("telegram")}
          disabled={!!socialLoading || loading}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-btn border border-line bg-card px-4 text-sm font-semibold text-ink shadow-sm transition-all duration-150 hover:border-[#229ED9] hover:bg-[#229ED9]/5 disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M21.5 4.6 18.6 19c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.5L18 7c.4-.3-.1-.5-.6-.2L7.3 13.2l-4.4-1.4c-1-.3-1-1 .2-1.4L20.2 3.3c.8-.3 1.5.2 1.3 1.3Z"
              fill="#229ED9"
            />
          </svg>
          <span>
            {socialLoading === "telegram" ? t("auth.redirecting") : t("auth.loginWithTelegram")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          disabled={!!socialLoading || loading}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-btn border border-line bg-card px-4 text-sm font-semibold text-ink shadow-sm transition-all duration-150 hover:border-muted hover:bg-card-hover disabled:opacity-50"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
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
          <span>
            {socialLoading === "google" ? t("auth.googleConnecting") : t("auth.loginWithGoogle")}
          </span>
        </button>
      </div>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-2xs uppercase">
          <span className="bg-card px-2 text-faint">{t("auth.orDivider")}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4" noValidate>
        {!isLogin && (
          <Input
            label={t("auth.regName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("auth.regNamePh")}
            autoComplete="name"
            error={errors.fullName}
          />
        )}
        <Input
          label={t("auth.regPhone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("auth.regPhonePh")}
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone}
        />
        <Input
          label={t("auth.password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.passwordPh")}
          autoComplete={isLogin ? "current-password" : "new-password"}
          error={errors.password}
        />
        {errors.form && (
          <p className="text-xs text-danger" role="alert">
            {errors.form}
          </p>
        )}
        {isLogin && (
          <button
            type="button"
            onClick={() => router.push("/kirish/parolni-tiklash")}
            className="self-end text-2xs font-medium text-primary hover:underline"
          >
            {t("auth.forgotPassword")}
          </button>
        )}
        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          {isLogin ? t("auth.loginBtn") : t("auth.registerBtn")}
        </Button>
      </form>

      <p className="mt-4 text-center text-2xs text-faint">
        {isLogin ? (
          <>
            {t("auth.noAccount")}{" "}
            <button
              type="button"
              onClick={() => switchMode("register")}
              className="font-medium text-primary hover:underline"
            >
              {t("auth.tabRegister")}
            </button>
          </>
        ) : (
          <>
            {t("auth.regVerifyNote")}
            <span className="mt-1 block">
              {t("auth.haveAccount")}{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-medium text-primary hover:underline"
              >
                {t("auth.tabLogin")}
              </button>
            </span>
          </>
        )}
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-input border border-line bg-surface p-3">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-accent"
        >
          <path
            d="M8 1.5 13.5 4v3.6c0 3.3-2.3 6.1-5.5 6.9-3.2-.8-5.5-3.6-5.5-6.9V4L8 1.5Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M5.8 8l1.6 1.6 2.8-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-2xs text-muted">{t("dash.escrowNote")}</p>
      </div>
    </Card>
  );
}

export default function KirishPage() {
  /* useSearchParams statik prerender'da Suspense chegarasini talab qiladi */
  return (
    <Suspense fallback={null}>
      <KirishForm />
    </Suspense>
  );
}
