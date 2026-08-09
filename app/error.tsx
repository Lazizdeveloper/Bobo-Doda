"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Logo } from "@/components/shared/Logo";
import { useT } from "@/lib/i18n";

/* App darajasidagi xatolik chegarasi (error boundary) — client komponent
   ichida kutilmagan xato yuz bersa, oq ekran o'rniga shu sahifa chiqadi. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();

  useEffect(() => {
    /* Production'da bu yerda Sentry kabi kuzatuvga yuboriladi */
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center px-4 sm:px-8">
        <Logo href="/" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger-deep">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 8v5M12 16v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-xl font-bold text-ink">
              {t("err.crashTitle")}
            </h1>
            <p className="text-sm text-muted">{t("err.crashDesc")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center justify-center rounded-btn bg-primary px-6 text-sm font-medium text-on-primary shadow-raised transition-all duration-150 hover:bg-primary-hover"
            >
              {t("common.retry")}
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-btn border border-line bg-card px-6 text-sm font-medium text-ink transition-colors duration-150 hover:bg-card-hover"
            >
              {t("common.home")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
