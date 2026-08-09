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
import {
  getAdminData,
  approveWithdrawal,
  rejectWithdrawal,
  reviewWithdrawal,
} from "@/lib/api/admin";
import { formatDate, formatMoney } from "@/lib/format";
import type { WithdrawalRequest, TransactionRecord } from "@/lib/admin-types";
import type { Contract, Milestone } from "@/lib/types";

export default function PaymentsPage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [tab, setTab] = useState<"withdrawals" | "payments" | "transactions">("withdrawals");
  const [search, setSearch] = useState("");
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection and Action States
  const [selectedReq, setSelectedReq] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
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
  }, [search, tab]);

  const financials = useMemo(() => {
    if (!data) return { escrowTotal: 0, payoutsTotal: 0, commissionTotal: 0 };
    
    // Escrow balance = sum of funded active milestones
    // Payouts = sum of approved withdrawals
    // Commission = 10% of completed milestone value
    let milestones: Milestone[] = [];
    try {
      milestones = JSON.parse(localStorage.getItem("sb2_milestones") || "[]");
    } catch {
      milestones = [];
    }

    const escrow = milestones
      .filter((m) => ["mablaglangan", "topshirildi", "ozgartirish_soraldi"].includes(m.status))
      .reduce((sum: number, m) => sum + m.amount, 0);

    const completedTotal = milestones
      .filter((m) => m.status === "qabul_qilindi")
      .reduce((sum: number, m) => sum + m.amount, 0);

    const commissions = Math.round(completedTotal * 0.1); // 10% commission

    const payouts = data.withdrawals
      .filter((w) => w.status === "tasdiqlangan")
      .reduce((sum, w) => sum + w.amount, 0);

    return {
      escrowTotal: escrow,
      payoutsTotal: payouts,
      commissionTotal: commissions,
    };
  }, [data]);

  const filteredWithdrawals = useMemo(() => {
    if (!data) return [];
    return data.withdrawals.filter((w) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          w.userName.toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q) ||
          w.cardDetails.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, search]);

  const filteredPayments = useMemo(() => {
    if (!data) return [];
    return data.contracts.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.buyerName.toLowerCase().includes(q) ||
          c.sellerName.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, search]);

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((t) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          t.userName.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, search]);

  const paginatedWithdrawals = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredWithdrawals.slice(start, start + rowsPerPage);
  }, [filteredWithdrawals, currentPage, rowsPerPage]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredPayments.slice(start, start + rowsPerPage);
  }, [filteredPayments, currentPage, rowsPerPage]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredTransactions.slice(start, start + rowsPerPage);
  }, [filteredTransactions, currentPage, rowsPerPage]);

  const handleApprove = async (req: WithdrawalRequest) => {
    if (!confirm(`${req.userName} uchun ${req.amount.toLocaleString()} UZS miqdoridagi yechib olish so'rovini tasdiqlaysizmi?`)) return;
    setActionLoading(true);
    try {
      approveWithdrawal(req.id);
      load();
    } catch {
      alert("Xato yuz berdi");
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
      rejectWithdrawal(selectedReq.id, rejectionReason.trim());
      setRejectModalOpen(false);
      setSelectedReq(null);
      setRejectionReason("");
      load();
    } catch {
      alert("Xato yuz berdi");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePutUnderReview = async (req: WithdrawalRequest) => {
    setActionLoading(true);
    try {
      reviewWithdrawal(req.id);
      load();
    } catch {
      alert("Xato yuz berdi");
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
              <Button size="sm" variant="primary" onClick={() => handleApprove(w)} disabled={actionLoading}>
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

  if (!data) return <p className="text-muted font-sans">Yuklanmoqda...</p>;

  return (
    <>
      <AdminPageHeader
        title="To'lovlar va Escrow boshqaruvi"
        description="Escrow hamyon aylanmalari, tranzaksiyalar tarixi va mutaxassislarning pul yechish so'rovlari monitoringi."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Escrow'dagi faol mablag'" value={formatMoney(financials.escrowTotal)} detail="Hozirgi muzlatilgan loyihalar qiymati" tone="warning" />
        <MetricCard label="Yechib olingan jami mablag'" value={formatMoney(financials.payoutsTotal)} detail="Mutaxassislar yechib olgan summalar" tone="primary" />
        <MetricCard label="Tizim komissiyasi daromadi (10%)" value={formatMoney(financials.commissionTotal)} detail="Muvaffaqiyatli loyihalardan olingan foyda" tone="success" />
      </section>

      {/* Tabs and Controls */}
      <Card padding="md" className="mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex border-b border-line pb-0.5">
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
                className={`border-b-2 px-4 py-2 font-heading text-xs font-bold transition-all ${
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
          filteredWithdrawals.length ? (
            <>
              <Table
                columns={withdrawalColumns}
                rows={paginatedWithdrawals}
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
                          <Button size="sm" variant="primary" onClick={() => handleApprove(w)} disabled={actionLoading}>
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
                totalPages={Math.ceil(filteredWithdrawals.length / rowsPerPage)}
                onPageChange={setCurrentPage}
                totalRows={filteredWithdrawals.length}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          ) : (
            <Card className="py-12 text-center text-muted font-sans">{"Yechib olish so'rovlari topilmadi."}</Card>
          )
        )}

        {tab === "payments" && (
          filteredPayments.length ? (
            <>
              <Table
                columns={paymentColumns}
                rows={paginatedPayments}
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
                totalPages={Math.ceil(filteredPayments.length / rowsPerPage)}
                onPageChange={setCurrentPage}
                totalRows={filteredPayments.length}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          ) : (
            <Card className="py-12 text-center text-muted font-sans">{"Loyihalar ro'yxati topilmadi."}</Card>
          )
        )}

        {tab === "transactions" && (
          filteredTransactions.length ? (
            <>
              <Table
                columns={transactionColumns}
                rows={paginatedTransactions}
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
                totalPages={Math.ceil(filteredTransactions.length / rowsPerPage)}
                onPageChange={setCurrentPage}
                totalRows={filteredTransactions.length}
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
            <strong className="text-ink">{selectedReq?.userName}</strong>{" ning "}{selectedReq?.amount.toLocaleString()}{" UZS lik so'rovini rad etish sababini yozing."}
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
    </>
  );
}
