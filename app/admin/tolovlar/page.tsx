"use client";

/**
 * Bosqich 17 — real backend: `staff/payments` (o'qish), `staff/refunds`
 * (o'qish + `POST` bilan haqiqiy qaytarish yaratish), `staff/payouts`
 * (o'qish — `PAYOUTS_ENABLED=false`, real chiqarish yo'nalishi hali
 * tanlanmagan), `staff/ledger/transactions` (append-only, o'qish).
 *
 * Eski mock sahifadagi "Manual Bank Payout tasdiqlash", "B2B kvitansiya
 * tekshiruvi" va "Tranzaksiyani bekor qilish" — HAMMASI real backendda
 * YO'Q va ATAYLAB qo'shilmadi (bo'lim 91-J: "mark paid"/qo'lda bekor
 * qilish tugmalari YO'Q — ledger append-only, pul harakati faqat
 * haqiqiy provider webhook/refund orqali).
 */
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Table, type TableColumn } from "@/components/ui/Table";
import {
  staffListPayments,
  staffListRefunds,
  staffCreateRefund,
  staffListPayouts,
  staffListLedgerTransactions,
  listWithdrawalsQueue,
  approveWithdrawal,
  rejectWithdrawal,
  type StaffPayment,
  type StaffRefund,
  type StaffPayout,
  type StaffLedgerTransaction,
} from "@/lib/api/admin";
import type { WithdrawalRequest } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";

type Tab = "payments" | "refunds" | "payouts" | "ledger";
type PageResult<T> = { items: T[]; page: number; perPage: number; total: number; totalPages: number };

const TONE: Record<string, BadgeTone> = {
  SUCCEEDED: "success",
  PENDING: "warning",
  PROCESSING: "info",
  FAILED: "danger",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

export default function PaymentsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("payments");
  const [paymentPage, setPaymentPage] = useState<PageResult<StaffPayment> | null>(null);
  const [refundPage, setRefundPage] = useState<PageResult<StaffRefund> | null>(null);
  const [payoutPage, setPayoutPage] = useState<PageResult<StaffPayout> | null>(null);
  const [withdrawalPage, setWithdrawalPage] = useState<PageResult<WithdrawalRequest> | null>(null);
  const [withdrawalActionBusy, setWithdrawalActionBusy] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [ledgerPage, setLedgerPage] = useState<PageResult<StaffLedgerTransaction> | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundContractId, setRefundContractId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    const query = { page: currentPage, perPage: rowsPerPage };
    const req =
      tab === "payments"
        ? staffListPayments(query).then(setPaymentPage)
        : tab === "refunds"
          ? staffListRefunds(query).then(setRefundPage)
          : tab === "payouts"
            ? Promise.all([
                listWithdrawalsQueue(query),
                staffListPayouts(query).catch(() => ({ items: [], page: 1, perPage: rowsPerPage, total: 0, totalPages: 1 })),
              ]).then(([wPage, pPage]) => {
                setWithdrawalPage(wPage);
                setPayoutPage(pPage);
              })
            : staffListLedgerTransactions(query).then(setLedgerPage);
    req.catch(setLoadError);
  }, [tab, currentPage, rowsPerPage]);

  useEffect(load, [load]);
  useEffect(() => {
    setCurrentPage(1);
  }, [tab, rowsPerPage]);

  async function handleApproveWithdrawal(req: WithdrawalRequest) {
    if (!confirm(`${req.userName} uchun ${formatMoney(req.amount)} mablag' Uzcard/Humo kartasiga o'tkazilganligini tasdiqlaysizmi?`)) {
      return;
    }
    setWithdrawalActionBusy(true);
    try {
      await approveWithdrawal(req.id);
      toast("Mablag' o'tkazilganligi tasdiqlandi!");
      load();
    } catch {
      toast("Tasdiqlashda xatolik yuz berdi");
    } finally {
      setWithdrawalActionBusy(false);
    }
  }

  async function handleRejectWithdrawal() {
    if (!selectedWithdrawal) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setRejectError("Rad etish sababini kamida 5 ta belgidan iborat qilib yozing.");
      return;
    }
    setWithdrawalActionBusy(true);
    setRejectError("");
    try {
      await rejectWithdrawal(selectedWithdrawal.id, rejectReason.trim());
      toast("Mablag' yechish so'rovi rad etildi.");
      setRejectModalOpen(false);
      setSelectedWithdrawal(null);
      setRejectReason("");
      load();
    } catch {
      setRejectError("Rad etishda xatolik yuz berdi.");
    } finally {
      setWithdrawalActionBusy(false);
    }
  }

  async function handleCreateRefund() {
    if (!refundContractId.trim()) {
      setRefundError("Shartnoma ID kiriting.");
      return;
    }
    if (refundReason.trim().length < 10) {
      setRefundError("Sabab kamida 10 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    setBusy(true);
    setRefundError("");
    try {
      await staffCreateRefund(refundContractId.trim(), refundReason.trim());
      toast("Qaytarish so'rovi yaratildi");
      setRefundOpen(false);
      setRefundContractId("");
      setRefundReason("");
      load();
    } catch {
      setRefundError("Xatolik yuz berdi — shartnoma ID yoki holatini tekshiring.");
    } finally {
      setBusy(false);
    }
  }

  const paymentColumns: TableColumn<StaffPayment>[] = [
    { key: "id", header: "To'lov ID", render: (p) => <span className="font-mono text-2xs text-ink">{p.id.slice(0, 10)}</span> },
    { key: "contractId", header: "Shartnoma", render: (p) => <span className="font-mono text-2xs text-muted">{p.contractId.slice(0, 10)}</span> },
    { key: "provider", header: "Provayder", render: (p) => <span className="text-xs text-ink">{p.provider}</span> },
    { key: "amount", header: "Summa", render: (p) => <span className="font-mono font-semibold text-ink">{formatMoney(p.amount)}</span> },
    { key: "status", header: "Holat", render: (p) => <Badge tone={TONE[p.status] ?? "neutral"}>{p.status}</Badge> },
    { key: "createdAt", header: "Sana", render: (p) => <span className="text-xs text-muted">{formatDate(p.createdAt)}</span> },
  ];
  const refundColumns: TableColumn<StaffRefund>[] = [
    { key: "id", header: "Qaytarish ID", render: (r) => <span className="font-mono text-2xs text-ink">{r.id.slice(0, 10)}</span> },
    { key: "contractId", header: "Shartnoma", render: (r) => <span className="font-mono text-2xs text-muted">{r.contractId.slice(0, 10)}</span> },
    { key: "amount", header: "Summa", render: (r) => <span className="font-mono font-semibold text-ink">{formatMoney(r.amount)}</span> },
    { key: "reason", header: "Sabab", render: (r) => <span className="text-xs text-muted truncate max-w-[200px] block">{r.reason}</span> },
    { key: "status", header: "Holat", render: (r) => <Badge tone={TONE[r.status] ?? "neutral"}>{r.status}</Badge> },
    { key: "createdAt", header: "Sana", render: (r) => <span className="text-xs text-muted">{formatDate(r.createdAt)}</span> },
  ];
  const payoutColumns: TableColumn<StaffPayout>[] = [
    { key: "id", header: "Chiqarish ID", render: (p) => <span className="font-mono text-2xs text-ink">{p.id.slice(0, 10)}</span> },
    { key: "sellerId", header: "Sotuvchi", render: (p) => <span className="font-mono text-2xs text-muted">{p.sellerId.slice(0, 10)}</span> },
    { key: "amount", header: "Summa", render: (p) => <span className="font-mono font-semibold text-ink">{formatMoney(p.amount)}</span> },
    { key: "status", header: "Holat", render: (p) => <Badge tone={TONE[p.status] ?? "neutral"}>{p.status}</Badge> },
    { key: "createdAt", header: "Sana", render: (p) => <span className="text-xs text-muted">{formatDate(p.createdAt)}</span> },
  ];
  const ledgerColumns: TableColumn<StaffLedgerTransaction>[] = [
    { key: "id", header: "Tranzaksiya ID", render: (t) => <span className="font-mono text-2xs text-ink">{t.id.slice(0, 10)}</span> },
    { key: "type", header: "Turi", render: (t) => <Badge tone="neutral">{t.type}</Badge> },
    {
      key: "entries",
      header: "Yozuvlar (debit/kredit)",
      render: (t) => (
        <div className="flex flex-col gap-0.5">
          {t.entries.map((e) => (
            <span key={e.id} className="font-mono text-2xs text-muted">
              {e.accountType}: {e.amount > 0 ? "+" : ""}
              {formatMoney(e.amount)}
            </span>
          ))}
        </div>
      ),
    },
    { key: "createdAt", header: "Sana", render: (t) => <span className="text-xs text-muted">{formatDate(t.createdAt)}</span> },
  ];

  const withdrawalColumns: TableColumn<WithdrawalRequest>[] = [
    { key: "id", header: "Ariza ID", render: (w) => <span className="font-mono text-2xs text-ink">{w.id.slice(0, 10)}</span> },
    {
      key: "user",
      header: "Mutaxassis",
      render: (w) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-ink">{w.userName}</span>
          <span className="font-mono text-2xs text-muted">{w.userId.slice(0, 8)}</span>
        </div>
      ),
    },
    {
      key: "card",
      header: "Karta / Tafsilot",
      render: (w) => <span className="text-xs text-ink">{w.cardDetails || "Plastik karta"}</span>,
    },
    { key: "amount", header: "Summa", render: (w) => <span className="font-mono font-semibold text-ink">{formatMoney(w.amount)}</span> },
    {
      key: "status",
      header: "Holat",
      render: (w) => {
        const tone: BadgeTone =
          w.status === "tasdiqlangan"
            ? "success"
            : w.status === "rad_etilgan"
              ? "danger"
              : "warning";
        const label =
          w.status === "tasdiqlangan"
            ? "O'tkazildi"
            : w.status === "rad_etilgan"
              ? "Rad etilgan"
              : "Kutilmoqda";
        return (
          <div className="flex flex-col gap-0.5">
            <Badge tone={tone}>{label}</Badge>
            {w.rejectionReason && <span className="text-2xs text-danger max-w-[150px] truncate" title={w.rejectionReason}>{w.rejectionReason}</span>}
          </div>
        );
      },
    },
    { key: "createdAt", header: "Sana", render: (w) => <span className="text-xs text-muted">{formatDate(w.createdAt)}</span> },
    {
      key: "actions",
      header: "Amal",
      render: (w) =>
        w.status === "kutilmoqda" || w.status === "korib_chiqilmoqda" ? (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="primary"
              disabled={withdrawalActionBusy}
              onClick={() => handleApproveWithdrawal(w)}
              className="px-2.5 py-1 text-2xs"
            >
              O&apos;tkazildi
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={withdrawalActionBusy}
              onClick={() => {
                setSelectedWithdrawal(w);
                setRejectReason("");
                setRejectError("");
                setRejectModalOpen(true);
              }}
              className="px-2.5 py-1 text-2xs text-danger hover:bg-danger/10"
            >
              Rad etish
            </Button>
          </div>
        ) : (
          <span className="text-2xs text-muted">{w.processedBy ? `${w.processedBy}` : "Yakunlangan"}</span>
        ),
    },
  ];

  const header = (
    <AdminPageHeader
      title="To'lovlar, Qaytarish & Chiqarish"
      description="Real to'lov/refund/payout monitoringi va mutaxassislarning Uzcard/Humo pul yechish arizalarini boshqarish."
    />
  );

  if (loadError) {
    return (
      <>
        {header}
        <ErrorState error={loadError} onRetry={load} />
      </>
    );
  }

  const activePage = tab === "payments" ? paymentPage : tab === "refunds" ? refundPage : tab === "payouts" ? (withdrawalPage ?? payoutPage) : ledgerPage;
  if (!activePage) {
    return (
      <>
        {header}
        <LoadingState message="To'lov ma'lumotlari yuklanmoqda..." />
      </>
    );
  }

  return (
    <>
      {header}

      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Joriy bo'limdagi yozuvlar" value={activePage.total} detail="Tanlangan bo'lim bo'yicha" />
      </section>

      <Card padding="md" className="mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex border-b border-line overflow-x-auto max-w-full pb-0.5">
            {(
              [
                { id: "payments", label: "To'lovlar" },
                { id: "refunds", label: "Qaytarishlar" },
                { id: "payouts", label: "Pul yechish arizalari (Payout)" },
                { id: "ledger", label: "Ledger (buxgalteriya)" },
              ] as { id: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`border-b-2 px-4 py-2 font-heading text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  tab === t.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === "refunds" && (
            <Button size="sm" onClick={() => setRefundOpen(true)}>
              + Qaytarish yaratish
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-4">
        {tab === "payments" &&
          (paymentPage && paymentPage.items.length ? (
            <>
              <Table columns={paymentColumns} rows={paymentPage.items} rowKey={(p) => p.id} />
              <Pagination currentPage={paymentPage.page} totalPages={paymentPage.totalPages} onPageChange={setCurrentPage} totalRows={paymentPage.total} rowsPerPage={paymentPage.perPage} onRowsPerPageChange={setRowsPerPage} />
            </>
          ) : (
            <Card className="py-12 text-center text-muted">To'lovlar topilmadi.</Card>
          ))}
        {tab === "refunds" &&
          (refundPage && refundPage.items.length ? (
            <>
              <Table columns={refundColumns} rows={refundPage.items} rowKey={(r) => r.id} />
              <Pagination currentPage={refundPage.page} totalPages={refundPage.totalPages} onPageChange={setCurrentPage} totalRows={refundPage.total} rowsPerPage={refundPage.perPage} onRowsPerPageChange={setRowsPerPage} />
            </>
          ) : (
            <Card className="py-12 text-center text-muted">Qaytarishlar topilmadi.</Card>
          ))}
        {tab === "payouts" && (
          <div className="flex flex-col gap-6">
            <div className="rounded-input border border-line bg-surface p-4">
              <h3 className="text-sm font-semibold text-ink">Mutaxassislarning pul yechish arizalari (Uzcard / Humo)</h3>
              <p className="mt-1 text-xs text-muted">
                Mutaxassislar tomonidan Uzcard yoki Humo kartalariga yechish uchun yuborilgan arizalar.
                Bank orqali ko&apos;rsatilgan kartaga pul o&apos;tkazilgach, &ldquo;O&apos;tkazildi&rdquo; tugmasini bosing.
              </p>
            </div>

            {withdrawalPage && withdrawalPage.items.length ? (
              <>
                <Table columns={withdrawalColumns} rows={withdrawalPage.items} rowKey={(w) => w.id} />
                <Pagination
                  currentPage={withdrawalPage.page}
                  totalPages={withdrawalPage.totalPages}
                  onPageChange={setCurrentPage}
                  totalRows={withdrawalPage.total}
                  rowsPerPage={withdrawalPage.perPage}
                  onRowsPerPageChange={setRowsPerPage}
                />
              </>
            ) : (
              <Card className="py-12 text-center text-muted">Kutilayotgan pul yechish arizalari mavjud emas.</Card>
            )}

            <div className="border-t border-line pt-6">
              <h4 className="text-xs font-semibold text-muted mb-1">Avtomatik Payout tizimi (Backend monitoring)</h4>
              <p className="mb-3 text-2xs text-muted">
                Real bank avtomatik payout rail integratsiyasi tanlangunga qadar funksiya xavfsiz o&apos;chirilgan (<code className="font-mono">PAYOUTS_ENABLED=false</code>).
              </p>
              {payoutPage && payoutPage.items.length ? (
                <Table columns={payoutColumns} rows={payoutPage.items} rowKey={(p) => p.id} />
              ) : (
                <p className="text-2xs text-faint italic">Avtomatik payout yozuvlari mavjud emas.</p>
              )}
            </div>
          </div>
        )}
        {tab === "ledger" &&
          (ledgerPage && ledgerPage.items.length ? (
            <>
              <Table columns={ledgerColumns} rows={ledgerPage.items} rowKey={(t) => t.id} />
              <Pagination currentPage={ledgerPage.page} totalPages={ledgerPage.totalPages} onPageChange={setCurrentPage} totalRows={ledgerPage.total} rowsPerPage={ledgerPage.perPage} onRowsPerPageChange={setRowsPerPage} />
            </>
          ) : (
            <Card className="py-12 text-center text-muted">Ledger tranzaksiyalari topilmadi.</Card>
          ))}
      </div>

      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Yangi qaytarish yaratish"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefundOpen(false)} disabled={busy}>
              Bekor qilish
            </Button>
            <Button variant="danger" loading={busy} onClick={handleCreateRefund}>
              Qaytarish yaratish
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            Summa har doim shartnomaning to'langan summasidan avtomatik olinadi — qo'lda kiritilmaydi. Faqat pre-settlement (faol, to'langan) shartnomalar uchun mumkin.
          </p>
          <Input label="Shartnoma ID" value={refundContractId} onChange={(e) => setRefundContractId(e.target.value)} />
          <Textarea label="Sabab" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={4} error={refundError} />
        </div>
      </Modal>

      <Modal
        open={rejectModalOpen}
        onClose={() => !withdrawalActionBusy && setRejectModalOpen(false)}
        title="Mablag' yechish so'rovini rad etish"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)} disabled={withdrawalActionBusy}>
              Bekor qilish
            </Button>
            <Button variant="danger" loading={withdrawalActionBusy} onClick={handleRejectWithdrawal}>
              Rad etish
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            {selectedWithdrawal?.userName} foydalanuvchisining {selectedWithdrawal && formatMoney(selectedWithdrawal.amount)} so&apos;m yechish arizasini rad etish sababini yozing. Ushbu sabab mutaxassisga ko&apos;rsatiladi.
          </p>
          <Textarea
            label="Rad etish sababi"
            placeholder="Masalan: Karta raqami noto'g'ri yoki karta bloklangan"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            error={rejectError}
          />
        </div>
      </Modal>
    </>
  );
}
