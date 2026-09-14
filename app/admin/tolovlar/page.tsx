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
import { Table, type TableColumn } from "@/components/ui/Table";
import {
  staffListPayments,
  staffListRefunds,
  staffCreateRefund,
  staffListPayouts,
  staffListLedgerTransactions,
  type StaffPayment,
  type StaffRefund,
  type StaffPayout,
  type StaffLedgerTransaction,
} from "@/lib/api/admin";
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
            ? staffListPayouts(query).then(setPayoutPage)
            : staffListLedgerTransactions(query).then(setLedgerPage);
    req.catch(setLoadError);
  }, [tab, currentPage, rowsPerPage]);

  useEffect(load, [load]);
  useEffect(() => {
    setCurrentPage(1);
  }, [tab, rowsPerPage]);

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

  const header = <AdminPageHeader title="To'lovlar, Qaytarish & Chiqarish" description="Real to'lov/refund/payout va append-only ledger monitoringi — qo'lda o'zgartirish tugmalari yo'q." />;

  if (loadError) {
    return (
      <>
        {header}
        <ErrorState error={loadError} onRetry={load} />
      </>
    );
  }

  const activePage = tab === "payments" ? paymentPage : tab === "refunds" ? refundPage : tab === "payouts" ? payoutPage : ledgerPage;
  if (!activePage) return <p className="text-muted">Yuklanmoqda...</p>;

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
                { id: "payouts", label: "Chiqarishlar (payout)" },
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

      {tab === "payouts" && (
        <p className="mt-3 text-2xs text-muted rounded-input border border-line bg-surface p-3">
          Real pul chiqarish yo'nalishi (bank/karta) hali tanlanmagan — funksiya xavfsiz o'chirilgan
          (<code className="font-mono">PAYOUTS_ENABLED=false</code>). Bu yerda faqat mavjud yozuvlar ko'rsatiladi.
        </p>
      )}

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
        {tab === "payouts" &&
          (payoutPage && payoutPage.items.length ? (
            <>
              <Table columns={payoutColumns} rows={payoutPage.items} rowKey={(p) => p.id} />
              <Pagination currentPage={payoutPage.page} totalPages={payoutPage.totalPages} onPageChange={setCurrentPage} totalRows={payoutPage.total} rowsPerPage={payoutPage.perPage} onRowsPerPageChange={setRowsPerPage} />
            </>
          ) : (
            <Card className="py-12 text-center text-muted">Chiqarish yozuvlari topilmadi.</Card>
          ))}
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
    </>
  );
}
