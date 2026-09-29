"use client";

import { useT } from "@/lib/i18n";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message, className = "" }: LoadingStateProps) {
  const { t } = useT();
  const displayMessage = message ?? t("common.loading");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-card/60 px-6 py-12 text-center ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <svg
          className="h-6 w-6 animate-spin text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </span>
      <p className="max-w-sm text-sm font-medium text-muted">{displayMessage}</p>
      <span className="sr-only">{displayMessage}</span>
    </div>
  );
}
