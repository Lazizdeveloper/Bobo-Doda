"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getSession, verifyTelegram } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function TasdiqlashPage() {
  const { t } = useT();
  const router = useRouter();
  const [phase, setPhase] = useState<"connect" | "code">("connect");

  /* Sessiya guard'i: sessiyasiz kirish yo'q, tasdiqlangan bo'lsa kabinetga */
  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/kirish");
      return;
    }
    if (session.verified) {
      router.replace(session.role === "xaridor" ? "/xaridor" : "/mutaxassis");
    }
  }, [router]);
  const [redirecting, setRedirecting] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleTelegram() {
    setRedirecting(true);
    // Mock: real Telegram ochilmaydi, botga yo'naltirish taqlid qilinadi
    setTimeout(() => {
      setRedirecting(false);
      setPhase("code");
    }, 1200);
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
      const session = await verifyTelegram(code);
      router.push(session.role === "xaridor" ? "/xaridor" : "/mutaxassis");
    } catch {
      setError(t("auth.codeError"));
      setLoading(false);
    }
  }

  return (
    <Card padding="lg">
      <span className="text-2xs font-medium uppercase tracking-wide text-accent">
        {t("auth.finalStep")}
      </span>
      <h1 className="mt-1 font-heading text-xl font-bold text-ink">
        {t("auth.confirmTitle")}
      </h1>

      {phase === "connect" ? (
        <>
          <p className="mt-2 text-sm text-muted">{t("auth.confirmIntro")}</p>
          <div className="mt-8">
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
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">{t("auth.verifyHint")}</p>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              aria-label={t("auth.verifyTitle")}
              error={error}
              className="text-center text-lg tracking-[0.5em]"
              autoFocus
            />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              {t("auth.verifyBtn")}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
