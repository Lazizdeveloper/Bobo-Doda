"use client";

export interface StepperProps {
  steps: string[];
  current: number; // 0-indeksli
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center gap-2" aria-label="Bosqichlar">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex flex-1 flex-col gap-2">
            <span
              className={`h-1 w-full rounded-full transition-colors duration-150 ${
                done || active ? "bg-primary" : "bg-card-hover"
              }`}
              aria-hidden="true"
            />
            <span
              className={`hidden text-2xs sm:block ${
                active ? "font-medium text-ink" : done ? "text-muted" : "text-faint"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {i + 1}. {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
