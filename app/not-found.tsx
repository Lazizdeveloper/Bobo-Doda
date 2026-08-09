"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { useT } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useT();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center px-4 sm:px-8">
        <Logo href="/" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
          <span className="font-heading text-6xl font-extrabold text-primary">
            404
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-xl font-bold text-ink">
              {t("err.notFoundTitle")}
            </h1>
            <p className="text-sm text-muted">{t("err.notFoundDesc")}</p>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-btn bg-primary px-6 text-sm font-medium text-on-primary shadow-raised transition-all duration-150 hover:bg-primary-hover"
          >
            {t("common.home")}
          </Link>
        </div>
      </main>
    </div>
  );
}
