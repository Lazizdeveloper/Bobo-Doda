"use client";

import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n";

export interface ErrorStateProps {
  /** Yuklashda tushgan xato — `ApiError` bo'lsa kod bo'yicha matn tanlanadi */
  error?: unknown;
  /** Qayta urinish; berilmasa tugma ko'rsatilmaydi */
  onRetry?: () => void;
}

/** Ma'lumot yuklanmaganda ko'rsatiladigan holat.
 *
 * Muhim: yuklash xatosi BO'SH RO'YXAT emas. Ruxsat yo'qligi, sessiya tugashi va
 * tarmoq uzilishi alohida ko'rsatiladi — aks holda foydalanuvchi ma'lumot
 * o'chib ketgan deb o'ylaydi (backend'da bu ayniqsa xavfli). */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { t } = useT();

  const code = error instanceof ApiError ? error.code : "UNKNOWN";
  const retryable = error instanceof ApiError ? error.retryable : true;

  const messageKey =
    code === "UNAUTHENTICATED"
      ? "err.unauthenticated"
      : code === "FORBIDDEN"
        ? "err.forbidden"
        : code === "NOT_FOUND"
          ? "err.notFound"
          : code === "NETWORK"
            ? "err.network"
            : code === "RATE_LIMITED"
              ? "err.rateLimited"
              : "err.loadFailed";

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card border border-dashed border-danger/40 bg-danger/5 px-6 py-12 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger-deep">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 6v4.5M10 13.4v.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <p className="max-w-sm text-sm font-medium text-ink">{t(messageKey)}</p>
      {onRetry && retryable && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          {t("err.retry")}
        </Button>
      )}
    </div>
  );
}
