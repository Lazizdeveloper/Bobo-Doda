"use client";

/**
 * NAMUNA SAHIFA — server tomonida sahifalanadigan admin navbati.
 *
 * Boshqa admin ro'yxatlari ham shu naqshga o'tkaziladi. Farqi:
 *  ESKI: `getAdminData()` HAMMA qatorni oladi → `useMemo` da filtrlanadi →
 *        `slice` bilan sahifalanadi. Bu `localStorage` da ishlaydi, real
 *        bazada esa 100 000 qatorni brauzerga yuklashni anglatadi.
 *  YANGI: `listAuditQueue({page, perPage, search, status})` bitta SAHIFANI
 *        qaytaradi (`AdminPage<T>`), filtrlash qatlamda bajariladi.
 *        Backend ulanganda faqat shu funksiya HTTP'ga almashadi.
 *
 * Ikki muhim tafsilot:
 *  1. Qidiruv `useDebouncedValue` bilan — aks holda har harfda so'rov ketadi.
 *  2. KPI raqamlari `getAdminCounters()` dan — sahifa endi hamma qatorni
 *     ko'rmaydi, shuning uchun jami sonni o'zi sanay olmaydi.
 */

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Table, type TableColumn } from "@/components/ui/Table";
import {
  listAuditQueue,
  getAdminCounters,
  type AdminCounters,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { formatDate } from "@/lib/format";
import type { AuditEvent, AdminPage } from "@/lib/admin-types";

export default function AuditTrailPage() {
  const [page, setPage] = useState<AdminPage<AuditEvent> | null>(null);
  const [counters, setCounters] = useState<AdminCounters | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [search, setSearch] = useState("");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  /* Har harfda so'rov yubormaslik uchun */
  const debouncedSearch = useDebouncedValue(search, 300);

  /* Navbat chaqiruvi ASYNC — backend'da bu HTTP so'rov bo'ladi va shu
     sababli imzo bugundan promise. Ikki so'rov parallel ketadi: ro'yxat
     va agregatlar bir-birini kutmaydi. */
  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      listAuditQueue({
        page: currentPage,
        perPage: rowsPerPage,
        search: debouncedSearch,
        status: adminFilter,
      }),
      getAdminCounters(),
    ])
      .then(([result, stats]) => {
        setPage(result);
        setCounters(stats);
      })
      /* Xato bo'sh ro'yxatga aylantirilmaydi */
      .catch(setLoadError);
  }, [currentPage, rowsPerPage, debouncedSearch, adminFilter]);

  useEffect(load, [load]);

  /* Filtr o'zgarganda birinchi sahifaga qaytamiz — aks holda 7-sahifada
     turib filtr torayganda bo'sh ekran ko'rinardi. */
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, adminFilter, rowsPerPage]);

  const columns: TableColumn<AuditEvent>[] = [
    {
      key: "action",
      header: "Harakat & Tavsif",
      render: (e) => (
        <div className="min-w-0">
          <p className="font-bold text-ink truncate">{e.action}</p>
          {e.details && <p className="text-2xs text-muted mt-0.5">{e.details}</p>}
        </div>
      ),
    },
    {
      key: "adminName",
      header: "Operator / Admin",
      render: (e) => (
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-3xs font-bold">
            {e.adminName.slice(0, 1).toUpperCase()}
          </span>
          <span className="font-semibold text-xs text-ink">{e.adminName}</span>
        </div>
      ),
    },
    {
      key: "target",
      header: "Ob'ekt ID",
      render: (e) => <span className="font-mono text-xs text-primary font-semibold">#{e.target}</span>,
    },
    {
      key: "createdAt",
      header: "Vaqt (Timestamp)",
      render: (e) => <span className="text-xs text-muted whitespace-nowrap">{formatDate(e.createdAt)}</span>,
    },
  ];

  const header = (
    <AdminPageHeader
      title="Tizim Audit Jurnali & Nazorat Izlari"
      description="Barcha administratorlar, moderatorlar va tizim botlari tomonidan amalga oshirilgan barcha harakatlarning to‘liq o‘zgarmas tarixi."
    />
  );

  /* XATO HOLATI YUKLANISH HOLATIDAN OLDIN */
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

      {/* KPI — agregat chaqiruvidan (sahifa endi hamma qatorni ko'rmaydi) */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Jami Audit Yozuvlari"
          value={counters?.totalAuditEvents ?? 0}
          detail="Tizim faoliyati bo'yicha"
        />
        <MetricCard
          label="Faol Operatorlar"
          value={counters?.auditAdmins.length ?? 0}
          detail="Harakat bajargan adminlar"
          tone="primary"
        />
        <MetricCard
          label="Filtrga mos yozuvlar"
          value={page.total}
          detail={page.items[0] ? page.items[0].action : "—"}
          tone="success"
        />
      </section>

      {/* Filter and Search */}
      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <select
              aria-label="Operator bo'yicha filtr"
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha operatorlar</option>
              {(counters?.auditAdmins ?? []).map((adm) => (
                <option key={adm} value={adm}>
                  {adm}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-72">
            <Input
              aria-label="Qidirish"
              placeholder="Amaliyot, ob'ekt yoki izoh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
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
                    <p className="text-2xs text-muted">Operator: {e.adminName} · Ob&apos;ekt: #{e.target}</p>
                    {e.details && <p className="text-xs text-ink/80 mt-1">{e.details}</p>}
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
          <Card className="py-12 text-center text-xs text-muted">
            Audit yozuvlari topilmadi.
          </Card>
        )}
      </div>
    </div>
  );
}
