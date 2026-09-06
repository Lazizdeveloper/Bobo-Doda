"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Table, type TableColumn } from "@/components/ui/Table";
import {
  listVerificationsQueue,
  findVerificationByUserId,
  adminModerate,
  type AdminPage,
  type AdminVerificationRow,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useAdminDeepLink } from "@/lib/hooks/useAdminDeepLink";
import { adminErrorText } from "@/lib/admin-error-text";
import { formatDate } from "@/lib/format";
import { InternalNotesWidget } from "@/components/admin/InternalNotesWidget";

export default function VerificationQueuePage() {
  const [page, setPage] = useState<AdminPage<AdminVerificationRow> | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "korib_chiqilmoqda" | "tasdiqlangan" | "rad_etilgan">("korib_chiqilmoqda");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Moderation States
  const [selectedRecord, setSelectedRecord] = useState<AdminVerificationRow | null>(null);
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  /* Qidiruv debounce bilan */
  const debouncedSearch = useDebouncedValue(search, 300);

  /* SERVER tomonida filtrlanadi va sahifalanadi; foydalanuvchi nomi
     qatorga server tomonida biriktirilgan (`AdminVerificationRow`). */
  const load = useCallback(() => {
    setLoadError(null);
    listVerificationsQueue({
      page: currentPage,
      perPage: rowsPerPage,
      search: debouncedSearch,
      status: statusFilter,
    })
      .then(setPage)
      .catch(setLoadError);
  }, [currentPage, rowsPerPage, debouncedSearch, statusFilter]);

  useEffect(load, [load]);

  /* Global qidiruvdan kelgan deep-link — yozuvni topib ochadi */
  useAdminDeepLink("userId", findVerificationByUserId, setSelectedRecord);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, rowsPerPage]);

  /* KPI — faset sanoqlaridan */
  const facets = page?.facets ?? {};
  const stats = {
    total: facets._all ?? 0,
    pending: facets.korib_chiqilmoqda ?? 0,
    approved: facets.tasdiqlangan ?? 0,
    rejected: facets.rad_etilgan ?? 0,
  };


  const recordStatusInfo = (status: string) => {
    const map: Record<string, { label: string; tone: BadgeTone }> = {
      korib_chiqilmoqda: { label: "Ko'rib chiqilmoqda", tone: "warning" },
      tasdiqlangan: { label: "Tasdiqlangan", tone: "success" },
      rad_etilgan: { label: "Rad etilgan", tone: "danger" },
      boshlanmagan: { label: "Boshlanmagan", tone: "neutral" },
    };
    return map[status] || { label: status, tone: "neutral" };
  };

  const handleApprove = async () => {
    if (!selectedRecord) return;
    setActionLoading(true);
    setActionError("");
    try {
      await adminModerate("kyc", selectedRecord.userId, { outcome: "approve", note: note.trim() });
      setSelectedRecord(null);
      setNote("");
      load();
    } catch (err) {
      setActionError(adminErrorText(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRecord) return;
    if (note.trim().length < 10) {
      setActionError("Rad etish sababi kamida 10 belgidan iborat bo'lishi shart.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      await adminModerate("kyc", selectedRecord.userId, { outcome: "reject", note: note.trim() });
      setSelectedRecord(null);
      setNote("");
      load();
    } catch (err) {
      setActionError(adminErrorText(err));
    } finally {
      setActionLoading(false);
    }
  };

  const columns: TableColumn<AdminVerificationRow>[] = [
    {
      key: "user",
      header: "Foydalanuvchi",
      render: (v) => {
        return (
          <div>
            <p className="font-semibold text-ink">{v.userName || v.legalName}</p>
            <p className="text-2xs text-muted">ID: {v.userId}</p>
          </div>
        );
      },
    },
    {
      key: "legalName",
      header: "Hujjatdagi ismi",
      render: (v) => <span className="text-sm text-ink">{v.legalName}</span>,
    },
    {
      key: "details",
      header: "Mamlakat / Hujjat",
      render: (v) => (
        <span className="text-xs text-ink font-medium">
          {v.country} · {v.documentType === "passport" ? "Pasport" : "ID Karta"}
        </span>
      ),
    },
    {
      key: "submittedAt",
      header: "Sana",
      render: (v) => (
        <div className="text-xs text-muted">
          <p>{v.submittedAt ? formatDate(v.submittedAt) : "Noma'lum"}</p>
          {v.reviewedAt && (
            <p className="text-2xs text-faint">
              {"Ko'rildi: "}
              {formatDate(v.reviewedAt)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Holati",
      render: (v) => {
        const info = recordStatusInfo(v.status);
        return <Badge tone={info.tone}>{info.label}</Badge>;
      },
    },
    {
      key: "action",
      header: "Batafsil",
      render: (v) => (
        <Button size="sm" variant="secondary" onClick={() => {
          setSelectedRecord(v);
          setNote(v.rejectionReason || "");
          setActionError("");
        }}>
          {"Ko'rib chiqish"}
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
      <>
      <AdminPageHeader
        title="KYC shaxsni tasdiqlash arizalari"
        description="Mustaqil mutaxassislardan kelgan shaxsni tasdiqlovchi hujjatlarni xavfsiz ko'rib chiqish navbati."
      />
        <ErrorState error={loadError} onRetry={load} />
      </>
    );
  }

  if (!page) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <>
      <AdminPageHeader
        title="KYC shaxsni tasdiqlash arizalari"
        description="Mustaqil mutaxassislardan kelgan shaxsni tasdiqlovchi hujjatlarni xavfsiz ko'rib chiqish navbati."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jami Arizalar" value={stats.total} detail="Barcha vaqtlardagi arizalar" />
        <MetricCard label="Kutilayotganlar (Pending)" value={stats.pending} detail="Ko'rib chiqish talab etiladi" tone="warning" />
        <MetricCard label="Tasdiqlanganlar" value={stats.approved} detail="Tizimda verifikatsiyadan o'tgan" tone="success" />
        <MetricCard label="Rad etilganlar" value={stats.rejected} detail="Shaxsi tasdiqlanmagan mutaxassislar" tone="danger" />
      </section>

      {/* Filter and Search Bar */}
      <Card padding="md" className="mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[150px]">
              <select
                aria-label="Holat bo'yicha filtr"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "korib_chiqilmoqda" | "tasdiqlangan" | "rad_etilgan")}
                className="w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-primary"
              >
                <option value="all">Barcha holatlar</option>
                <option value="korib_chiqilmoqda">{"Ko'rib chiqilmoqda (Pending)"}</option>
                <option value="tasdiqlangan">Tasdiqlangan</option>
                <option value="rad_etilgan">Rad etilgan</option>
              </select>
            </div>
            <div className="w-full sm:w-64">
              <Input
                aria-label="Qidirish"
                placeholder="Ism yoki ID bo'yicha qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Queue Table */}
      <div className="mt-4">
        {page.items.length ? (
          <>
            <Table
              columns={columns}
              rows={page.items}
              rowKey={(v) => v.userId}
              renderMobileCard={(v) => {
                const info = recordStatusInfo(v.status);
                return (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{v.userName || v.legalName}</p>
                      <p className="text-2xs text-muted">ID: {v.userId}</p>
                      <p className="text-xs text-ink mt-1 font-medium">
                        {v.country} · {v.documentType === "passport" ? "Pasport" : "ID Karta"}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        Yuborildi: {v.submittedAt ? formatDate(v.submittedAt) : "Noma'lum"}
                      </p>
                      <div className="mt-2.5">
                        <Badge tone={info.tone}>{info.label}</Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => {
                      setSelectedRecord(v);
                      setNote(v.rejectionReason || "");
                      setActionError("");
                    }}>
                      {"Ko'rib chiqish"}
                    </Button>
                  </div>
                );
              }}
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
          <Card className="py-12 text-center text-muted">Navbatda bunday arizalar topilmadi.</Card>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Ariza ma'lumotlari"
      >
        {selectedRecord && (
          <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="border-b border-line pb-3">
              <p className="text-xs text-muted font-semibold uppercase">Yuridik ism (Hujjatda)</p>
              <p className="font-heading text-base font-bold text-ink">{selectedRecord.legalName}</p>
              <p className="text-3xs text-muted mt-0.5">Tizimdagi ID: {selectedRecord.userId}</p>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-xs border-b border-line pb-3">
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">{"Tug'ilgan sana"}</dt>
                <dd className="mt-0.5 text-ink font-medium">{selectedRecord.birthDate}</dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Mamlakat</dt>
                <dd className="mt-0.5 text-ink font-medium">{selectedRecord.country}</dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Hujjat turi</dt>
                <dd className="mt-0.5 text-ink font-medium">
                  {selectedRecord.documentType === "passport" ? "Pasport (Xalqaro)" : "ID Karta"}
                </dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Holati</dt>
                <dd className="mt-0.5">
                  <Badge tone={recordStatusInfo(selectedRecord.status).tone}>
                    {recordStatusInfo(selectedRecord.status).label}
                  </Badge>
                </dd>
              </div>
            </dl>

            {/* Document Image Previews */}
            <div>
              <p className="text-2xs text-muted font-semibold uppercase mb-1.5">Biriktirilgan hujjatlar ({selectedRecord.documents.length} ta fayl)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedRecord.documents.map((doc, idx) => (
                  <div key={idx} className="relative h-44 rounded-xl overflow-hidden border border-line bg-surface flex flex-col items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={doc} alt={`Hujjat ${idx + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Operator Notes on this KYC verification */}
            <InternalNotesWidget targetId={selectedRecord.userId} targetType="kyc" />

            {/* Rejection / Note Input */}
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <Textarea
                label={selectedRecord.status === "rad_etilgan" ? "Rad etish sababi" : "Rad etilsa - sabab yoki sharh (Kamida 10 ta belgi)"}
                placeholder="Masalan: Hujjat rasmi xira, ismlar mos kelmadi..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                error={actionError}
                disabled={selectedRecord.status !== "korib_chiqilmoqda"}
              />
            </div>

            {/* Decision Actions */}
            {selectedRecord.status === "korib_chiqilmoqda" && (
              <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
                <Button variant="danger" className="justify-center" onClick={handleReject} disabled={actionLoading}>
                  Rad etish
                </Button>
                <Button variant="primary" className="justify-center" onClick={handleApprove} disabled={actionLoading}>
                  Tasdiqlash (KYC Pass)
                </Button>
              </div>
            )}

            {selectedRecord.status !== "korib_chiqilmoqda" && (
              <div className="text-center text-2xs text-muted border-t border-line pt-3 mt-1 font-sans">
                Ushbu ariza operatsiyasi yakunlangan.
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
