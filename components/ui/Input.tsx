"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = "", ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={`h-10 w-full rounded-input border bg-card px-3 text-sm text-ink placeholder:text-faint transition-colors duration-150 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
          error ? "border-danger" : "border-line"
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p className="text-2xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-2xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
});
