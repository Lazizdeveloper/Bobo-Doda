"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

export interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Universal accessible BackButton component.
 * Supports Next.js Link (if href provided) or router.back() (if href omitted).
 * WCAG 2.1 AA compliant with proper focus rings, touch targets, and hover feedback.
 */
export function BackButton({
  href,
  label,
  className = "",
  ariaLabel,
}: BackButtonProps) {
  const router = useRouter();
  const { t } = useT();
  const text = label || t("common.back");
  const accessibleLabel = ariaLabel || `${text} — ortga qaytish`;

  const inner = (
    <>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface border border-line text-muted group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-150 shadow-xs">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="transition-transform duration-150 group-hover:-translate-x-0.5"
        >
          <path
            d="M10 13L5 8L10 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-xs font-semibold text-muted group-hover:text-ink transition-colors duration-150">
        {text}
      </span>
    </>
  );

  const baseClasses = `group inline-flex items-center gap-2 rounded-btn px-2.5 py-1.5 transition-colors duration-150 hover:bg-card-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 cursor-pointer select-none min-h-[36px] ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={baseClasses}
        aria-label={accessibleLabel}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={baseClasses}
      aria-label={accessibleLabel}
    >
      {inner}
    </button>
  );
}
