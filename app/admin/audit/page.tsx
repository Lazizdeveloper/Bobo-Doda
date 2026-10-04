"use client";

/**
 * Bosqich 17 — real backend: `GET /staff/audit-logs` (offset sahifalash,
 * append-only jurnal). Harakatlar va ob'ekt turlari odam o'qiydigan
 * toza tilda ko'rsatiladi va saralanadi.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Table, type TableColumn } from "@/components/ui/Table";
import { staffListAuditLogs, getAdminCounters, type StaffAuditLogRow } from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import {
  AUDIT_RESOURCE_OPTIONS,
  AUDIT_ACTIONS_BY_RESOURCE,
  ALL_AUDIT_ACTIONS,
  formatAuditAction,
  formatAuditResource,
  formatAuditActorType,
  formatAuditActorName,
} from "@/lib/audit-format";

interface PageResult {
  items: StaffAuditLogRow[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export default function AuditTrailPage() {
  const { lang, t } = useT();
  const [page, setPage] = useState<PageResult | null>(null);
  const [totalAuditEvents, setTotalAuditEvents] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const debouncedAction = useDebouncedValue(action, 300);
  const debouncedResourceType = useDebouncedValue(resourceType, 300);

  const availableActions = useMemo(() => {
    if (resourceType && AUDIT_ACTIONS_BY_RESOURCE[resourceType]) {
      return AUDIT_ACTIONS_BY_RESOURCE[resourceType];
    }
    return ALL_AUDIT_ACTIONS;
  }, [resourceType]);

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
      render: (e) => (
        <div className="min-w-0">
          <p className="font-bold text-ink truncate">{formatAuditAction(e.action, lang)}</p>
          <span className="text-3xs text-muted font-mono">{e.action}</span>
        </div>
      ),
    },
    {
      key: "actorName",
      header: "Bajaruvchi",
      render: (e) => (
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-3xs font-bold">
            {formatAuditActorName(e.actorName, lang).slice(0, 1).toUpperCase()}
          </span>
          <span className="font-semibold text-xs text-ink">{formatAuditActorName(e.actorName, lang)}</span>
          {e.actorType && (
            <span className="text-3xs text-faint">({formatAuditActorType(e.actorType, lang)})</span>
          )}
        </div>
      ),
    },
    {
      key: "resource",
      header: "Ob'ekt",
      render: (e) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-primary">
            {formatAuditResource(e.resourceType, lang)}
          </span>
          {e.resourceId && (
            <span className="font-mono text-3xs text-muted">
              #{e.resourceId.slice(0, 8)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Vaqt",
      render: (e) => <span className="text-xs text-muted whitespace-nowrap">{formatDate(e.createdAt, lang)}</span>,
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

  if (!page) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingState message="Audit jurnali yuklanmoqda..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Jami Audit Yozuvlari" value={totalAuditEvents ?? 0} detail="Tizim faoliyati bo'yicha" />
        <MetricCard
          label="Filtrga mos yozuvlar"
          value={page.total}
          detail={page.items[0]?.action ? formatAuditAction(page.items[0].action, lang) : "—"}
          tone="success"
        />
      </section>

      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="w-full sm:w-64">
            <Select
              aria-label="Ob'ekt turi"
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value);
                setAction("");
              }}
              options={[
                { value: "", label: t("audit.filterAllResources") },
                ...AUDIT_RESOURCE_OPTIONS.map((r) => ({
                  value: r,
                  label: formatAuditResource(r, lang),
                })),
              ]}
            />
          </div>
          <div className="w-full sm:w-72">
            <Select
              aria-label="Harakat"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              options={[
                { value: "", label: t("audit.filterAllActions") },
                ...availableActions.map((a) => ({
                  value: a,
                  label: formatAuditAction(a, lang),
                })),
              ]}
            />
          </div>
          {(action || resourceType) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAction("");
                setResourceType("");
              }}
              className="text-xs shrink-0"
            >
              {t("audit.filterClear")}
            </Button>
          )}
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
                    <p className="font-bold text-ink">{formatAuditAction(e.action, lang)}</p>
                    <p className="text-2xs text-muted mt-0.5">
                      <span className="font-semibold text-ink/80">{formatAuditActorName(e.actorName, lang)}</span>{" "}
                      {e.actorType && <span className="text-faint">({formatAuditActorType(e.actorType, lang)})</span>} ·{" "}
                      {formatAuditResource(e.resourceType, lang)}{" "}
                      {e.resourceId && (
                        <span className="font-mono text-primary font-medium">#{e.resourceId.slice(0, 8)}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-3xs text-muted shrink-0">{formatDate(e.createdAt, lang)}</span>
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
