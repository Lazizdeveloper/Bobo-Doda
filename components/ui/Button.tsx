"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/* Sariq to'ldirilgan tugma — matn doim to'q yashil (on-primary).
   shadow-raised: ostidagi qizil chiziq, qo'lda bo'yalgan bozor lavhasi hissi. */
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary shadow-raised hover:brightness-95 disabled:bg-primary/40 disabled:text-on-primary/60 disabled:shadow-none",
  secondary:
    "bg-card border border-line text-ink hover:border-line-strong hover:bg-card-hover disabled:opacity-50",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-card disabled:opacity-50",
  danger:
    "bg-danger/10 border border-danger/50 text-danger hover:bg-danger/20 disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", loading = false, disabled, className = "", children, ...rest },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-colors duration-150 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
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
