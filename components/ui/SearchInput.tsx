"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  /** tozalash tugmasi uchun accessible yorliq */
  clearLabel?: string;
}

/* Qidiruv maydoni — chapda lupa, matn bo'lsa o'ngda tozalash (×).
   type="search" + aria-label; brauzerning o'z tugmasi yashiriladi. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      onChange,
      onClear,
      clearLabel = "Clear",
      className = "",
      placeholder,
      "aria-label": ariaLabel,
      ...rest
    },
    ref
  ) {
    return (
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="m14 14 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className={`h-10 w-full rounded-input border border-line bg-card pl-9 pr-9 text-sm text-ink placeholder:text-faint transition-colors duration-150 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg [&::-webkit-search-cancel-button]:appearance-none ${className}`}
          {...rest}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onClear?.();
            }}
            aria-label={clearLabel}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint transition-colors duration-150 hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);
