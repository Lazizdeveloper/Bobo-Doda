"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";
/** Semantik amal ohangi — asosan admin panelidagi moderatsiya tugmalari uchun
    (tasdiqlash / ogohlantirish / rad etish). `variant` ustidan yozadi. */
type Tone = "primary" | "success" | "warning" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Berilsa, `variant` ning fon/matn/chegarasini semantik ohang bilan almashtiradi */
  tone?: Tone;
  loading?: boolean;
}

/* Yashil to'ldirilgan tugma — matn doim oq (on-primary).
   shadow-raised: ostidagi to'q yashil chiziq, qo'lda bo'yalgan bozor lavhasi hissi. */
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary shadow-raised hover:bg-primary-hover disabled:bg-card-hover disabled:text-faint disabled:shadow-none",
  secondary:
    "bg-card border border-field text-ink shadow-card hover:border-primary hover:bg-card-hover disabled:border-line disabled:text-faint disabled:shadow-none",
  outline:
    "bg-card border border-line text-ink hover:border-primary hover:bg-card-hover disabled:border-line disabled:text-faint",
  ghost:
    "bg-transparent text-muted hover:text-ink hover:bg-card-hover disabled:text-faint",
  danger:
    "bg-danger/10 border border-danger/40 text-danger-deep hover:bg-danger/20 hover:border-danger disabled:opacity-50",
};

/* Ohanglar `danger` variantining naqshini takrorlaydi: o'z rangining ochiq
   to'ldirishi (`bg-X/10`) + `-deep` matn — CLAUDE.md qoidasi bo'yicha AA dan
   o'tadi. `shadow-none` kerak, chunki tone default `primary` variantining
   `shadow-raised` ini ham bosishi kerak. */
const toneClasses: Record<Tone, string> = {
  primary:
    "bg-primary/10 border border-primary/40 text-primary-deep shadow-none hover:bg-primary/20 hover:border-primary",
  success:
    "bg-success/10 border border-success/40 text-success-deep shadow-none hover:bg-success/20 hover:border-success",
  warning:
    "bg-warning/10 border border-warning/40 text-warning-deep shadow-none hover:bg-warning/20 hover:border-warning",
  danger:
    "bg-danger/10 border border-danger/40 text-danger-deep shadow-none hover:bg-danger/20 hover:border-danger",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", tone, loading = false, disabled, className = "", children, ...rest },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${tone ? toneClasses[tone] : ""} ${sizeClasses[size]} ${className}`}
        {...rest}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-25"
            />
            <path
              d="M22 12a10 10 0 0 0-10-10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
