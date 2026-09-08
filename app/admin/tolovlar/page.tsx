"use client";

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
  listWithdrawalsQueue,
  listContractsQueue,
  listTransactionsQueue,
  listB2bPendingContracts,
  approveB2bPayment,
  rejectB2bPayment,
  getAdminCounters,
  approveWithdrawal,
  rejectWithdrawal,
  reviewWithdrawal,
  reverseTransaction,
  getCurrentAdmin,
  type AdminPage,
  type AdminCounters,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { adminErrorText } from "@/lib/admin-error-text";
import { formatDate, formatMoney } from "@/lib/format";
import { PLATFORM_FEE_PERCENT, platformFee, sellerNet } from "@/lib/fees";
import { COMPANY_BANK_DETAILS, generatePaymentReference } from "@/lib/company-bank-details";
import type { WithdrawalRequest, TransactionRecord, AdminAccount } from "@/lib/admin-types";
import type { Contract, ContractPaymentStatus, PayoutStatus } from "@/lib/types";

export default function PaymentsPage() {
  const { toast } = useToast();
  /* Har tab o'z navbatidan yuklanadi — faol bo'lmagan tab so'rov qilmaydi. */
  const [withdrawalPage, setWithdrawalPage] = useState<AdminPage<WithdrawalRequest> | null>(null);
  const [b2bPage, setB2bPage] = useState<AdminPage<Contract> | null>(null);
  const [paymentPage, setPaymentPage] = useState<AdminPage<Contract> | null>(null);
  const [transactionPage, setTransactionPage] = useState<AdminPage<TransactionRecord> | null>(null);
  const [financials, setFinancials] = useState<AdminCounters | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [tab, setTab] = useState<"withdrawals" | "b2b" | "payments" | "transactions">("withdrawals");
  const [search, setSearch] = useState("");
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection and Action States
  const [selectedReq, setSelectedReq] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);

  // B2B Actions
  const [selectedB2bContract, setSelectedB2bContract] = useState<Contract | null>(null);
  const [b2bApproveModalOpen, setB2bApproveModalOpen] = useState(false);
  const [b2bRejectModalOpen, setB2bRejectModalOpen] = useState(false);
  const [b2bRejectReason, setB2bRejectReason] = useState("");

  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Super Admin Reversal Action
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null);
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseError, setReverseError] = useState("");

  useEffect(() => {
    setCurrentAdmin(getCurrentAdmin());
  }, []);

  const handleReverseTx = async () => {
    if (!selectedTx) return;
    if (reverseReason.trim().length < 5) {
      setReverseError("Bekor qilish sababi kamida 5 ta belgidan iborat bo'lishi shart.");
      return;
    }
    setReverseLoading(true);
    setReverseError("");
    try {
      await reverseTransaction(selectedTx.id, reverseReason.trim());
      setReverseModalOpen(false);
      setSelectedTx(null);
      setReverseReason("");
      toast("Tranzaksiya bekor qilindi va kompensatsiya qayd etildi");
      load();
    } catch (err) {
      setReverseError(adminErrorText(err));
    } finally {
      setReverseLoading(false);
    }
  };


  /* Qidiruv debounce bilan */
  const debouncedSearch = useDebouncedValue(search, 300);

  /* SERVER tomonida filtrlanadi va sahifalanadi. Faqat FAOL tab so'rov
     yuboradi — barcha ro'yxatni birdan tortib olishning ma'nosi yo'q.
     Moliyaviy jamilar agregat chaqiruvidan (`/admin/stats`). */
  const load = useCallback(() => {
    setLoadError(null);
    const query = {
      page: currentPage,
      perPage: rowsPerPage,
      search: debouncedSearch,
    };
    const list =
      tab === "withdrawals"
        ? listWithdrawalsQueue(query).then(setWithdrawalPage)
        : tab === "b2b"
          ? listB2bPendingContracts(query).then(setB2bPage)
          : tab === "payments"
            ? listContractsQueue(query).then(setPaymentPage)
            : listTransactionsQueue(query).then(setTransactionPage);

    Promise.all([list, getAdminCounters().then(setFinancials)]).catch(setLoadError);
  }, [tab, currentPage, rowsPerPage, debouncedSearch]);

  useEffect(load, [load]);

  /* Tab yoki filtr o'zgarganda birinchi sahifaga qaytamiz */
  useEffect(() => {
    setCurrentPage(1);
  }, [tab, debouncedSearch, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, tab]);








  /* Brauzerning native `confirm()`/`alert()` i ATAYLAB ishlatilmaydi: u
     dizayn tizimidan tashqarida, tarjima qilinmaydi va summani formatlab
     ko'rsatolmaydi — pulni tasdiqlash oynasi uchun yaramaydi. */
  const handleApprove = async () => {
    if (!selectedReq) return;
    setActionLoading(true);
    try {
      await approveWithdrawal(selectedReq.id);
      setApproveModalOpen(false);
      setSelectedReq(null);
      toast("So'rov tasdiqlandi — mablag' hisobdan yechildi");
      load();
    } catch (err) {
      toast(adminErrorText(err), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReq) return;
    if (rejectionReason.trim().length < 5) {
      setActionError("Rad etish sababi kamida 5 ta belgidan iborat bo'lishi shart.");
      return;
    }
    setActionLoading(true);
    try {
      await rejectWithdrawal(selectedReq.id, rejectionReason.trim());
      setRejectModalOpen(false);
      setSelectedReq(null);
      setRejectionReason("");
      toast("So'rov rad etildi");
      load();
    } catch (err) {
      setActionError(adminErrorText(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePutUnderReview = async (req: WithdrawalRequest) => {
    setActionLoading(true);
    try {
      await reviewWithdrawal(req.id);
      load();
    } catch (err) {
      toast(adminErrorText(err), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveB2b = async () => {
    if (!selectedB2bContract) return;
    setActionLoading(true);
    try {
      await approveB2bPayment(selectedB2bContract.id);
      setB2bApproveModalOpen(false);
      setSelectedB2bContract(null);
      toast("Bank to'lovi tasdiqlandi! Shartnoma faollashdi va Escrow kafolatlandi.");
      load();
    } catch (err) {
      toast(adminErrorText(err), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectB2b = async () => {
    if (!selectedB2bContract) return;
    if (b2bRejectReason.trim().length < 5) {
      setActionError("Rad etish sababi kamida 5 ta belgidan iborat bo'lishi shart.");
      return;
    }
    setActionLoading(true);
    try {
      await rejectB2bPayment(selectedB2bContract.id, b2bRejectReason.trim());
      setB2bRejectModalOpen(false);
      setSelectedB2bContract(null);
      setB2bRejectReason("");
      toast("Bank to'lovi rad etildi va xaridorga xabar berildi.");
      load();
    } catch (err) {
      setActionError(adminErrorText(err));
    } finally {
      setActionLoading(false);
    }
  };

  const getContractPaymentStatusLabel = (c: Contract): { label: string; tone: BadgeTone } => {
    const status = c.paymentStatus || (c.b2bPending ? "pending_verification" : c.status === "faol" ? "payment_confirmed" : "awaiting_payment");
    const map: Record<ContractPaymentStatus, { label: string; tone: BadgeTone }> = {
      awaiting_payment: { label: "To'lov kutilmoqda (Awaiting Payment)", tone: "warning" },
      receipt_uploaded: { label: "Kvitansiya yuklandi (Receipt Uploaded)", tone: "info" },
      pending_verification: { label: "Tekshirilmoqda (Pending Verification)", tone: "warning" },
      payment_confirmed: { label: "Tasdiqlangan (Payment Confirmed)", tone: "success" },
      payment_rejected: { label: "Rad etilgan (Payment Rejected)", tone: "danger" },
      refund_pending: { label: "Qaytarish kutilmoqda (Refund Pending)", tone: "warning" },
      refunded: { label: "Qaytarildi (Refunded)", tone: "neutral" },
    };
    return map[status as ContractPaymentStatus] || { label: status, tone: "neutral" };
  };

  const b2bColumns: TableColumn<Contract>[] = [
    {
      key: "id",
      header: "Shartnoma / Order ID",
      render: (c) => (
        <div>
          <span className="font-mono font-bold text-xs text-ink block">#{c.id}</span>
          <span className="font-mono text-2xs font-semibold text-primary block">
            {c.paymentReference || generatePaymentReference(c.id)}
          </span>
        </div>
      ),
    },
    {
      key: "parties",
      header: "Taraflar",
      render: (c) => (
        <div className="text-2xs text-ink">
          <p><span className="text-muted">Xaridor:</span> <strong>{c.buyerName}</strong></p>
          <p><span className="text-muted">Mutaxassis:</span> {c.sellerName}</p>
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "Summa & Komissiya",
      render: (c) => (
        <div>
          <span className="font-mono font-bold text-ink text-sm block">{formatMoney(c.totalAmount)}</span>
          <span className="text-3xs text-muted block">
            {PLATFORM_FEE_PERCENT}% komissiya ({formatMoney(platformFee(c.totalAmount))})
          </span>
          <span className="text-3xs font-medium text-success block">
            Sof mutaxassis: {formatMoney(sellerNet(c.totalAmount))}
          </span>
        </div>
      ),
    },
    {
      key: "receipt",
      header: "To'lov cheki / Kvitansiya",
      render: (c) => {
        const receiptUrl = c.paymentReceiptUrl || c.b2bReceiptUrl;
        const receiptName = c.paymentReceiptName || c.b2bReceiptName;
        return receiptUrl ? (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={receiptName || `kvitansiya_${c.id}.pdf`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface hover:bg-surface-hover px-2 py-1 text-xs text-primary font-medium transition-colors"
          >
            <span>📎</span>
            <span className="truncate max-w-[130px]">{receiptName || "Kvitansiya fayli"}</span>
          </a>
        ) : (
          <span className="text-2xs text-muted italic">Biriktirilmagan</span>
        );
      },
    },
    {
      key: "status",
      header: "To'lov holati",
      render: (c) => {
        const info = getContractPaymentStatusLabel(c);
        return <Badge tone={info.tone}>{info.label}</Badge>;
      },
    },
    {
      key: "date",
      header: "Yuborilgan sana",
      render: (c) => (
        <span className="text-xs text-muted">
          {formatDate(c.paymentSubmittedAt || c.b2bSubmittedAt || c.createdAt)}
        </span>
      ),
    },
    {
      key: "action",
      header: "Amallar",
      render: (c) => {
        const isPending =
          c.paymentStatus === "pending_verification" ||
          c.b2bPending ||
          (c.status === "imzolangan" && Boolean(c.paymentReceiptUrl || c.b2bReceiptUrl));
        if (isPending) {
          return (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setSelectedB2bContract(c);
                  setB2bApproveModalOpen(true);
                }}
                disabled={actionLoading}
              >
                Tasdiqlash
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="text-danger border-danger/20 hover:bg-danger/10"
                onClick={() => {
                  setSelectedB2bContract(c);
                  setB2bRejectReason("");
                  setActionError("");
                  setB2bRejectModalOpen(true);
                }}
                disabled={actionLoading}
              >
                Rad etish
              </Button>
            </div>
          );
        }
        if (c.paymentStatus === "payment_confirmed" || c.status === "faol") {
          return (
            <div className="text-3xs text-muted">
              <span className="text-success font-medium">✓ Tasdiqlangan</span>
              {c.paymentVerifiedBy && <p>Operator: {c.paymentVerifiedBy}</p>}
            </div>
          );
        }
        if (c.paymentStatus === "payment_rejected") {
          return (
            <div className="text-3xs text-danger truncate max-w-[140px]" title={c.paymentRejectReason}>
              Rad sababi: {c.paymentRejectReason || "Tasdiqlanmadi"}
            </div>
          );
        }
        return <span className="text-2xs text-muted">—</span>;
      },
    },
  ];

  const getWithdrawalStatusLabel = (w: WithdrawalRequest) => {
    if (w.payoutStatus === "paid" || w.status === "tasdiqlangan") {
      return { label: "To'langan (Paid)", tone: "success" as BadgeTone };
    }
    if (w.payoutStatus === "payout_failed" || w.status === "rad_etilgan") {
      return { label: "Rad etilgan (Payout Failed)", tone: "danger" as BadgeTone };
    }
    if (w.payoutStatus === "payout_processing" || w.status === "korib_chiqilmoqda") {
      return { label: "Jarayonda (Payout Processing)", tone: "neutral" as BadgeTone };
    }
    return { label: "Kutilmoqda (Payout Pending)", tone: "warning" as BadgeTone };
  };

  const withdrawalColumns: TableColumn<WithdrawalRequest>[] = [
    {
      key: "id",
      header: "So'rov ID / Payout Ref",
      render: (w) => (
        <div>
          <span className="font-mono text-2xs text-ink font-bold block">{w.id}</span>
          <span className="font-mono text-3xs text-muted block">
            {w.payoutReference || `PAYOUT-${w.id.toUpperCase()}`}
          </span>
        </div>
      ),
    },
    {
      key: "userName",
      header: "Mutaxassis",
      render: (w) => (
        <div>
          <p className="font-semibold text-ink">{w.userName}</p>
          <Badge tone={w.userRole === "mutaxassis" ? "accent" : "primary"}>
            {w.userRole === "mutaxassis" ? "Mutaxassis" : "Xaridor"}
          </Badge>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Yechiladigan summa",
      render: (w) => <span className="font-mono font-bold text-ink text-sm">{formatMoney(w.amount)}</span>,
    },
    {
      key: "card",
      header: "To'lov vositasi (Rekvizitlar)",
      render: (w) => (
        w.payoutMethod === "bank_account" && w.bankAccount ? (
          <div className="text-2xs">
            <span className="font-mono font-bold text-ink block">🏦 {w.bankAccount.accountNumber}</span>
            <span className="text-muted block">MFO: {w.bankAccount.mfo} · {w.bankAccount.bankName}</span>
            <span className="text-muted block font-medium truncate max-w-[160px]">{w.bankAccount.recipientName}</span>
          </div>
        ) : (
          <span className="text-xs text-ink font-mono">💳 {w.cardDetails || "Plastik karta"}</span>
        )
      ),
    },
    {
      key: "status",
      header: "Payout holati",
      render: (w) => {
        const info = getWithdrawalStatusLabel(w);
        return <Badge tone={info.tone}>{info.label}</Badge>;
      },
    },
    {
      key: "createdAt",
      header: "Sana",
      render: (w) => <span className="text-xs text-muted">{formatDate(w.createdAt)}</span>,
    },
    {
      key: "action",
      header: "Amallar",
      render: (w) => {
        if (w.status === "kutilmoqda" || w.status === "korib_chiqilmoqda") {
          return (
            <div className="flex gap-1.5">
              {w.status === "kutilmoqda" && (
                <Button size="sm" variant="secondary" onClick={() => handlePutUnderReview(w)} disabled={actionLoading}>
                  {"Ko'rib chiqish"}
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={() => { setSelectedReq(w); setApproveModalOpen(true); }} disabled={actionLoading}>
                To&apos;lash (Paid)
              </Button>
              <Button size="sm" variant="secondary" className="text-danger border-danger/20 hover:bg-danger/10" onClick={() => {
                setSelectedReq(w);
                setRejectionReason("");
                setRejectModalOpen(true);
              }} disabled={actionLoading}>
                Rad etish
              </Button>
            </div>
          );
        }
        return (
          <div className="text-3xs text-muted">
            {w.processedBy && <p>Moderator: {w.processedBy}</p>}
            {w.rejectionReason && <p className="text-danger truncate max-w-[150px]">Sabab: {w.rejectionReason}</p>}
          </div>
        );
      },
    },
  ];

  const paymentColumns: TableColumn<Contract>[] = [
    {
      key: "id",
      header: "Shartnoma ID",
      render: (c) => <span className="font-mono text-2xs text-ink">{c.id}</span>,
    },
    {
      key: "title",
      header: "Loyiha",
      render: (c) => <span className="font-semibold text-ink truncate max-w-[150px] block">{c.title}</span>,
    },
    {
      key: "parties",
      header: "Taraflar",
      render: (c) => (
        <div className="text-2xs text-ink">
          <p><span className="text-muted">Xaridor:</span> {c.buyerName}</p>
          <p><span className="text-muted">Mutaxassis:</span> {c.sellerName}</p>
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "Escrow Byudjeti",
      render: (c) => <span className="font-mono text-ink font-semibold">{formatMoney(c.totalAmount)}</span>,
    },
    {
      key: "status",
      header: "Escrow holati",
      render: (c) => (
        <Badge tone={c.status === "faol" ? "success" : c.status === "yakunlangan" ? "neutral" : "warning"}>
          {c.status === "faol" ? "Mablag'langan" : c.status === "yakunlangan" ? "Ozod etilgan" : c.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Funded Sana",
      render: (c) => <span className="text-xs text-muted">{formatDate(c.createdAt)}</span>,
    },
  ];

  const transactionColumns: TableColumn<TransactionRecord>[] = [
    {
      key: "id",
      header: "Tranzaksiya ID",
      render: (t) => <span className="font-mono text-2xs text-ink">{t.id}</span>,
    },
    {
      key: "type",
      header: "Turi",
      render: (t) => {
        const typeMap: Record<string, { label: string; tone: BadgeTone }> = {
          deposit: { label: "To'lov (In)", tone: "success" },
          escrow_mablaglash: { label: "Escrow Lock", tone: "warning" },
          milestone_tolov: { label: "To'lov (Out)", tone: "accent" },
          refund: { label: "Qaytarish", tone: "danger" },
          yechish: { label: "Yechib olish", tone: "neutral" },
        };
        const info = typeMap[t.type] || { label: t.type, tone: "neutral" };
        return <Badge tone={info.tone}>{info.label}</Badge>;
      },
    },
    {
      key: "userName",
      header: "Foydalanuvchi",
      render: (t) => <span className="text-xs text-ink font-medium">{t.userName}</span>,
    },
    {
      key: "amount",
      header: "Summa",
      render: (t) => (
        <span className={`font-mono font-semibold ${["deposit", "milestone_tolov"].includes(t.type) ? "text-accent" : "text-ink"}`}>
          {formatMoney(t.amount)}
        </span>
      ),
    },
    {
      key: "desc",
      header: "Tavsif",
      render: (t) => <span className="text-2xs text-muted leading-tight block max-w-[200px] whitespace-normal">{t.description}</span>,
    },
    {
      key: "createdAt",
      header: "Sana",
      render: (t) => <span className="text-xs text-muted">{formatDate(t.createdAt)}</span>,
    },
    {
      key: "action",
      header: "Amal",
      render: (t) => {
        const isSuperAdmin = currentAdmin?.role === "super_admin";
        const isCancelled = t.status === "bekor_qilingan";
        if (isCancelled) {
          return <Badge tone="danger">Bekor qilingan</Badge>;
        }
        if (!isSuperAdmin) {
          return <span className="text-2xs text-muted">Tasdiqlangan</span>;
        }
        return (
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setSelectedTx(t);
              setReverseReason("");
              setReverseError("");
              setReverseModalOpen(true);
            }}
          >
            Bekor qilish
          </Button>
        );
      },
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
          title="To'lovlar va Escrow boshqaruvi"
          description="Escrow hamyon aylanmalari, tranzaksiyalar tarixi va mutaxassislarning pul yechish so'rovlari monitoringi."
        />
        <ErrorState error={loadError} onRetry={load} />
      </>
    );
  }

  if (!financials) return <p className="text-muted font-sans">Yuklanmoqda...</p>;

  return (
    <>
      <AdminPageHeader
        title="To'lovlar va Escrow boshqaruvi"
        description="Escrow hamyon aylanmalari, tranzaksiyalar tarixi va mutaxassislarning pul yechish so'rovlari monitoringi."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Escrow'dagi faol mablag'" value={formatMoney(financials.escrowTotal)} detail="Hozirgi muzlatilgan loyihalar qiymati" tone="warning" />
        <MetricCard label="Yechib olingan jami mablag'" value={formatMoney(financials.payoutsTotal)} detail="Mutaxassislar yechib olgan summalar" tone="primary" />
        <MetricCard label={`Tizim komissiyasi daromadi (${PLATFORM_FEE_PERCENT}%)`} value={formatMoney(financials.commissionTotal)} detail="Muvaffaqiyatli loyihalardan olingan foyda" tone="success" />
      </section>

      {/* Tabs and Controls */}
      <Card padding="md" className="mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex border-b border-line overflow-x-auto max-w-full pb-0.5">
            {[
              { id: "withdrawals", label: "Mutaxassis to'lovlari (Payouts)" },
              { id: "b2b", label: "Bank to'lovlari tekshiruvi (MVP)" },
              { id: "payments", label: "Loyihalar to'lovlari" },
              { id: "transactions", label: "Ledger tranzaksiyalari" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id as "withdrawals" | "b2b" | "payments" | "transactions");
                  setSearch("");
                }}
                className={`border-b-2 px-4 py-2 font-heading text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="w-full md:w-64">
            <Input
              aria-label="Qidirish"
              placeholder={
                tab === "withdrawals"
                  ? "Mutaxassis yoki karta bo'yicha..."
                  : tab === "b2b"
                    ? "Shartnoma ID, invoys yoki xaridor..."
                    : tab === "payments"
                      ? "Loyiha yoki foydalanuvchi..."
                      : "ID yoki tavsif bo'yicha..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Data tables */}
      <div className="mt-4">
        {tab === "withdrawals" && (
          (withdrawalPage?.items.length ?? 0) ? (
            <>
              <Table
                columns={withdrawalColumns}
                rows={withdrawalPage?.items ?? []}
                rowKey={(w) => w.id}
                renderMobileCard={(w) => {
                  const info = getWithdrawalStatusLabel(w);
                  return (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-ink">{w.userName}</p>
                          <p className="text-3xs text-muted font-mono">ID: {w.id}</p>
                        </div>
                        <Badge tone={info.tone}>{info.label}</Badge>
                      </div>
                      <div className="text-xs text-ink flex flex-col gap-1 border-y border-line/10 py-1.5 my-1">
                        <p><span className="text-muted">Miqdor:</span> <strong className="font-mono text-primary">{formatMoney(w.amount)}</strong></p>
                        <p><span className="text-muted">Karta:</span> <span className="font-mono">{w.cardDetails}</span></p>
                        <p><span className="text-muted">Sana:</span> {formatDate(w.createdAt)}</p>
                      </div>
                      {(w.status === "kutilmoqda" || w.status === "korib_chiqilmoqda") ? (
                        <div className="flex gap-2 justify-end">
                          {w.status === "kutilmoqda" && (
                            <Button size="sm" variant="secondary" onClick={() => handlePutUnderReview(w)} disabled={actionLoading}>
                              {"Ko'rib chiqish"}
                            </Button>
                          )}
                          <Button size="sm" variant="primary" onClick={() => { setSelectedReq(w); setApproveModalOpen(true); }} disabled={actionLoading}>
                            Tasdiqlash
                          </Button>
                          <Button size="sm" variant="secondary" className="text-danger border-danger/30" onClick={() => {
                            setSelectedReq(w);
                            setRejectionReason("");
                            setRejectModalOpen(true);
                          }} disabled={actionLoading}>
                            Rad etish
                          </Button>
                        </div>
                      ) : (
                        <div className="text-3xs text-muted text-right">
                          {w.processedBy && <span>Moderator: {w.processedBy}</span>}
                          {w.rejectionReason && <p className="text-danger">Rad sababi: {w.rejectionReason}</p>}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={withdrawalPage?.totalPages ?? 1}
                onPageChange={setCurrentPage}
                totalRows={withdrawalPage?.total ?? 0}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          ) : (
            <Card className="py-12 text-center text-muted font-sans">{"Yechib olish so'rovlari topilmadi."}</Card>
          )
        )}

        {tab === "b2b" && (
          (b2bPage?.items.length ?? 0) ? (
            <>
              <Table
                columns={b2bColumns}
                rows={b2bPage?.items ?? []}
                rowKey={(c) => c.id}
                renderMobileCard={(c) => (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-ink">#{c.id}</p>
                        <p className="text-3xs text-muted font-mono">INV-{c.id.toUpperCase()}-{new Date().getFullYear()}</p>
                      </div>
                      <Badge tone="warning">Bank to&apos;lovi kutilmoqda</Badge>
                    </div>
                    <div className="text-xs text-ink flex flex-col gap-1 border-y border-line/10 py-1.5 my-1">
                      <p><span className="text-muted">Xaridor:</span> <strong>{c.buyerName}</strong></p>
                      <p><span className="text-muted">Mutaxassis:</span> {c.sellerName}</p>
                      <p><span className="text-muted">Kutilayotgan summa:</span> <strong className="font-mono text-primary">{formatMoney(c.totalAmount)}</strong></p>
                      <p><span className="text-muted">Yuborilgan sana:</span> {formatDate(c.b2bSubmittedAt || c.createdAt)}</p>
                      {c.b2bReceiptUrl && (
                        <div className="pt-1">
                          <a
                            href={c.b2bReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={c.b2bReceiptName || `kvitansiya_${c.id}.pdf`}
                            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                          >
                            <span>📎</span> {c.b2bReceiptName || "To'lov kvitansiyasini yuklab olish"}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSelectedB2bContract(c);
                          setB2bApproveModalOpen(true);
                        }}
                        disabled={actionLoading}
                      >
                        Tasdiqlash
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-danger border-danger/30"
                        onClick={() => {
                          setSelectedB2bContract(c);
                          setB2bRejectReason("");
                          setActionError("");
                          setB2bRejectModalOpen(true);
                        }}
                        disabled={actionLoading}
                      >
                        Rad etish
                      </Button>
                    </div>
                  </div>
                )}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={b2bPage?.totalPages ?? 1}
                onPageChange={setCurrentPage}
                totalRows={b2bPage?.total ?? 0}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          ) : (
            <Card className="py-12 text-center text-muted font-sans">Bank o&apos;tkazmasi orqali to&apos;lov kutilayotgan shartnomalar mavjud emas.</Card>
          )
        )}

        {tab === "payments" && (
          (paymentPage?.items.length ?? 0) ? (
            <>
              <Table
                columns={paymentColumns}
                rows={paymentPage?.items ?? []}
                rowKey={(c) => c.id}
                renderMobileCard={(c) => (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-ink">{c.title}</p>
                      <Badge tone={c.status === "faol" ? "success" : c.status === "yakunlangan" ? "neutral" : "warning"}>
                        {c.status === "faol" ? "Mablag'langan" : c.status === "yakunlangan" ? "Ozod etilgan" : c.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-ink flex flex-col gap-1 border-t border-line/10 pt-2 my-1">
                      <p><span className="text-muted">ID:</span> <span className="font-mono">{c.id}</span></p>
                      <p><span className="text-muted">Xaridor:</span> {c.buyerName}</p>
                      <p><span className="text-muted">Mutaxassis:</span> {c.sellerName}</p>
                      <p><span className="text-muted">Summa:</span> <span className="font-mono font-semibold text-primary">{formatMoney(c.totalAmount)}</span></p>
                    </div>
                  </div>
                )}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={paymentPage?.totalPages ?? 1}
                onPageChange={setCurrentPage}
                totalRows={paymentPage?.total ?? 0}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          ) : (
            <Card className="py-12 text-center text-muted font-sans">{"Loyihalar ro'yxati topilmadi."}</Card>
          )
        )}

        {tab === "transactions" && (
          (transactionPage?.items.length ?? 0) ? (
            <>
              <Table
                columns={transactionColumns}
                rows={transactionPage?.items ?? []}
                rowKey={(t) => t.id}
                renderMobileCard={(t) => {
                  const typeMap: Record<string, string> = {
                    deposit: "Karta orqali to'ldirish",
                    escrow_mablaglash: "Escrow Blok",
                    milestone_tolov: "Mutaxassisga to'lov",
                    refund: "Qaytarish",
                    yechish: "Yechib olish",
                  };
                  return (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-ink">{t.userName}</p>
                          <p className="text-3xs text-muted font-mono">{t.id}</p>
                        </div>
                        <Badge tone={t.type === "deposit" ? "success" : t.type === "refund" ? "danger" : "neutral"}>
                          {typeMap[t.type] || t.type}
                        </Badge>
                      </div>
                      <div className="text-2xs text-muted leading-snug my-1 border-y border-line/10 py-1.5">
                        {t.description}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted">{formatDate(t.createdAt)}</span>
                        <strong className="font-mono text-ink text-sm">{formatMoney(t.amount)}</strong>
                      </div>
                      {currentAdmin?.role === "super_admin" && t.status !== "bekor_qilingan" && (
                        <Button
                          size="sm"
                          variant="danger"
                          className="mt-2 w-full"
                          onClick={() => {
                            setSelectedTx(t);
                            setReverseReason("");
                            setReverseError("");
                            setReverseModalOpen(true);
                          }}
                        >
                          Tranzaksiyani bekor qilish
                        </Button>
                      )}
                    </div>
                  );
                }}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={transactionPage?.totalPages ?? 1}
                onPageChange={setCurrentPage}
                totalRows={transactionPage?.total ?? 0}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          ) : (
            <Card className="py-12 text-center text-muted font-sans">Tranzaksiyalar tarixi topilmadi.</Card>
          )
        )}
      </div>

      {/* Reject Withdrawal Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Yechib olish so'rovini rad etish"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            <strong className="text-ink">{selectedReq?.userName}</strong>{" ning "}{selectedReq ? formatMoney(selectedReq.amount) : ""}{" lik so'rovini rad etish sababini yozing."}
          </p>

          <Textarea
            label="Rad etish sababi (Mutaxassisga ko'rinadi)"
            placeholder="Masalan: Karta raqami yaroqsiz yoki yuridik ism mos kelmadi..."
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              setActionError("");
            }}
            error={actionError}
            required
            maxLength={300}
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>Bekor qilish</Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectionReason.trim() || actionLoading}>
              Rad etishni tasdiqlash
            </Button>
          </div>
        </div>
      </Modal>

      {/* Tasdiqlash — Mutaxassis Payout o'tkazmasi (Manual Transfer) */}
      <Modal
        open={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Mutaxassis to'lovini tasdiqlash (Manual Payout)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproveModalOpen(false)} disabled={actionLoading}>
              Bekor qilish
            </Button>
            <Button onClick={handleApprove} loading={actionLoading} variant="primary">
              To&apos;lov o&apos;tkazildi va &quot;Paid&quot; deb belgilash
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="rounded-input border border-primary/20 bg-primary/5 p-3 text-xs text-ink leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 text-primary mb-1">
              <span>💳</span> Manual Bank / Karta Payout tartibi:
            </p>
            <p className="text-muted">
              Mutaxassisning ko&apos;rsatilgan bank hisob-raqamiga yoki kartasiga kompaniya bank ilovasi (Kapitalbank Business) orqali to&apos;lovni qo&apos;lda o&apos;tkazing. Pul o&apos;tkazilgach, ushbu tugmani bosish orqali so&apos;rov holatini <strong>&quot;Paid (To&apos;langan)&quot;</strong> ga o&apos;tkazing.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-input border border-line bg-surface p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted">Payout Ref ID</span>
              <span className="font-mono font-bold text-ink">
                {selectedReq?.payoutReference || (selectedReq ? `PAYOUT-${selectedReq.id.toUpperCase()}` : "—")}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Mutaxassis</span>
              <span className="font-semibold text-ink">{selectedReq?.userName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Sof yechiladigan summa</span>
              <span className="font-heading font-bold text-success text-base">
                {selectedReq ? formatMoney(selectedReq.amount) : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">To&apos;lov usuli</span>
              <span className="font-medium text-ink">
                {selectedReq?.payoutMethod === "bank_account" ? "Bank hisob-raqami (B2B Wire)" : "Plastik karta (Card Payout)"}
              </span>
            </div>
            {selectedReq?.payoutMethod === "bank_account" && selectedReq.bankAccount ? (
              <>
                <div className="flex justify-between gap-3 pt-1 border-t border-line/50">
                  <span className="text-muted">Hisob-raqam (H/r)</span>
                  <span className="font-mono text-xs font-bold text-primary">{selectedReq.bankAccount.accountNumber}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Bank va MFO</span>
                  <span className="text-xs text-ink">{selectedReq.bankAccount.bankName} (MFO: {selectedReq.bankAccount.mfo})</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Qabul qiluvchi</span>
                  <span className="text-xs font-semibold text-ink">{selectedReq.bankAccount.recipientName}</span>
                </div>
                {selectedReq.bankAccount.innOrPinfl && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">STIR / JSHSHIR</span>
                    <span className="font-mono text-xs text-ink">{selectedReq.bankAccount.innOrPinfl}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between gap-3 pt-1 border-t border-line/50">
                <span className="text-muted">Karta raqami</span>
                <span className="font-mono text-xs font-bold text-ink">{selectedReq?.cardDetails || "Karta"}</span>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Reject B2B Payment Modal */}
      <Modal
        open={b2bRejectModalOpen}
        onClose={() => setB2bRejectModalOpen(false)}
        title="Bank to'lovini rad etish (Payment Rejected)"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            <strong className="text-ink">{selectedB2bContract?.buyerName}</strong> tomonidan{" "}
            <strong className="text-ink">#{selectedB2bContract?.id}</strong> shartnoma bo&apos;yicha yuborilgan bank to&apos;lovini rad etish sababini tanlang yoki yozing.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {[
              "Bank hisobiga mablag' kelib tushmadi",
              "Kvitansiyadagi summa yoki rekvizitlar mos kelmadi",
              "To'lov topshirig'i nusxasi o'qib bo'lmaydigan holatda",
              "Bank to'lovi bekor qilingan yoki qaytarilgan",
            ].map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => {
                  setB2bRejectReason(reason);
                  setActionError("");
                }}
                className="text-3xs px-2 py-1 rounded bg-surface hover:bg-card-hover border border-line text-ink transition-colors"
              >
                + {reason}
              </button>
            ))}
          </div>

          <Textarea
            label="Rad etish sababi (Xaridorga darhol ko'rsatiladi)"
            placeholder="Masalan: Bank hisob raqamimizga ko'rsatilgan summa kelib tushmadi yoki kvitansiya rekvizitlari mos kelmadi..."
            value={b2bRejectReason}
            onChange={(e) => {
              setB2bRejectReason(e.target.value);
              setActionError("");
            }}
            error={actionError}
            required
            maxLength={400}
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setB2bRejectModalOpen(false)}>Bekor qilish</Button>
            <Button variant="danger" onClick={handleRejectB2b} disabled={!b2bRejectReason.trim() || actionLoading}>
              To&apos;lovni rad etish
            </Button>
          </div>
        </div>
      </Modal>

      {/* B2B Bank to'lovini tasdiqlash modali (MVP Escrow) */}
      <Modal
        open={b2bApproveModalOpen}
        onClose={() => setB2bApproveModalOpen(false)}
        title="Bank to'lovini tekshirish va tasdiqlash (MVP Escrow)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setB2bApproveModalOpen(false)} disabled={actionLoading}>
              Bekor qilish
            </Button>
            <Button onClick={handleApproveB2b} loading={actionLoading} variant="primary" className="font-bold">
              Bank tushumini tasdiqlash (Confirm Payment)
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted leading-relaxed">
            Kompaniyamiz hisob-raqamiga (<strong className="text-ink">{COMPANY_BANK_DETAILS.bankName}</strong>, H/r <strong className="font-mono text-ink">{COMPANY_BANK_DETAILS.accountNumber}</strong>, MFO <strong className="font-mono text-ink">{COMPANY_BANK_DETAILS.mfo}</strong>) ushbu summa tushganini tasdiqlaysizmi?
          </p>

          <div className="flex flex-col gap-2.5 rounded-input border border-line bg-surface p-3 text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-muted">Order ID / Reference</span>
              <span className="font-mono font-bold text-primary text-sm">
                {selectedB2bContract?.paymentReference || (selectedB2bContract ? generatePaymentReference(selectedB2bContract.id) : "—")}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Shartnoma ID</span>
              <span className="font-mono font-semibold text-ink">#{selectedB2bContract?.id}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Xaridor (To&apos;lovchi)</span>
              <span className="font-semibold text-ink">{selectedB2bContract?.buyerName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Mutaxassis (Ijrochi)</span>
              <span className="font-semibold text-ink">{selectedB2bContract?.sellerName}</span>
            </div>
            <div className="flex justify-between gap-3 pt-1 border-t border-line/60">
              <span className="text-muted font-medium">Kutilayotgan summa (Gross)</span>
              <span className="font-heading font-bold text-ink text-sm">
                {selectedB2bContract ? formatMoney(selectedB2bContract.totalAmount) : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Platforma komissiyasi ({PLATFORM_FEE_PERCENT}%)</span>
              <span className="font-mono text-muted">
                {selectedB2bContract ? formatMoney(platformFee(selectedB2bContract.totalAmount)) : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted font-medium">Mutaxassisning sof ulushi (Net)</span>
              <span className="font-heading font-bold text-success text-sm">
                {selectedB2bContract ? formatMoney(sellerNet(selectedB2bContract.totalAmount)) : "—"}
              </span>
            </div>
            {(selectedB2bContract?.paymentReceiptUrl || selectedB2bContract?.b2bReceiptUrl) && (
              <div className="flex justify-between items-center gap-3 pt-1.5 border-t border-line/60">
                <span className="text-muted font-medium">To&apos;lov cheki / Kvitansiya</span>
                <a
                  href={selectedB2bContract.paymentReceiptUrl || selectedB2bContract.b2bReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={selectedB2bContract.paymentReceiptName || selectedB2bContract.b2bReceiptName || `kvitansiya_${selectedB2bContract.id}.pdf`}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1.5 bg-card px-2.5 py-1 rounded border border-line"
                >
                  <span>📎</span> {selectedB2bContract.paymentReceiptName || selectedB2bContract.b2bReceiptName || "Chekni ko'rish"}
                </a>
              </div>
            )}
            {selectedB2bContract?.paymentNotes && (
              <div className="pt-1.5 border-t border-line/60">
                <span className="text-muted block text-3xs uppercase tracking-wider font-semibold">Xaridor izohi / Tranzaksiya ma&apos;lumoti:</span>
                <p className="mt-0.5 text-ink bg-card p-2 rounded border border-line/50 text-2xs">
                  {selectedB2bContract.paymentNotes}
                </p>
              </div>
            )}
            <div className="flex justify-between gap-3 pt-1 border-t border-line/60 text-3xs text-muted">
              <span>Yuborilgan sana:</span>
              <span>{formatDate(selectedB2bContract?.paymentSubmittedAt || selectedB2bContract?.b2bSubmittedAt || selectedB2bContract?.createdAt || new Date().toISOString())}</span>
            </div>
          </div>

          <div className="rounded-input bg-success/10 border border-success/30 p-2.5 text-2xs text-success-deep flex items-start gap-2">
            <span>✅</span>
            <p>
              Tasdiqlangach, to&apos;lov holati <strong>&quot;Payment Confirmed&quot;</strong> ga o&apos;tadi, shartnoma <strong>faollashadi</strong> va mutaxassis ishga kirishishi mumkin bo&apos;ladi.
            </p>
          </div>
        </div>
      </Modal>

      {/* Super Admin Tranzaksiyani bekor qilish modali */}
      <Modal
        open={reverseModalOpen}
        onClose={() => {
          if (!reverseLoading) {
            setReverseModalOpen(false);
            setSelectedTx(null);
          }
        }}
        title="Tranzaksiyani majburiy bekor qilish (Super Admin)"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger-deep">
            <strong>DIQQAT:</strong> Ushbu amal tranzaksiyani bekor qiladi va foydalanuvchi hisobiga
            kompensatsiya tranzaksiyasini yozadi. Amal bevosita audit logiga muhrlanadi.
          </div>
          {selectedTx && (
            <div className="rounded-lg border border-line bg-surface p-3 text-xs space-y-1">
              <div><span className="text-muted">ID:</span> <span className="font-mono">{selectedTx.id}</span></div>
              <div><span className="text-muted">Foydalanuvchi:</span> <span className="font-semibold">{selectedTx.userName}</span></div>
              <div><span className="text-muted">Summa:</span> <span className="font-mono font-bold text-ink">{formatMoney(selectedTx.amount)}</span></div>
              <div><span className="text-muted">Turi:</span> <span>{selectedTx.type}</span></div>
              <div><span className="text-muted">Tavsif:</span> <span>{selectedTx.description}</span></div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              Bekor qilish sababi (majburiy, audit uchun):
            </label>
            <Textarea
              rows={3}
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="Masalan: Bank xatosi, firibgarlik shubhasi, foydalanuvchi roziligi bilan manual refund..."
            />
            {reverseError && (
              <p className="mt-1 text-2xs font-semibold text-danger-deep">{reverseError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={reverseLoading}
              onClick={() => {
                setReverseModalOpen(false);
                setSelectedTx(null);
              }}
            >
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              disabled={reverseLoading || !reverseReason.trim()}
              onClick={handleReverseTx}
            >
              {reverseLoading ? "Bajarilmoqda..." : "Tasdiqlash & Bekor qilish"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
