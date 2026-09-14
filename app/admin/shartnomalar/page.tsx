"use client";

/**
 * Bosqich 17 — real backend: `GET /staff/contracts` (offset sahifalash),
 * `GET /staff/contracts/:id` (bosqichlari bilan birga keladi). FAQAT
 * O'QISH — real `staff/contracts` endpoint'i hech qanday mutatsiya
 * amalini ochmaydi (bo'lim 91-J: "mark paid"/qo'lda bekor qilish kabi
 * tugmalar YO'Q — pul harakati faqat haqiqiy amallar: to'lov webhook'i,
 * bosqich tasdig'i, nizo arbitraji orqali sodir bo'ladi).
 */
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Table, type TableColumn } from "@/components/ui/Table";
import { staffListContracts, staffGetContract, type StaffContract } from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { formatMoney, formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  PENDING_SELLER: { label: "Sotuvchi javobini kutmoqda", tone: "warning" },
  ACTIVE: { label: "Faol", tone: "success" },
  COMPLETED: { label: "Yakunlangan", tone: "neutral" },
  CANCELLED: { label: "Bekor qilingan", tone: "neutral" },
  REJECTED: { label: "Rad etilgan", tone: "danger" },
};

export default function ContractsLifecyclePage() {
  const [page, setPage] = useState<{ items: StaffContract[]; page: number; perPage: number; total: number; totalPages: number } | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [buyerId, setBuyerId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selected, setSelected] = useState<StaffContract | null>(null);
  const [detail, setDetail] = useState<StaffContract | null>(null);

  const debouncedBuyerId = useDebouncedValue(buyerId, 300);

  const load = useCallback(() => {
    setLoadError(null);
    staffListContracts({
      page: currentPage,
      perPage: rowsPerPage,
      status: statusFilter === "all" ? undefined : statusFilter,
      buyerId: debouncedBuyerId || undefined,
    })
      .then(setPage)
      .catch(setLoadError);
  }, [currentPage, rowsPerPage, statusFilter, debouncedBuyerId]);

  useEffect(load, [load]);
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedBuyerId, rowsPerPage]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    staffGetContract(selected.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const getStatusInfo = (status: string) => STATUS_LABEL[status] ?? { label: status, tone: "neutral" as BadgeTone };

  const columns: TableColumn<StaffContract>[] = [
    {
      key: "title",
      header: "Shartnoma",
      render: (c) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink truncate max-w-xs">{c.serviceTitleSnapshot}</p>
          <p className="text-2xs text-muted">Sotuvchi: {c.sellerDisplayNameSnapshot}</p>
          <p className="text-3xs text-muted font-mono">ID: {c.id.slice(0, 10)}</p>
        </div>
      ),
    },
    { key: "agreedAmount", header: "Qiymati", render: (c) => <span className="font-bold text-primary text-xs">{formatMoney(c.agreedAmount)}</span> },
    {
      key: "status",
      header: "Holat",
      render: (c) => {
        const info = getStatusInfo(c.status);
        return <Badge tone={info.tone} size="sm">{info.label}</Badge>;
      },
    },
    { key: "createdAt", header: "Tuzilgan sana", render: (c) => <span className="text-xs text-muted">{formatDate(c.createdAt)}</span> },
    {
      key: "action",
      header: "Ko'rish",
      render: (c) => (
        <Button size="sm" variant="outline" onClick={() => setSelected(c)} className="text-xs">
          Batafsil →
        </Button>
      ),
    },
  ];

  if (loadError) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Shartnomalar" description="Platformadagi barcha xavfsiz bitimlar (escrow) va bosqichlar — faqat kuzatuv." />
        <ErrorState error={loadError} onRetry={load} />
      </div>
    );
  }
  if (!page) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Shartnomalar" description="Platformadagi barcha xavfsiz bitimlar (escrow) va bosqichlar — faqat kuzatuv." />

      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Filtrga mos shartnomalar" value={page.total} detail="Joriy filtr bo'yicha" />
      </section>

      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select
            aria-label="Holat bo'yicha filtr"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "Barcha holatlar" },
              { value: "PENDING_SELLER", label: "Javob kutilmoqda" },
              { value: "ACTIVE", label: "Faol" },
              { value: "COMPLETED", label: "Yakunlangan" },
              { value: "CANCELLED", label: "Bekor qilingan" },
              { value: "REJECTED", label: "Rad etilgan" },
            ]}
            className="sm:w-56"
          />
          <div className="w-full sm:w-72">
            <Input aria-label="Xaridor ID" placeholder="Xaridor ID bo'yicha qidirish..." value={buyerId} onChange={(e) => setBuyerId(e.target.value)} />
          </div>
        </div>
      </Card>

      <div className="mt-4">
        {page.items.length ? (
          <>
            <Table columns={columns} rows={page.items} rowKey={(c) => c.id} />
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
          <Card className="py-12 text-center text-xs text-muted">Shartnomalar topilmadi.</Card>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.serviceTitleSnapshot ?? "Shartnoma"} size="lg">
        {detail ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-line bg-surface/60 p-3">
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Umumiy qiymat</span>
                <p className="font-bold text-primary text-sm mt-0.5">{formatMoney(detail.agreedAmount)}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Sotuvchi</span>
                <p className="font-semibold text-ink mt-0.5">{detail.sellerDisplayNameSnapshot}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Holat</span>
                <Badge tone={getStatusInfo(detail.status).tone} size="sm" className="mt-0.5">
                  {getStatusInfo(detail.status).label}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="font-heading text-xs font-bold text-ink mb-2">Bosqichlar ({detail.milestones.length})</h4>
              {detail.milestones.length === 0 ? (
                <Card className="py-6 text-center text-muted">Bosqichlar mavjud emas.</Card>
              ) : (
                <div className="space-y-2">
                  {detail.milestones
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((m, idx) => (
                      <div key={m.id} className="flex items-center justify-between rounded-xl border border-line bg-card p-3 text-xs">
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink">
                              {idx + 1}. {m.title}
                            </span>
                            <Badge size="sm" tone={m.status === "APPROVED" ? "success" : m.status === "IN_PROGRESS" ? "primary" : "neutral"}>
                              {m.status}
                            </Badge>
                          </div>
                          {m.description && <p className="text-2xs text-muted mt-0.5">{m.description}</p>}
                        </div>
                        <p className="font-bold text-primary shrink-0">{formatMoney(m.amount)}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted">Yuklanmoqda...</p>
        )}
      </Modal>
    </div>
  );
}
