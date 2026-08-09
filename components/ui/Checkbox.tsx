"use client";

import { useId, type InputHTMLAttributes } from "react";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({ label, id, className = "", ...rest }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label
      htmlFor={inputId}
      className={`flex cursor-pointer select-none items-center gap-2 text-sm text-ink ${className}`}
    >
      <span className="relative inline-flex h-4 w-4 shrink-0">
        <input
          type="checkbox"
          id={inputId}
          className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-field bg-card transition-colors duration-150 checked:border-primary checked:bg-primary"
          {...rest}
        />
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-4 w-4 opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
        >
          <path
            d="M4 8.5 7 11.5 12 5"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {label}
    </label>
  );
}
