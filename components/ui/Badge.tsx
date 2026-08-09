import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

/* Har bir tonda o'z rangidagi ingichka halqa — status yorliqlari
   oq fonda aniq "kesilgan" bo'lib ko'rinsin. Yashil oilasidagi tonlar
   (primary/accent/info/success) bir ro'yxatda uchrashmasligi uchun
   StatusBadge'da ohang taqsimoti ataylab ajratilgan. */
const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-card-hover text-muted ring-1 ring-line",
  primary: "bg-primary/10 text-primary-deep ring-1 ring-primary/30",
  accent: "bg-accent/10 text-accent-deep ring-1 ring-accent/30",
  info: "bg-info/10 text-info-deep ring-1 ring-info/30",
  success: "bg-success/10 text-success-deep ring-1 ring-success/30",
  warning: "bg-warning/10 text-warning-deep ring-1 ring-warning/30",
  danger: "bg-danger/10 text-danger-deep ring-1 ring-danger/30",
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
