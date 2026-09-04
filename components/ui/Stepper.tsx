"use client";

import { useT } from "@/lib/i18n";

export interface StepperProps {
  steps: string[];
  current: number; // 0-indeksli
  /** Berilsa, bosqichlar bosish orqali to'g'ridan-to'g'ri o'tish uchun tugmaga aylanadi (masalan, tahrirlash rejimida — barcha ma'lumot allaqachon to'ldirilgan). */
  onStepClick?: (index: number) => void;
}

export function Stepper({ steps, current, onStepClick }: StepperProps) {
  const { t } = useT();
  return (
    <ol className="flex items-center gap-2" aria-label={t("a11y.steps")}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const label = (
          <span
            className={`hidden text-2xs sm:block ${
              active ? "font-medium text-ink" : done ? "text-muted" : "text-faint"
            }`}
          >
            {i + 1}. {step}
          </span>
        );
        const bar = (
          <span
            className={`h-1 w-full rounded-full transition-colors duration-150 ${
              done || active ? "bg-primary" : "bg-card-hover"
            } ${onStepClick ? "group-hover:bg-primary-hover" : ""}`}
            aria-hidden="true"
          />
        );
        return (
          <li key={step} className="flex flex-1 flex-col gap-2">
            {onStepClick ? (
              <button
                type="button"
                onClick={() => onStepClick(i)}
                aria-current={active ? "step" : undefined}
                className="group flex flex-col gap-2 text-left"
              >
                {bar}
                {label}
              </button>
            ) : (
              <div aria-current={active ? "step" : undefined}>
                {bar}
                {label}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
