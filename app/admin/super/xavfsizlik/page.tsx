"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";

interface SecuritySession {
  id: string;
  userId: string;
  userName: string;
  role: string;
  ip: string;
  device: string;
  lastActive: string;
}

const mockSessions: SecuritySession[] = [
  { id: "s1", userId: "u-1", userName: "Aziz Karimov", role: "mutaxassis", ip: "192.168.1.1", device: "Chrome / Windows 11", lastActive: new Date().toISOString() },
  { id: "s2", userId: "u-2", userName: "Jasur Toshpo'latov", role: "xaridor", ip: "10.0.0.5", device: "Safari / iPhone", lastActive: new Date().toISOString() },
];

export default function SecurityCenterPage() {
  const [sessions, setSessions] = useState<SecuritySession[]>(mockSessions);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const columns: TableColumn<SecuritySession>[] = [
    { key: "user", header: "Foydalanuvchi", render: (row) => <div><p className="font-medium text-ink">{row.userName}</p><p className="text-3xs text-muted">{row.userId} / {row.role}</p></div> },
    { key: "device", header: "Qurilma / IP", render: (row) => <div><p className="text-sm">{row.device}</p><p className="font-mono text-3xs text-muted">{row.ip}</p></div> },
    { key: "lastActive", header: "Oxirgi faollik", render: (row) => <span className="text-xs text-muted">{formatDate(row.lastActive)}</span> },
    {
      key: "actions",
      header: "Amallar",
      render: (row) => (
        <Button variant="danger" size="sm" onClick={() => setSessions(sessions.filter(s => s.id !== row.id))}>
          Sessiyani uzish
        </Button>
      )
    },
  ];

  function terminateAll() {
    setLoading(true);
    setTimeout(() => {
      setSessions([]);
      setLoading(false);
      setConfirmOpen(false);
    }, 1000);
  }

  return (
    <>
      <AdminPageHeader
        title="Xavfsizlik Markazi"
        description="Faol sessiyalar, kirish tarixi va shubhali harakatlarni monitoring qilish."
      />

      <Card padding="lg" className="mb-6 border-danger/40">
        <h2 className="font-heading text-base font-bold text-danger">Barcha sessiyalarni to&apos;xtatish</h2>
        <p className="mt-2 text-sm text-muted">Ushbu amal barcha foydalanuvchilarni tizimdan chiqarib yuboradi va ularni qayta kirishga majbur qiladi. Bu faqat xavfsizlik insidenti yuz berganda qo&apos;llanilishi kerak.</p>
        <div className="mt-4">
          <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={loading || sessions.length === 0}>
            Barcha sessiyalarni majburiy uzish
          </Button>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base font-bold text-ink">Faol sessiyalar</h2>
          <Badge tone="primary">{sessions.length} ta faol</Badge>
        </div>
        <Table
          columns={columns}
          rows={sessions}
          rowKey={(row) => row.id}
          renderMobileCard={(row) => (
            <Card padding="none" className="border-0">
              <div className="flex flex-col gap-2">
                <div>
                  <p className="font-medium text-ink">{row.userName}</p>
                  <p className="text-xs text-muted">{row.device} / {row.ip}</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setSessions(sessions.filter(s => s.id !== row.id))}>Sessiyani uzish</Button>
              </div>
            </Card>
          )}
        />
      </Card>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Barcha sessiyalarni uzish">
        <p className="text-sm text-muted">Haqiqatan ham barcha faol sessiyalarni uzishni xohlaysizmi? Bu amalni bekor qilib bo&apos;lmaydi.</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Bekor qilish</Button>
          <Button variant="danger" onClick={terminateAll} disabled={loading}>{loading ? "Bajarilmoqda..." : "Tasdiqlash"}</Button>
        </div>
      </Modal>
    </>
  );
}
