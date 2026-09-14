"use client";

/**
 * Bosqich 17 — real backend: `GET /staff/disputes` (offset sahifalash),
 * detal (`/evidence`, `/events`), va HAQIQIY hal qilish amallari
 * (`start-review`/`reject`/`resolve`). Eski `forceCloseContract` (bitta
 * "refund/payout/split" tugmasi) real backendda YO'Q — endi ikkita ANIQ
 * summa (`buyerAwardAmount`/`sellerAwardAmount`) kiritiladi, ular
 * `heldAmount`ga TENG bo'lishi serverda tekshiriladi. Chat tarixi va
 * ish natijalari (deliverable) ko'rinishi olib tashlandi — real backendda
 * bu ma'lumotlar staff'ga ochiq endpoint orqali chiqmaydi.
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
import { Textarea } from "@/components/ui/Textarea";
import { Table, type TableColumn } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import {
  staffListDisputes,
  staffGetDispute,
  staffListDisputeEvidence,
  staffGetContract,
  staffStartDisputeReview,
  staffRejectDispute,
  staffResolveDispute,
  type StaffDispute,
  type StaffDisputeEvidence,
  type StaffContract,
} from "@/lib/api/admin";
import { formatDate, formatMoney } from "@/lib/format";

const STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  OPEN: { label: "Ochiq", tone: "warning" },
  UNDER_REVIEW: { label: "Ko'rib chiqilmoqda", tone: "info" },
  RESOLVED: { label: "Hal qilindi", tone: "success" },
  REJECTED: { label: "Rad etildi", tone: "neutral" },
  CANCELLED: { label: "Bekor qilindi", tone: "neutral" },
};
const REASON_LABEL: Record<string, string> = {
  SCOPE: "Ish hajmi o'zgarishi",
  QUALITY: "Ish sifati qoniqarsiz",
  DEADLINE: "Muddat buzilishi",
  PAYMENT: "To'lov muammosi",
  COMMUNICATION: "Aloqa uzilishi",
  OTHER: "Boshqa sabab",
};

export default function DisputesCenterPage() {
  const { toast } = useToast();
  const [page, setPage] = useState<{ items: StaffDispute[]; page: number; perPage: number; total: number; totalPages: number } | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [statusFilter, setStatusFilter] = useState<"OPEN_ALL" | "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "all">("OPEN_ALL");
  const [contractIdFilter, setContractIdFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selected, setSelected] = useState<StaffDispute | null>(null);
  const [contract, setContract] = useState<StaffContract | null>(null);
  const [evidence, setEvidence] = useState<StaffDisputeEvidence[]>([]);
  const [buyerAward, setBuyerAward] = useState("");
  const [sellerAward, setSellerAward] = useState("");
  const [resolutionReason, setResolutionReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    staffListDisputes({
      page: currentPage,
      perPage: rowsPerPage,
      status: statusFilter === "OPEN_ALL" || statusFilter === "all" ? undefined : statusFilter,
      contractId: contractIdFilter || undefined,
    })
      .then((res) => {
        if (statusFilter !== "OPEN_ALL") {
          setPage(res);
          return;
        }
        setPage({ ...res, items: res.items.filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW") });
      })
      .catch(setLoadError);
  }, [currentPage, rowsPerPage, statusFilter, contractIdFilter]);

  useEffect(load, [load]);
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, contractIdFilter, rowsPerPage]);

  useEffect(() => {
    if (!selected) {
      setContract(null);
      setEvidence([]);
      return;
    }
    let cancelled = false;
    Promise.all([staffGetContract(selected.contractId), staffListDisputeEvidence(selected.id)])
      .then(([c, ev]) => {
        if (cancelled) return;
        setContract(c);
        setEvidence(ev);
      })
      .catch(() => {
        if (!cancelled) {
          setContract(null);
          setEvidence([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  function closeModal() {
    setSelected(null);
    setBuyerAward("");
    setSellerAward("");
    setResolutionReason("");
    setActionError("");
  }

  async function handleStartReview() {
    if (!selected) return;
    setBusy(true);
    try {
      await staffStartDisputeReview(selected.id);
      toast("Ko'rib chiqish boshlandi");
      const fresh = await staffGetDispute(selected.id);
      setSelected(fresh);
      load();
    } catch {
      toast("Xatolik yuz berdi", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!selected) return;
    if (resolutionReason.trim().length < 10) {
      setActionError("Sabab kamida 10 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      await staffRejectDispute(selected.id, resolutionReason.trim());
      toast("Nizo rad etildi");
      closeModal();
      load();
    } catch {
      setActionError("Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve() {
    if (!selected) return;
    const buyer = Number(buyerAward);
    const seller = Number(sellerAward);
    if (!Number.isFinite(buyer) || !Number.isFinite(seller) || buyer < 0 || seller < 0) {
      setActionError("To'g'ri summa kiriting.");
      return;
    }
    if (buyer + seller !== selected.heldAmount) {
      setActionError(`Yig'indi muzlatilgan summaga (${formatMoney(selected.heldAmount)}) teng bo'lishi shart.`);
      return;
    }
    if (resolutionReason.trim().length < 10) {
      setActionError("Qaror asosi kamida 10 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      await staffResolveDispute(selected.id, buyer, seller, resolutionReason.trim());
      toast("Nizo hal qilindi");
      closeModal();
      load();
    } catch {
      setActionError("Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  const columns: TableColumn<StaffDispute>[] = [
    { key: "id", header: "Nizo ID", render: (d) => <span className="font-mono text-xs text-ink">{d.id.slice(0, 10)}</span> },
    { key: "contractId", header: "Shartnoma", render: (d) => <span className="font-mono text-xs text-muted">{d.contractId.slice(0, 10)}</span> },
    { key: "reason", header: "Sabab", render: (d) => <span className="text-xs text-ink font-medium">{REASON_LABEL[d.reason] ?? d.reason}</span> },
    { key: "heldAmount", header: "Muzlatilgan summa", render: (d) => <span className="font-mono text-xs text-ink">{formatMoney(d.heldAmount)}</span> },
    { key: "createdAt", header: "Ochilgan sana", render: (d) => <span className="text-xs text-muted">{formatDate(d.openedAt)}</span> },
    {
      key: "status",
      header: "Holati",
      render: (d) => {
        const info = STATUS_LABEL[d.status] ?? { label: d.status, tone: "neutral" as BadgeTone };
        return <Badge tone={info.tone}>{info.label}</Badge>;
      },
    },
    {
      key: "action",
      header: "Ko'rib chiqish",
      render: (d) => (
        <Button size="sm" variant="secondary" onClick={() => setSelected(d)}>
          Ko'rib chiqish
        </Button>
      ),
    },
  ];

  if (loadError) {
    return (
      <>
        <AdminPageHeader title="Nizolar markazi" description="Shartnomalar bo'yicha kelishmovchiliklarni ko'rib chiqish va arbitraj." />
        <ErrorState error={loadError} onRetry={load} />
      </>
    );
  }
  if (!page) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <>
      <AdminPageHeader title="Nizolar markazi" description="Shartnomalar bo'yicha kelishmovchiliklarni ko'rib chiqish va arbitraj." />

      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Joriy filtrga mos nizolar" value={page.total} detail="Sahifadagi natijalar soni" tone="warning" />
      </section>

      <Card padding="md" className="mt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select
            aria-label="Holat bo'yicha filtr"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            options={[
              { value: "OPEN_ALL", label: "Ochiq nizolar" },
              { value: "OPEN", label: "Faqat OPEN" },
              { value: "UNDER_REVIEW", label: "Faqat ko'rib chiqilayotgan" },
              { value: "RESOLVED", label: "Hal qilinganlar" },
              { value: "all", label: "Barchasi" },
            ]}
            className="sm:w-56"
          />
          <div className="w-full sm:w-64">
            <Input aria-label="Shartnoma ID" placeholder="Shartnoma ID bo'yicha qidirish..." value={contractIdFilter} onChange={(e) => setContractIdFilter(e.target.value)} />
          </div>
        </div>
      </Card>

      <div className="mt-4">
        {page.items.length ? (
          <>
            <Table columns={columns} rows={page.items} rowKey={(d) => d.id} />
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
          <Card className="py-12 text-center text-muted">Bunday nizolar topilmadi.</Card>
        )}
      </div>

      <Modal open={!!selected} onClose={closeModal} title="Nizo ishi arbitraji">
        {selected && (
          <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="border-b border-line pb-3">
              <p className="text-2xs text-muted font-semibold uppercase">Shartnoma</p>
              <h3 className="font-heading text-sm font-bold text-ink">{contract?.serviceTitleSnapshot ?? "Yuklanmoqda..."}</h3>
              <p className="text-3xs text-muted mt-0.5">ID: {selected.contractId}</p>
              <div className="mt-2.5 grid grid-cols-2 gap-3 text-xs text-ink bg-card-hover p-2.5 rounded-input border border-line/20">
                <div>
                  <span className="text-muted">Nizo summasi: </span>
                  <span className="font-semibold font-mono">{formatMoney(selected.disputedAmount)}</span>
                </div>
                <div>
                  <span className="text-muted">Muzlatilgan (held): </span>
                  <span className="font-semibold font-mono text-warning">{formatMoney(selected.heldAmount)}</span>
                </div>
              </div>
            </div>

            <div className="border-b border-line pb-3">
              <div className="flex justify-between items-center">
                <span className="text-2xs text-muted font-semibold uppercase">Nizo arizasi</span>
                <span className="text-2xs text-muted">{formatDate(selected.openedAt)}</span>
              </div>
              <p className="mt-1 text-xs text-ink font-semibold text-primary">Sabab: {REASON_LABEL[selected.reason] ?? selected.reason}</p>
              <p className="mt-1.5 text-xs text-muted bg-card-hover p-2.5 rounded border border-line/10 leading-relaxed italic whitespace-pre-wrap">
                &quot;{selected.description}&quot;
              </p>
              {evidence.length > 0 && (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <p className="text-2xs text-muted font-semibold uppercase">Dalillar ({evidence.length})</p>
                  {evidence.map((ev) => (
                    <div key={ev.id} className="text-2xs text-ink bg-surface p-2 rounded border border-line">
                      {ev.text || ev.fileReference}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selected.status === "OPEN" && (
              <Button size="sm" onClick={handleStartReview} loading={busy} className="self-start">
                Ko'rib chiqishni boshlash
              </Button>
            )}

            {(selected.status === "OPEN" || selected.status === "UNDER_REVIEW") && (
              <div className="flex flex-col gap-3">
                <p className="text-2xs text-muted font-semibold uppercase">Qaror</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBuyerAward(String(selected.heldAmount));
                      setSellerAward("0");
                    }}
                    className="rounded-input border border-line px-2 py-2 text-2xs font-bold hover:border-primary"
                  >
                    To'liq xaridorga
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBuyerAward("0");
                      setSellerAward(String(selected.heldAmount));
                    }}
                    className="rounded-input border border-line px-2 py-2 text-2xs font-bold hover:border-primary"
                  >
                    To'liq sotuvchiga
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Xaridorga (so'm)"
                    type="number"
                    value={buyerAward}
                    onChange={(e) => {
                      setBuyerAward(e.target.value);
                      setActionError("");
                    }}
                  />
                  <Input
                    label="Sotuvchiga (so'm)"
                    type="number"
                    value={sellerAward}
                    onChange={(e) => {
                      setSellerAward(e.target.value);
                      setActionError("");
                    }}
                  />
                </div>
                <Textarea
                  label="Qaror asosi"
                  placeholder="Escrow mablag'larini taqsimlash qarori bo'yicha..."
                  value={resolutionReason}
                  onChange={(e) => {
                    setResolutionReason(e.target.value);
                    setActionError("");
                  }}
                  error={actionError}
                  maxLength={1000}
                />
                <div className="border-t border-line pt-3 mt-1 grid grid-cols-2 gap-2">
                  <Button variant="danger" onClick={handleReject} loading={busy}>
                    Rad etish
                  </Button>
                  <Button variant="primary" onClick={handleResolve} loading={busy}>
                    Qarorni tasdiqlash
                  </Button>
                </div>
              </div>
            )}

            {(selected.status === "RESOLVED" || selected.status === "REJECTED") && (
              <div className="border-t border-line pt-3 text-center">
                <p className="text-2xs text-muted">Ushbu nizo ishi yopilgan.</p>
                {selected.resolutionReason && (
                  <div className="mt-2 text-2xs text-ink bg-card-hover p-2.5 rounded text-left border border-line/20">
                    <p className="font-semibold text-muted">Qaror asosi:</p>
                    <p className="mt-0.5 whitespace-pre-wrap">{selected.resolutionReason}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
