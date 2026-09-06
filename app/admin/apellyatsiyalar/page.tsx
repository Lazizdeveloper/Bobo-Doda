"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, type TableColumn } from "@/components/ui/Table";
import {
  listAppealsQueue,
  handleUserAppeal,
  type AdminPage,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { formatDate } from "@/lib/format";
import type { UserAppeal } from "@/lib/admin-types";
import { DangerousActionModal } from "@/components/admin/DangerousActionModal";

export default function UserAppealsPage() {
  const [page, setPage] = useState<AdminPage<UserAppeal> | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selectedAppeal, setSelectedAppeal] = useState<UserAppeal | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionDecision, setActionDecision] = useState<"accepted" | "rejected">("accepted");

  /* Qidiruv debounce bilan — aks holda backend'da har harfda so'rov ketardi */
  const debouncedSearch = useDebouncedValue(search, 300);

  /* SERVER tomonida filtrlanadi va sahifalanadi. */
  const load = useCallback(() => {
    setLoadError(null);
    listAppealsQueue({
      page: currentPage,
      perPage: rowsPerPage,
      search: debouncedSearch,
      status: statusFilter,
    })
      .then(setPage)
      .catch(setLoadError);
  }, [currentPage, rowsPerPage, debouncedSearch, statusFilter]);

  useEffect(load, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, rowsPerPage]);

  /* KPI — faset sanoqlaridan */
  const facets = page?.facets ?? {};
  const stats = {
    total: facets._all ?? 0,
    pending: facets.pending ?? 0,
    approved: facets.accepted ?? 0,
    rejected: facets.rejected ?? 0,
  };


  const getStatusInfo = (status: UserAppeal["status"]): { label: string; tone: BadgeTone } => {
    switch (status) {
      case "pending":
        return { label: "Kutilmoqda", tone: "warning" };
      case "reviewing":
        return { label: "Ko'rib chiqilmoqda", tone: "info" };
      case "accepted":
        return { label: "Qanoatlantirildi (Tiklandi)", tone: "success" };
      case "rejected":
        return { label: "Rad etildi", tone: "danger" };
      default:
        return { label: status, tone: "neutral" };
    }
  };

  const columns: TableColumn<UserAppeal>[] = [
    {
      key: "userName",
      header: "Foydalanuvchi & Blok Sababi",
      render: (a) => (
        <div className="min-w-0">
          <p className="font-bold text-ink truncate">{a.userName}</p>
          <p className="text-2xs text-muted">
            Blok sababi: <span className="font-medium text-danger">{a.originalReason}</span>
          </p>
          <p className="text-3xs text-muted font-mono">ID: {a.id} · User: {a.userId}</p>
        </div>
      ),
    },
    {
      key: "appealText",
      header: "Apellyatsiya Matni",
      render: (a) => (
        <p className="text-xs text-ink truncate max-w-sm">{a.appealText}</p>
      ),
    },
    {
      key: "status",
      header: "Holat",
      render: (a) => {
        const info = getStatusInfo(a.status);
        return <Badge tone={info.tone} size="sm">{info.label}</Badge>;
      },
    },
    {
      key: "createdAt",
      header: "Topshirilgan",
      render: (a) => <span className="text-xs text-muted">{formatDate(a.createdAt)}</span>,
    },
    {
      key: "action",
      header: "Ko‘rib Chiqish",
      render: (a) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedAppeal(a)} className="text-xs">
          Ko‘rib chiqish →
        </Button>
      ),
    },
  ];

  /* XATO HOLATI YUKLANISH HOLATIDAN OLDIN tekshiriladi. Ilgari tartib
     teskari edi va bu butun admin panelida bir xil xatoga olib kelardi:
     yuklash yiqilsa holat `null` bo'lib qolar, birinchi shart
     ishlab "Yuklanmoqda..." qaytarardi va pastdagi `<ErrorState>` bloki
     HECH QACHON chizilmasdi — operator abadiy "yuklanmoqda" ekranini
     ko'rar, qayta urinish tugmasi esa o'lik kod edi. */
  if (loadError) {
    return (
      <div className="space-y-6">
      <AdminPageHeader
        title="Foydalanuvchilar Apellyatsiyalari & Qayta Tiklash"
        description="Bloklangan yoki cheklov o‘rnatilgan akkaunt egalarining qayta tiklash arizalarini ko‘rib chiqish."
      />
        <ErrorState error={loadError} onRetry={load} />
      </div>
    );
  }

  if (!page) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Foydalanuvchilar Apellyatsiyalari & Qayta Tiklash"
        description="Bloklangan yoki cheklov o‘rnatilgan akkaunt egalarining qayta tiklash arizalarini ko‘rib chiqish."
      />

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jami Apellyatsiyalar" value={stats.total} detail="Yuborilgan arizalar" />
        <MetricCard label="Ko‘rib Chiqishda" value={stats.pending} detail="Qaror qabul qilinishi lozim" tone="warning" />
        <MetricCard label="Tiklandi (Qabul)" value={stats.approved} detail="Akkaunt blokdan yechilgan" tone="success" />
        <MetricCard label="Rad Etildi" value={stats.rejected} detail="Cheklov o'z kuchida qoldi" tone="danger" />
      </section>

      {/* Filter and Search */}
      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <select
              aria-label="Holat bo'yicha filtr"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha holatlar</option>
              <option value="pending">Kutilmoqda</option>
              <option value="accepted">Tiklandi</option>
              <option value="rejected">Rad etildi</option>
            </select>
          </div>

          <div className="w-full sm:w-72">
            <Input
              aria-label="Qidirish"
              placeholder="Foydalanuvchi, apellyatsiya matni..."
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
              rowKey={(a) => a.id}
              renderMobileCard={(a) => (
                <div className="flex items-start justify-between gap-3 p-3 border border-line rounded-xl bg-card">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink truncate">{a.userName}</p>
                    <p className="text-2xs text-muted truncate">Blok: {a.originalReason}</p>
                    <p className="text-xs text-ink mt-1 truncate">{a.appealText}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedAppeal(a)} className="shrink-0 text-xs">
                    Ko‘rish
                  </Button>
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
            Apellyatsiyalar mavjud emas.
          </Card>
        )}
      </div>

      {/* Appeal Inspection Modal */}
      {selectedAppeal && (
        <Modal
          open={Boolean(selectedAppeal)}
          onClose={() => setSelectedAppeal(null)}
          title={`Apellyatsiyani ko‘rib chiqish #${selectedAppeal.id}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              {selectedAppeal.status === "pending" ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    tone="success"
                    onClick={() => {
                      setActionDecision("accepted");
                      setActionModalOpen(true);
                    }}
                  >
                    Akkauntni tiklash (Unsuspend)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    tone="danger"
                    onClick={() => {
                      setActionDecision("rejected");
                      setActionModalOpen(true);
                    }}
                  >
                    Rad etish (Uphold Block)
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted">Qaror qabul qilingan: {selectedAppeal.status}</span>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedAppeal(null)}>
                Yopish
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-line bg-surface/60 p-3">
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Foydalanuvchi:</span>
                <p className="font-bold text-ink mt-0.5">{selectedAppeal.userName}</p>
                <p className="text-3xs text-muted font-mono">{selectedAppeal.userId}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Bloklanish sababi:</span>
                <p className="font-bold text-danger mt-0.5">{selectedAppeal.originalReason}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Ariza holati:</span>
                <Badge tone={getStatusInfo(selectedAppeal.status).tone} size="sm" className="mt-0.5">
                  {getStatusInfo(selectedAppeal.status).label}
                </Badge>
              </div>
            </div>

            <div>
              <span className="text-3xs uppercase font-bold text-muted block mb-1">Foydalanuvchi tushuntirish xati:</span>
              <div className="rounded-xl border border-line bg-card p-3.5 text-xs text-ink leading-relaxed whitespace-pre-wrap">
                {selectedAppeal.appealText}
              </div>
            </div>

            {selectedAppeal.decisionNote && (
              <div className="rounded-xl border border-line bg-surface/50 p-3">
                <span className="text-3xs uppercase font-bold text-muted block mb-0.5">Moderator xulosasi:</span>
                <p className="text-xs text-ink font-medium">{selectedAppeal.decisionNote}</p>
                <p className="text-3xs text-muted mt-1">Ko‘rib chiquvchi: {selectedAppeal.reviewerName || "Admin"}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Decision Confirmation Modal */}
      {selectedAppeal && (
        <DangerousActionModal
          open={actionModalOpen}
          onClose={() => setActionModalOpen(false)}
          title={
            actionDecision === "accepted"
              ? "Apellyatsiyani qanoatlantirish & Akkauntni tiklash"
              : "Apellyatsiyani rad etish"
          }
          description={
            actionDecision === "accepted"
              ? `"${selectedAppeal.userName}" hisobi blokdan yechiladi va to‘liq faollashtiriladi.`
              : `"${selectedAppeal.userName}" foydalanuvchisining cheklovi o‘z kuchida qoladi.`
          }
          impactDetails={[
            "Foydalanuvchi qaror bo'yicha bildirishnoma oladi",
            "Tizim audit jurnalida moderator qarori va sababi saqlanadi",
          ]}
          confirmLabel={actionDecision === "accepted" ? "Akkauntni tiklash" : "Rad etish"}
          confirmTone={actionDecision === "accepted" ? "primary" : "danger"}
          onConfirm={async (reason) => {
            await handleUserAppeal(selectedAppeal.id, actionDecision, reason);
            load();
            setActionModalOpen(false);
            setSelectedAppeal(null);
          }}
        />
      )}
    </div>
  );
}
