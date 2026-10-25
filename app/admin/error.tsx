"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Admin portalining global xatolik va tarmoq uzilishi chegarasi (Error Boundary).
 * Tarmoq uzilganda (offline), server javob bermaganda yoki renderda
 * kutilmagan xatolik yuz berganda oq ekran o'rniga tushunarli xabar,
 * aloqa holati va "Qayta urinish" tugmasini ko'rsatadi.
 */
export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    // Production monitoring / audit uchun konsolga xatolik
    console.error("[Admin Error Boundary Caught]", error);
  }, [error]);

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const isNetworkError =
    isOffline ||
    /network|fetch|offline|load failed|connection|timeout|failed to fetch/i.test(
      error?.message || ""
    );

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-16 items-center border-b border-line bg-surface px-6">
        <Logo href="/admin" />
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-card border border-line bg-card p-6 sm:p-8 text-center shadow-lg [overflow-wrap:anywhere] [word-break:break-word]">
          {/* Status Icon */}
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              isNetworkError ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger"
            }`}
          >
            {isNetworkError ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M8.53 16.11a6 6 0 016.95 0M12 20h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 8v5M12 16v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </span>

          {/* Error Details */}
          <div className="space-y-2">
            <h1 className="font-heading text-xl font-bold text-ink sm:text-2xl">
              {isNetworkError
                ? "Tarmoq bilan aloqa uzildi"
                : "Kutilmagan tizim xatoligi yuz berdi"}
            </h1>
            <p className="text-sm text-muted">
              {isNetworkError
                ? "Server bilan aloqa yo'q yoki internetga ulanishda uzilish yuz berdi. Internet aloqangizni tekshirib, qayta urinib ko'ring."
                : "Admin markazida kutilmagan xatolik yuz berdi. Tizim xavfsizlik maqsadida ma'lumotlarni himoya qildi."}
            </p>
          </div>

          {/* Technical Info (Collapsible) */}
          {error?.message && (
            <div className="w-full rounded-xl border border-line bg-surface/80 p-3 text-left">
              <p className="text-3xs uppercase font-bold text-muted mb-1">Xatolik tafsiloti:</p>
              <p className="font-mono text-xs text-danger line-clamp-3">
                {error.message}
              </p>
              {error.digest && (
                <p className="mt-1 font-mono text-3xs text-faint">Digest: {error.digest}</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row w-full items-center justify-center gap-3">
            <Button
              type="button"
              tone="primary"
              onClick={reset}
              className="w-full sm:w-auto min-w-[140px] justify-center"
            >
              Qayta urinish
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto min-w-[140px] justify-center"
            >
              Sahifani yangilash
            </Button>
            <Link
              href="/admin"
              className="inline-flex h-10 w-full sm:w-auto items-center justify-center rounded-btn border border-line bg-surface px-4 text-xs font-semibold text-ink hover:bg-card-hover transition-colors"
            >
              Boshqaruv paneli
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
