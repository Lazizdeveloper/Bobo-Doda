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
  getAdminCounters,
  approveWithdrawal,
  rejectWithdrawal,
  reviewWithdrawal,
  type AdminPage,
  type AdminCounters,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { adminErrorText } from "@/lib/admin-error-text";
import { formatDate, formatMoney } from "@/lib/format";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import type { WithdrawalRequest, TransactionRecord } from "@/lib/admin-types";
import type { Contract } from "@/lib/types";

export default function PaymentsPage() {
  const { toast } = useToast();
  /* Har tab o'z navbatidan yuklanadi — faol bo'lmagan tab so'rov qilmaydi. */
  const [withdrawalPage, setWithdrawalPage] = useState<AdminPage<WithdrawalRequest> | null>(null);
  const [paymentPage, setPaymentPage] = useState<AdminPage<Contract> | null>(null);
  const [transactionPage, setTransactionPage] = useState<AdminPage<TransactionRecord> | null>(null);
  const [financials, setFinancials] = useState<AdminCounters | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [tab, setTab] = useState<"withdrawals" | "payments" | "transactions">("withdrawals");
  const [search, setSearch] = useState("");
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection and Action States
  const [selectedReq, setSelectedReq] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  /* Qidiruv debounce bilan */
  const debouncedSearch = useDebouncedValue(search, 300);

  /* SERVER tomonida filtrlanadi va sahifalanadi. Faqat FAOL tab so'rov
     yuboradi — uchala ro'yxatni birdan tortib olishning ma'nosi yo'q.
     Moliyaviy jamilar agregat chaqiruvidan (`/admin/stats`).
     Xato bo'sh ro'yxatga aylantirilmaydi — admin ma'lumot yo'q deb
     o'ylamasligi kerak, ayniqsa pul ekranida. */
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

  const getWithdrawalStatusLabel = (status: string) => {
    const map: Record<string, { label: string; tone: BadgeTone }> = {
      kutilmoqda: { label: "Kutilmoqda", tone: "warning" },
      korib_chiqilmoqda: { label: "Ko'rilmoqda", tone: "neutral" },
      tasdiqlangan: { label: "Tasdiqlangan", tone: "success" },
      rad_etilgan: { label: "Rad etilgan", tone: "danger" },
    };
    return map[status] || { label: status, tone: "neutral" };
  };

  const withdrawalColumns: TableColumn<WithdrawalRequest>[] = [
    {
      key: "id",
      header: "So'rov ID",
      render: (w) => <span className="font-mono text-2xs text-ink">{w.id}</span>,
    },
    {
      key: "userName",
      header: "Foydalanuvchi",
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
      header: "Miqdor",
      render: (w) => <span className="font-mono font-semibold text-ink">{formatMoney(w.amount)}</span>,
    },
    {
      key: "card",
      header: "Karta ma'lumotlari",
      render: (w) => <span className="text-xs text-ink font-mono">{w.cardDetails}</span>,
    },
    {
      key: "status",
      header: "Holati",
      render: (w) => {
        const info = getWithdrawalStatusLabel(w.status);
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
                Tasdiqlash
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
              { id: "withdrawals", label: "Yechish so'rovlari" },
              { id: "payments", label: "Loyihalar to'lovlari" },
              { id: "transactions", label: "Ledger tranzaksiyalari" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id as "withdrawals" | "payments" | "transactions");
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
                  const info = getWithdrawalStatusLabel(w.status);
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

      {/* Tasdiqlash — pul harakati qaytarib bo'lmaydi, shuning uchun
          summa va karta oynada ko'rsatiladi */}
      <Modal
        open={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Yechib olish so'rovini tasdiqlash"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproveModalOpen(false)} disabled={actionLoading}>
              Bekor qilish
            </Button>
            <Button onClick={handleApprove} loading={actionLoading}>
              Tasdiqlash va yechish
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Tasdiqlangach summa foydalanuvchi hisobidan yechiladi va bu amalni
            qaytarib bo&apos;lmaydi.
          </p>
          <div className="flex flex-col gap-2 rounded-input border border-line bg-surface p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted">Foydalanuvchi</span>
              <span className="font-medium text-ink">{selectedReq?.userName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Summa</span>
              <span className="font-heading font-bold text-ink">
                {selectedReq ? formatMoney(selectedReq.amount) : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Karta</span>
              <span className="font-mono text-xs text-ink">{selectedReq?.cardDetails}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Manba</span>
              <span className="text-ink">
                {selectedReq?.source === "balance" ? "Xaridor balansi" : "Mutaxassis daromadi"}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
