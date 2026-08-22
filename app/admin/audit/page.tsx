"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getAuditEvents } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";
import type { AuditEvent } from "@/lib/admin-types";

export default function AuditTrailPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  function load() {
    setEvents(getAuditEvents());
  }

  useEffect(() => {
    load();
  }, []);

  const adminList = useMemo(() => {
    const list = new Set<string>();
    events.forEach((e) => list.add(e.adminName));
    return Array.from(list);
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (adminFilter !== "all" && e.adminName !== adminFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.action.toLowerCase().includes(q) ||
          e.adminName.toLowerCase().includes(q) ||
          e.target.toLowerCase().includes(q) ||
          (e.details && e.details.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [events, adminFilter, search]);

  const totalPages = Math.ceil(filteredEvents.length / rowsPerPage);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredEvents.slice(start, start + rowsPerPage);
  }, [filteredEvents, currentPage, rowsPerPage]);

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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tizim Audit Jurnali & Nazorat Izlari"
        description="Barcha administratorlar, moderatorlar va tizim botlari tomonidan amalga oshirilgan barcha harakatlarning to‘liq o‘zgarmas tarixi."
      />

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Jami Audit Yozuvlari" value={events.length} detail="Tizim faoliyati bo'yicha" />
        <MetricCard label="Faol Operatorlar" value={adminList.length} detail="Harakat bajargan adminlar" tone="primary" />
        <MetricCard label="Oxirgi Harakat" value="Hozirgina" detail={events[0] ? events[0].action : "—"} tone="success" />
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
              {adminList.map((adm) => (
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
        {filteredEvents.length ? (
          <>
            <Table
              columns={columns}
              rows={paginatedEvents}
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
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalRows={filteredEvents.length}
              rowsPerPage={rowsPerPage}
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
