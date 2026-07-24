"use client";

import { useId } from "react";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupProps {
  label?: string;
  name?: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  error,
}: RadioGroupProps) {
  const autoName = useId();
  const groupName = name ?? autoName;
  return (
    <fieldset className="flex flex-col gap-1.5">
      {label && (
        <legend className="mb-1.5 text-xs font-medium text-muted">{label}</legend>
      )}
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-input border p-3 transition-colors duration-150 ${
              value === opt.value
                ? "border-primary bg-primary/5"
                : "border-line bg-card hover:bg-card-hover"
            }`}
          >
            <input
              type="radio"
              name={groupName}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border border-line bg-card transition-colors duration-150 checked:border-[5px] checked:border-primary"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-ink">{opt.label}</span>
              {opt.description && (
                <span className="text-xs text-muted">{opt.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p className="text-2xs text-danger" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
