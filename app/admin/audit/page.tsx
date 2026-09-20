"use client";

/**
 * Bosqich 17 — real backend: `GET /staff/audit-logs` (offset sahifalash,
 * append-only jurnal). Eski mock `AuditEvent`/`listAuditQueue` bilan
 * ALMASHTIRILDI — real DTO erkin matn qidiruvini emas, aniq maydon
 * filtrlarini (`action`/`resourceType`) qo'llab-quvvatlaydi.
 */
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Table, type TableColumn } from "@/components/ui/Table";
import { staffListAuditLogs, getAdminCounters, type StaffAuditLogRow } from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { formatDate } from "@/lib/format";

interface PageResult {
  items: StaffAuditLogRow[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export default function AuditTrailPage() {
  const [page, setPage] = useState<PageResult | null>(null);
  const [totalAuditEvents, setTotalAuditEvents] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const debouncedAction = useDebouncedValue(action, 300);
  const debouncedResourceType = useDebouncedValue(resourceType, 300);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      staffListAuditLogs({
        page: currentPage,
        perPage: rowsPerPage,
        action: debouncedAction || undefined,
        resourceType: debouncedResourceType || undefined,
      }),
      getAdminCounters(),
    ])
      .then(([result, stats]) => {
        setPage(result);
        setTotalAuditEvents(stats.totalAuditEvents);
      })
      .catch(setLoadError);
  }, [currentPage, rowsPerPage, debouncedAction, debouncedResourceType]);

  useEffect(load, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedAction, debouncedResourceType, rowsPerPage]);

  const columns: TableColumn<StaffAuditLogRow>[] = [
    {
      key: "action",
      header: "Harakat",
      render: (e) => <p className="font-bold text-ink truncate">{e.action}</p>,
    },
    {
      key: "actorName",
      header: "Bajaruvchi",
      render: (e) => (
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-3xs font-bold">
            {e.actorName.slice(0, 1).toUpperCase()}
          </span>
          <span className="font-semibold text-xs text-ink">{e.actorName}</span>
          <span className="text-3xs text-faint">({e.actorType})</span>
        </div>
      ),
    },
    {
      key: "resource",
      header: "Ob'ekt",
      render: (e) => (
        <span className="font-mono text-xs text-primary font-semibold">
          {e.resourceType} #{e.resourceId.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Vaqt",
      render: (e) => <span className="text-xs text-muted whitespace-nowrap">{formatDate(e.createdAt)}</span>,
    },
  ];

  const header = (
    <AdminPageHeader
      title="Tizim Audit Jurnali"
      description="Barcha xodimlar va tizim tomonidan amalga oshirilgan harakatlarning o'zgarmas tarixi (append-only)."
    />
  );

  if (loadError) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState error={loadError} onRetry={load} />
      </div>
    );
  }

  if (!page) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      {header}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Jami Audit Yozuvlari" value={totalAuditEvents ?? 0} detail="Tizim faoliyati bo'yicha" />
        <MetricCard label="Filtrga mos yozuvlar" value={page.total} detail={page.items[0]?.action ?? "—"} tone="success" />
      </section>

      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="w-full sm:w-56">
            <Input aria-label="Harakat" placeholder="Harakat (masalan CONTRACT_CREATED)" value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
          <div className="w-full sm:w-56">
            <Input aria-label="Ob'ekt turi" placeholder="Ob'ekt turi (masalan CONTRACT)" value={resourceType} onChange={(e) => setResourceType(e.target.value)} />
          </div>
        </div>
      </Card>

      <div className="mt-4">
        {page.items.length ? (
          <>
            <Table
              columns={columns}
              rows={page.items}
              rowKey={(e) => e.id}
              renderMobileCard={(e) => (
                <div className="flex items-start justify-between gap-3 p-3 border border-line rounded-xl bg-card">
                  <div>
                    <p className="font-bold text-ink">{e.action}</p>
                    <p className="text-2xs text-muted">
                      {e.actorName} · {e.resourceType} #{e.resourceId.slice(0, 8)}
                    </p>
                  </div>
                  <span className="text-3xs text-muted">{formatDate(e.createdAt)}</span>
                </div>
              )}
            />
            <Pagination
              currentPage={page.page}
              totalPages={page.totalPages}
              onPageChange={setCurrentPage}
              totalRows={page.total}
              rowsPerPage={page.perPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </>
        ) : (
          <Card className="py-12 text-center text-xs text-muted">Audit yozuvlari topilmadi.</Card>
        )}
      </div>
    </div>
  );
}
