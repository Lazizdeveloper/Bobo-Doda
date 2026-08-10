"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getAdminData, adminModerate } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";
import type { VerificationRecord } from "@/lib/types";

export default function VerificationQueuePage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "korib_chiqilmoqda" | "tasdiqlangan" | "rad_etilgan">("korib_chiqilmoqda");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Moderation States
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecord | null>(null);
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  function load() {
    setData(getAdminData());
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    const list = data.verifications;
    return {
      total: list.length,
      pending: list.filter((v) => v.status === "korib_chiqilmoqda").length,
      approved: list.filter((v) => v.status === "tasdiqlangan").length,
      rejected: list.filter((v) => v.status === "rad_etilgan").length,
    };
  }, [data]);

  const filteredRecords = useMemo(() => {
    if (!data) return [];
    return data.verifications.filter((v) => {
      // 1. Status Filter
      if (statusFilter !== "all" && v.status !== statusFilter) return false;

      // 2. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const user = data.users.find((u) => u.id === v.userId);
        return (
          v.legalName.toLowerCase().includes(q) ||
          v.userId.toLowerCase().includes(q) ||
          user?.fullName.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [data, statusFilter, search]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, currentPage, rowsPerPage]);

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
      adminModerate("kyc", selectedRecord.userId, { outcome: "approve", note: note.trim() });
      setSelectedRecord(null);
      setNote("");
      load();
    } catch {
      setActionError("Tasdiqlashda xato yuz berdi.");
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
      adminModerate("kyc", selectedRecord.userId, { outcome: "reject", note: note.trim() });
      setSelectedRecord(null);
      setNote("");
      load();
    } catch {
      setActionError("Rad etishda xato yuz berdi.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns: TableColumn<VerificationRecord>[] = [
    {
      key: "user",
      header: "Foydalanuvchi",
      render: (v) => {
        const user = data?.users.find((u) => u.id === v.userId);
        return (
          <div>
            <p className="font-semibold text-ink">{user?.fullName || v.legalName}</p>
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
      header: "Yuborilgan sana",
      render: (v) => (
        <span className="text-xs text-muted">
          {v.submittedAt ? formatDate(v.submittedAt) : "Noma'lum"}
        </span>
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

  if (!data) return <p className="text-muted">Yuklanmoqda...</p>;

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
        {filteredRecords.length ? (
          <>
            <Table
              columns={columns}
              rows={paginatedRecords}
              rowKey={(v) => v.userId}
              renderMobileCard={(v) => {
                const user = data.users.find((u) => u.id === v.userId);
                const info = recordStatusInfo(v.status);
                return (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{user?.fullName || v.legalName}</p>
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
              currentPage={currentPage}
              totalPages={Math.ceil(filteredRecords.length / rowsPerPage)}
              onPageChange={setCurrentPage}
              totalRows={filteredRecords.length}
              rowsPerPage={rowsPerPage}
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

            {/* Document Placeholders / Image */}
            <div>
              <p className="text-2xs text-muted font-semibold uppercase mb-1.5">Biriktirilgan hujjatlar ({selectedRecord.documents.length} ta fayl)</p>
              <div className="grid grid-cols-2 gap-2">
                {selectedRecord.documents.map((doc, idx) => (
                  <div key={idx} className="rounded border border-line bg-card-hover p-2 text-center flex flex-col items-center justify-center h-28">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted mb-1.5">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2v6h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p className="text-3xs text-ink font-mono truncate w-full">Hujjat_{idx + 1}.pdf</p>
                    <span className="text-3xs text-faint mt-1">Mock rejimida ko&apos;rib bo&apos;lmaydi</span>
                  </div>
                ))}
              </div>
            </div>

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
