import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { BackButton } from "@/components/ui/BackButton";

export function AdminPageHeader({
  title,
  description,
  action,
  backHref,
  showBack,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  backHref?: string;
  showBack?: boolean;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        {(showBack || backHref) && (
          <div className="mb-2">
            <BackButton href={backHref} />
          </div>
        )}
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

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalRows,
  rowsPerPage,
  onRowsPerPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalRows: number;
  rowsPerPage: number;
  onRowsPerPageChange?: (limit: number) => void;
}) {
  if (totalRows <= 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted">
      <div>
        <span>Jami {totalRows} tadan {(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, totalRows)} {"ko'rsatilmoqda"}</span>
      </div>
      <div className="flex items-center gap-3">
        {onRowsPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span>Limit:</span>
            <select
              aria-label="Sahifadagi qatorlar soni"
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
              className="rounded border border-line bg-card px-2 py-1 text-ink outline-none focus:border-primary"
            >
              {[10, 25, 50, 100].map((limit) => (
                <option key={limit} value={limit}>{limit}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded border border-line bg-card px-2.5 py-1 text-ink hover:bg-card-hover disabled:opacity-50 disabled:pointer-events-none"
          >
            Ortga
          </button>
          <span className="flex items-center px-2">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded border border-line bg-card px-2.5 py-1 text-ink hover:bg-card-hover disabled:opacity-50 disabled:pointer-events-none"
          >
            Oldinga
          </button>
        </div>
      </div>
    </div>
  );
}

