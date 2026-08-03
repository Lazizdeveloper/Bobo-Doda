"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, EmptyAdmin } from "@/components/admin/AdminUI";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getAuditEvents } from "@/lib/api/admin";
import type { AuditEvent } from "@/lib/admin-types";
import { formatDate, formatTime } from "@/lib/format";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  useEffect(() => setEvents(getAuditEvents()), []);
  const columns: TableColumn<AuditEvent>[] = [
    { key: "admin", header: "Admin", render: (row) => <span className="font-medium">{row.adminName}</span> },
    { key: "action", header: "Amal", render: (row) => row.action },
    { key: "target", header: "Obyekt", render: (row) => <span className="font-mono text-xs text-muted">{row.target}</span> },
    { key: "date", header: "Vaqt", render: (row) => <span className="text-xs text-muted">{formatDate(row.createdAt)} · {formatTime(row.createdAt)}</span> },
  ];
  return (
    <>
      <AdminPageHeader title="Adminlar auditi" description="Faqat CEO uchun: administratorlar bajargan muhim amallar va kuzatuv tarixi." />
      {events.length ? <Table columns={columns} rows={events} rowKey={(row) => row.id} renderMobileCard={(row) => (
        <div><p className="text-sm font-medium text-ink">{row.action}</p><p className="mt-1 text-xs text-muted">{row.adminName} · {row.target}</p><p className="mt-2 text-2xs text-faint">{formatDate(row.createdAt)} · {formatTime(row.createdAt)}</p></div>
      )} /> : <EmptyAdmin>Audit hodisalari hali mavjud emas.</EmptyAdmin>}
    </>
  );
}
