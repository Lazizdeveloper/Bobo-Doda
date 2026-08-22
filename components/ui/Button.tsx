"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";
type Tone = "primary" | "secondary" | "danger" | "warning" | "success";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
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

const toneClasses: Record<Tone, string> = {
  primary: "hover:border-primary",
  secondary: "",
  danger: "text-danger border-danger/40 hover:bg-danger/10 hover:border-danger",
  warning: "text-amber-700 border-amber-400 hover:bg-amber-50 hover:border-amber-500",
  success: "text-emerald-700 border-emerald-400 hover:bg-emerald-50 hover:border-emerald-500",
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
    const toneClass = tone ? toneClasses[tone] : "";
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-colors duration-150 disabled:cursor-not-allowed ${variantClasses[variant]} ${toneClass} ${sizeClasses[size]} ${className}`}
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
