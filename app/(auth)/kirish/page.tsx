"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  /* Tasdiqlangan sessiya bilan qayta ro'yxatdan o'tib bo'lmaydi —
     o'z kabinetiga yo'naltiriladi (dublikat hisoblar oldini oladi) */
  useEffect(() => {
    const session = authService.getSession();
    if (!session || !session.verified) return;
    if (session.role === "xaridor") router.replace("/xaridor");
    if (session.role === "mutaxassis" && session.profileDone)
      router.replace("/mutaxassis");
  }, [router]);

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
        router.push("/rol-tanlash");
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

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
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
