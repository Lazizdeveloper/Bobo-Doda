"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    <Card padding="lg">
      <span className="text-2xs font-medium uppercase tracking-wide text-primary">
        {t("auth.finalStep")}
      </span>
      <h1 className="mt-1 font-heading text-xl font-bold text-ink">
        {t("auth.confirmTitle")}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {t("auth.verifyMethodDesc")}
      </p>

      {/* 2 ta tasdiqlash usuli tanlovi */}
      <div className="mt-5 flex rounded-input border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => { setMethod("telegram"); setError(""); }}
          aria-pressed={method === "telegram"}
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] text-xs font-semibold transition-colors duration-150 ${
            method === "telegram"
              ? "bg-card text-ink shadow-card"
              : "text-muted hover:text-ink"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] text-xs font-semibold transition-colors duration-150 ${
            method === "google"
              ? "bg-card text-ink shadow-card"
              : "text-muted hover:text-ink"
          }`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
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
        <p className="mt-4 rounded-input border border-danger/30 bg-danger/10 p-3 text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      {method === "telegram" ? (
        <div className="mt-6">
          {phase === "connect" ? (
            <>
              <p className="text-sm text-muted">{t("auth.confirmIntro")}</p>
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  size="lg"
                  loading={redirecting}
                  onClick={handleTelegram}
                  className="w-full"
                >
                  {!redirecting && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
                  className="text-xs font-semibold text-primary hover:underline py-1"
                >
                  {t("auth.directTelegramVerify")} ⚡
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">{t("auth.verifyHint")}</p>
              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  aria-label={t("auth.verifyTitle")}
                  className="text-center text-lg tracking-[0.5em]"
                  autoFocus
                />
                <Button type="submit" size="lg" loading={loading} className="w-full">
                  {t("auth.verifyBtn")}
                </Button>

                <button
                  type="button"
                  onClick={() => setPhase("connect")}
                  className="text-xs text-muted hover:text-ink hover:underline"
                >
                  ← {t("auth.backToLogin")}
                </button>
              </form>
            </>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-sm text-muted">{t("auth.googleVerifyIntro")}</p>
          <div className="mt-6">
            <Button
              size="lg"
              loading={googleLoading}
              onClick={handleGoogleVerify}
              className="w-full bg-card !text-ink border border-line shadow-sm hover:border-muted hover:bg-card-hover"
            >
              {!googleLoading && (
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
              )}
              {googleLoading ? t("auth.googleConnecting") : t("auth.googleBtn")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
