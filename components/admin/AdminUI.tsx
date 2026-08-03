import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <p className="text-2xs font-bold uppercase tracking-[.18em] text-primary">Bobo&amp;Doda Control</p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold text-ink">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const colors = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };
  return (
    <Card className="relative overflow-hidden">
      <span className={`absolute inset-y-0 left-0 w-1 ${colors[tone]}`} />
      <p className="text-2xs font-semibold uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-2 font-heading text-2xl font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </Card>
  );
}

export function EmptyAdmin({ children }: { children: ReactNode }) {
  return (
    <Card className="py-12 text-center text-sm text-muted">
      {children}
    </Card>
  );
}

export function HealthRow({
  name,
  value,
  status,
}: {
  name: string;
  value: string;
  status: "healthy" | "warning" | "danger";
}) {
  const color = status === "healthy" ? "bg-success" : status === "warning" ? "bg-warning" : "bg-danger";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm font-medium text-ink">{name}</span>
      </div>
      <span className="text-xs text-muted">{value}</span>
    </div>
  );
}
