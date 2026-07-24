import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

/* Har bir tonda o'z rangidagi ingichka halqa — status yorliqlari
   to'q yashil fonda aniq "kesilgan" bo'lib ko'rinsin. */
const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-card-hover text-muted ring-1 ring-line",
  primary: "bg-primary/15 text-primary ring-1 ring-primary/40",
  accent: "bg-accent/15 text-accent ring-1 ring-accent/40",
  success: "bg-success/15 text-success ring-1 ring-success/40",
  warning: "bg-warning/15 text-warning ring-1 ring-warning/40",
  danger: "bg-danger/15 text-danger ring-1 ring-danger/40",
};

export function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wide ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
