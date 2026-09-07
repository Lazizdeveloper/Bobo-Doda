"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authService } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function TasdiqlashPage() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [method, setMethod] = useState<"telegram" | "google">("telegram");
  const [phase, setPhase] = useState<"connect" | "code">("connect");
  const [redirecting, setRedirecting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* Sessiya guard'i: sessiyasiz kirish yo'q, tasdiqlangan bo'lsa kabinetga */
  useEffect(() => {
    const session = authService.getSession();
    if (!session) {
      if (pathname !== "/kirish") router.replace("/kirish");
      return;
    }
    if (session.verified) {
      const dest = session.role === "xaridor" ? "/xaridor" : "/mutaxassis";
      if (pathname !== dest) router.replace(dest);
    }
  }, [router, pathname]);

  function handleTelegram() {
    setRedirecting(true);
    setTimeout(() => {
      setRedirecting(false);
      setPhase("code");
    }, 1000);
  }

  async function handleDirectTelegramVerify() {
    setLoading(true);
    setError("");
    try {
      const session = await authService.verifyTelegram();
      router.push(!session.role ? "/rol-tanlash" : session.role === "xaridor" ? "/xaridor" : "/mutaxassis");
    } catch {
      setError(t("common.error"));
      setLoading(false);
    }
  }

  async function handleGoogleVerify() {
    setGoogleLoading(true);
    setError("");
    try {
      const session = await authService.verifyGoogle();
      router.push(!session.role ? "/rol-tanlash" : session.role === "xaridor" ? "/xaridor" : "/mutaxassis");
    } catch {
      setError(t("common.error"));
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError(t("auth.codeError"));
      return;
    }
    setLoading(true);
    try {
      const session = await authService.verifyTelegram(code);
      router.push(!session.role ? "/rol-tanlash" : session.role === "xaridor" ? "/xaridor" : "/mutaxassis");
    } catch {
      setError(t("auth.codeError"));
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl sm:rounded-[32px] border border-line/80 bg-card p-7 sm:p-12 lg:p-14 shadow-2xl shadow-black/5 transition-all duration-300">
      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        {t("auth.finalStep")}
      </span>
      <h1 className="mt-2.5 font-heading text-2xl sm:text-3xl lg:text-4xl xl:text-[40px] font-black text-ink tracking-tight leading-tight">
        {t("auth.confirmTitle")}
      </h1>
      <p className="mt-3 text-sm sm:text-base lg:text-lg text-muted leading-relaxed font-normal">
        {t("auth.verifyMethodDesc")}
      </p>

      {/* 2 ta tasdiqlash usuli tanlovi */}
      <div className="mt-7 sm:mt-8 flex rounded-2xl border border-line bg-surface p-1.5 sm:p-2 gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => { setMethod("telegram"); setError(""); }}
          aria-pressed={method === "telegram"}
          className={`flex h-12 sm:h-14 lg:h-15 flex-1 items-center justify-center gap-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm lg:text-base font-bold transition-all duration-200 ${
            method === "telegram"
              ? "bg-card text-ink shadow-md scale-[1.01]"
              : "text-muted hover:text-ink hover:bg-card/40"
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
            <path
              d="M21.5 4.6 18.6 19c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.5L18 7c.4-.3-.1-.5-.6-.2L7.3 13.2l-4.4-1.4c-1-.3-1-1 .2-1.4L20.2 3.3c.8-.3 1.5.2 1.3 1.3Z"
              fill="#229ED9"
            />
          </svg>
          <span>{t("auth.tabTelegram")}</span>
        </button>

        <button
          type="button"
          onClick={() => { setMethod("google"); setError(""); }}
          aria-pressed={method === "google"}
          className={`flex h-12 sm:h-14 lg:h-15 flex-1 items-center justify-center gap-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm lg:text-base font-bold transition-all duration-200 ${
            method === "google"
              ? "bg-card text-ink shadow-md scale-[1.01]"
              : "text-muted hover:text-ink hover:bg-card/40"
          }`}
        >
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
          <span>{t("auth.tabGoogle")}</span>
        </button>
      </div>

      {error && (
        <p className="mt-5 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {method === "telegram" ? (
        <div className="mt-8">
          {phase === "connect" ? (
            <>
              <p className="text-sm sm:text-base lg:text-lg text-muted leading-relaxed">
                {t("auth.confirmIntro")}
              </p>
              <div className="mt-8 flex flex-col gap-4">
                <Button
                  size="lg"
                  loading={redirecting}
                  onClick={handleTelegram}
                  className="w-full !h-14 sm:!h-16 !text-base sm:!text-lg font-bold !rounded-2xl shadow-lg shadow-primary/20 gap-3"
                >
                  {!redirecting && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M21.5 4.6 18.6 19c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.5L18 7c.4-.3-.1-.5-.6-.2L7.3 13.2l-4.4-1.4c-1-.3-1-1 .2-1.4L20.2 3.3c.8-.3 1.5.2 1.3 1.3Z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                  {redirecting ? t("auth.redirecting") : t("auth.telegramBtn")}
                </Button>

                <button
                  type="button"
                  onClick={handleDirectTelegramVerify}
                  disabled={loading}
                  className="text-xs sm:text-sm font-semibold text-primary hover:underline py-2"
                >
                  {t("auth.directTelegramVerify")} ⚡
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm sm:text-base lg:text-lg text-muted leading-relaxed">
                {t("auth.verifyHint")}
              </p>
              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  aria-label={t("auth.verifyTitle")}
                  className="!h-16 sm:!h-20 text-center text-2xl sm:text-3xl font-black tracking-[0.5em] !rounded-2xl"
                  autoFocus
                />
                <Button type="submit" size="lg" loading={loading} className="w-full !h-14 sm:!h-16 !text-base sm:!text-lg font-bold !rounded-2xl shadow-lg shadow-primary/20">
                  {t("auth.verifyBtn")}
                </Button>

                <button
                  type="button"
                  onClick={() => setPhase("connect")}
                  className="text-xs sm:text-sm text-muted hover:text-ink hover:underline py-1 text-center"
                >
                  ← {t("auth.backToLogin")}
                </button>
              </form>
            </>
          )}
        </div>
      ) : (
        <div className="mt-8">
          <p className="text-sm sm:text-base lg:text-lg text-muted leading-relaxed">
            {t("auth.googleVerifyIntro")}
          </p>
          <div className="mt-8">
            <Button
              variant="outline"
              size="lg"
              loading={googleLoading}
              onClick={handleGoogleVerify}
              className="w-full !h-14 sm:!h-16 !text-base sm:!text-lg font-bold !rounded-2xl bg-card !text-ink border-2 border-line/80 shadow-md hover:border-primary/60 hover:bg-card-hover gap-3"
            >
              {!googleLoading && (
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
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
              )}
              {googleLoading ? t("auth.googleConnecting") : t("auth.googleBtn")}
            </Button>
          </div>
        </div>
      )}

      {/* Escrow & Security Trust Footer */}
      <div className="mt-10 pt-6 border-t border-line/60 flex items-center justify-center gap-2.5 text-xs sm:text-sm text-muted">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <span>{t("auth.trustBadgeEscrow")}</span>
      </div>
    </div>
  );
}
