"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getAdminData, forceCloseContract } from "@/lib/api/admin";
import { formatDate, formatMoney } from "@/lib/format";
import type { Dispute, Milestone } from "@/lib/types";
import { InternalNotesWidget } from "@/components/admin/InternalNotesWidget";

export default function DisputesCenterPage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ochiq" | "korib_chiqilmoqda" | "hal_qilindi">("ochiq");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection & Resolution States
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionType, setResolutionType] = useState<"refund" | "payout" | "split" | null>(null);
  const [buyerRefundAmount, setBuyerRefundAmount] = useState<string>("");
  const [resolutionNote, setResolutionNote] = useState("");
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
    if (!data) return { total: 0, open: 0, closed: 0 };
    const list = data.disputes;
    return {
      total: list.length,
      open: list.filter((d) => d.status !== "hal_qilindi").length,
      closed: list.filter((d) => d.status === "hal_qilindi").length,
    };
  }, [data]);

  const filteredDisputes = useMemo(() => {
    if (!data) return [];
    return data.disputes.filter((d) => {
      // 1. Status Filter
      if (statusFilter === "ochiq" && d.status === "hal_qilindi") return false;
      if (statusFilter === "hal_qilindi" && d.status !== "hal_qilindi") return false;
      if (statusFilter !== "all" && statusFilter !== "ochiq" && d.status !== statusFilter) return false;

      // 2. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const contract = data.contracts.find((c) => c.id === d.contractId);
        return (
          d.id.toLowerCase().includes(q) ||
          d.contractId.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          contract?.title.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [data, statusFilter, search]);

  const paginatedDisputes = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredDisputes.slice(start, start + rowsPerPage);
  }, [filteredDisputes, currentPage, rowsPerPage]);

  const disputeContractData = useMemo(() => {
    if (!selectedDispute || !data) return null;
    const contract = data.contracts.find((c) => c.id === selectedDispute.contractId);
    if (!contract) return null;

    // Get milestones for this contract
    // We can read directly from localStorage since API doesn't expose milestone reader for admin
    let milestones: Milestone[] = [];
    try {
      milestones = JSON.parse(localStorage.getItem("sb2_milestones") || "[]")
        .filter((m: Milestone) => m.contractId === contract.id);
    } catch {
      milestones = [];
    }

    const escrowFunds = milestones
      .filter((m) => ["mablaglangan", "topshirildi", "ozgartirish_soraldi", "qabul_qilindi"].includes(m.status))
      .reduce((sum, m) => sum + m.amount, 0);

    const activeEscrow = milestones
      .filter((m) => ["mablaglangan", "topshirildi", "ozgartirish_soraldi"].includes(m.status))
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      contract,
      milestones,
      escrowFunds,
      activeEscrow,
    };
  }, [selectedDispute, data]);

  const handleResolve = async () => {
    if (!selectedDispute || !disputeContractData || !resolutionType) return;
    if (resolutionNote.trim().length < 10) {
      setActionError("Qaror asosi va izohi kamida 10 ta belgidan iborat bo'lishi shart.");
      return;
    }

    let splitAmt: number | undefined = undefined;
    if (resolutionType === "split") {
      const amt = parseFloat(buyerRefundAmount);
      if (isNaN(amt) || amt < 0 || amt > disputeContractData.activeEscrow) {
        setActionError(`Xaridorga qaytarish summasi 0 va ${disputeContractData.activeEscrow.toLocaleString()} UZS oralig'ida bo'lishi kerak.`);
        return;
      }
      splitAmt = amt;
    }

    setActionLoading(true);
    setActionError("");
    try {
      // 1. Force close the contract
      forceCloseContract(selectedDispute.contractId, resolutionType, resolutionNote.trim(), splitAmt);
      
      // 2. Resolve the dispute record in admin-api
      // Let's resolve the dispute itself
      try {
        const disputes = JSON.parse(localStorage.getItem("sb2_disputes") || "[]");
        const next = disputes.map((item: Dispute) =>
          item.id === selectedDispute.id ? { ...item, status: "hal_qilindi" as const } : item
        );
        localStorage.setItem("sb2_disputes", JSON.stringify(next));
      } catch {}

      setSelectedDispute(null);
      setResolutionType(null);
      setBuyerRefundAmount("");
      setResolutionNote("");
      load();
    } catch {
      setActionError("Nizoni hal qilishda xatolik yuz berdi.");
    } finally {
      setActionLoading(false);
    }
  };

  const reasonLabel = (reason: string) => {
    const map: Record<string, string> = {
      scope: "Ish hajmi o'zgarishi",
      quality: "Ish sifati qoniqarsiz",
      deadline: "Muddat buzilishi",
      payment: "To'lov muammosi",
      communication: "Aloqa uzilishi",
      other: "Boshqa sabab",
    };
    return map[reason] || reason;
  };

  const columns: TableColumn<Dispute>[] = [
    {
      key: "id",
      header: "Nizo ID",
      render: (d) => <span className="font-mono text-xs text-ink">{d.id}</span>,
    },
    {
      key: "contract",
      header: "Shartnoma",
      render: (d) => {
        const contract = data?.contracts.find((c) => c.id === d.contractId);
        return (
          <div>
            <p className="font-semibold text-ink truncate max-w-[200px]">{contract?.title || d.contractId}</p>
            <p className="text-3xs text-muted">ID: {d.contractId}</p>
          </div>
        );
      },
    },
    {
      key: "parties",
      header: "Taraflar",
      render: (d) => {
        const contract = data?.contracts.find((c) => c.id === d.contractId);
        return (
          <span className="text-xs text-ink">
            {contract?.buyerName || "Buyurtmachi"} ↔ {contract?.sellerName || "Mutaxassis"}
          </span>
        );
      },
    },
    {
      key: "reason",
      header: "Nizo sababi",
      render: (d) => <span className="text-xs text-ink font-medium">{reasonLabel(d.reason)}</span>,
    },
    {
      key: "createdAt",
      header: "Ochilgan sana",
      render: (d) => <span className="text-xs text-muted">{formatDate(d.createdAt)}</span>,
    },
    {
      key: "status",
      header: "Holati",
      render: (d) => (
        <Badge tone={d.status === "hal_qilindi" ? "success" : "warning"}>
          {d.status === "hal_qilindi" ? "Hal qilindi" : "Ochiq"}
        </Badge>
      ),
    },
    {
      key: "action",
      header: "Ko'rib chiqish",
      render: (d) => (
        <Button size="sm" variant="secondary" onClick={() => {
          setSelectedDispute(d);
          setResolutionType(null);
          setBuyerRefundAmount("");
          setResolutionNote("");
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
        title="Nizolar markazi"
        description="Shartnomalar bo'yicha escrow va sifat kelishmovchiliklarini ko'rib chiqish, pul qaytarish va to'lov qarorlari."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Jami Nizolar" value={stats.total} detail="Barcha nizo ishlari" />
        <MetricCard label="Ochiq Nizolar" value={stats.open} detail="Tezkor e'tibor talab etiladi" tone="warning" />
        <MetricCard label="Yopilgan / Hal etilgan" value={stats.closed} detail="Yakunlangan arbitraj qarorlari" tone="success" />
      </section>

      {/* Filters and Search */}
      <Card padding="md" className="mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[150px]">
              <select
                aria-label="Holat bo'yicha filtr"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "ochiq" | "hal_qilindi")}
                className="w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-primary"
              >
                <option value="ochiq">{"Ochiq nizolar (Active)"}</option>
                <option value="hal_qilindi">Hal qilingan nizolar</option>
                <option value="all">Barcha nizolar</option>
              </select>
            </div>
            <div className="w-full sm:w-64">
              <Input
                aria-label="Qidirish"
                placeholder="Dispute/Contract ID bo'yicha qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Disputes Table */}
      <div className="mt-4">
        {filteredDisputes.length ? (
          <>
            <Table
              columns={columns}
              rows={paginatedDisputes}
              rowKey={(d) => d.id}
              renderMobileCard={(d) => {
                const contract = data.contracts.find((c) => c.id === d.contractId);
                return (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{contract?.title || d.contractId}</p>
                      <p className="text-3xs text-muted">Dispute ID: {d.id}</p>
                      <p className="text-xs text-ink mt-1 font-medium">
                        {contract?.buyerName} ↔ {contract?.sellerName}
                      </p>
                      <p className="text-xs text-ink mt-1 font-semibold text-primary">
                        Sabab: {reasonLabel(d.reason)}
                      </p>
                      <p className="text-xs text-muted mt-1">Ochildi: {formatDate(d.createdAt)}</p>
                      <div className="mt-2.5">
                        <Badge tone={d.status === "hal_qilindi" ? "success" : "warning"}>
                          {d.status === "hal_qilindi" ? "Hal qilindi" : "Ochiq"}
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => {
                      setSelectedDispute(d);
                      setResolutionType(null);
                      setBuyerRefundAmount("");
                      setResolutionNote("");
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
              totalPages={Math.ceil(filteredDisputes.length / rowsPerPage)}
              onPageChange={setCurrentPage}
              totalRows={filteredDisputes.length}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </>
        ) : (
          <Card className="py-12 text-center text-muted">Bunday nizolar topilmadi.</Card>
        )}
      </div>

      {/* Dispute Review Modal */}
      <Modal
        open={!!selectedDispute}
        onClose={() => setSelectedDispute(null)}
        title="Nizo ishi arbitraji"
      >
        {selectedDispute && disputeContractData && (
          <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Contract Context */}
            <div className="border-b border-line pb-3">
              <p className="text-2xs text-muted font-semibold uppercase">Shartnoma nomi</p>
              <h3 className="font-heading text-sm font-bold text-ink">{disputeContractData.contract.title}</h3>
              <p className="text-3xs text-muted mt-0.5">ID: {selectedDispute.contractId}</p>

              <div className="mt-2.5 grid grid-cols-2 gap-3 text-xs text-ink bg-card-hover p-2.5 rounded-input border border-line/20">
                <div>
                  <span className="text-muted">Buyurtmachi: </span>
                  <span className="font-semibold">{disputeContractData.contract.buyerName}</span>
                </div>
                <div>
                  <span className="text-muted">Mutaxassis: </span>
                  <span className="font-semibold">{disputeContractData.contract.sellerName}</span>
                </div>
                <div>
                  <span className="text-muted">Jami Escrow: </span>
                  <span className="font-semibold font-mono text-primary">{formatMoney(disputeContractData.escrowFunds)}</span>
                </div>
                <div>
                  <span className="text-muted">Muzlatilgan faol escrow: </span>
                  <span className="font-semibold font-mono text-warning">{formatMoney(disputeContractData.activeEscrow)}</span>
                </div>
              </div>
            </div>

            {/* Dispute Complaint Info */}
            <div className="border-b border-line pb-3">
              <div className="flex justify-between items-center">
                <span className="text-2xs text-muted font-semibold uppercase">Nizo arizasi</span>
                <span className="text-2xs text-muted">{formatDate(selectedDispute.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-ink font-semibold text-primary">
                Nizo sababi: {reasonLabel(selectedDispute.reason)}
              </p>
              <p className="mt-1.5 text-xs text-muted bg-card-hover p-2.5 rounded border border-line/10 leading-relaxed italic whitespace-pre-wrap">
                &quot;{selectedDispute.description}&quot;
              </p>
              {selectedDispute.evidence.length > 0 && (
                <div className="mt-2.5">
                  <p className="text-2xs text-muted font-semibold uppercase mb-1">Biriktirilgan dalillar ({selectedDispute.evidence.length} ta fayl)</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedDispute.evidence.map((ev, i) => (
                      <span key={i} className="text-3xs bg-line/20 text-ink px-2 py-1 rounded font-mono border border-line/30">
                        dalil_{i + 1}.png
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Milestones Breakdown */}
            <div className="border-b border-line pb-3">
              <p className="text-2xs text-muted font-semibold uppercase mb-1.5">Bosqichlar (Milestones) holati</p>
              <div className="max-h-32 overflow-y-auto divide-y divide-line border border-line rounded bg-card">
                {disputeContractData.milestones.map((m) => (
                  <div key={m.id} className="p-2 flex items-center justify-between text-2xs">
                    <span className="font-medium text-ink truncate max-w-[150px]">{m.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-ink">{formatMoney(m.amount)}</span>
                      <Badge tone={m.status === "qabul_qilindi" ? "neutral" : m.status === "mablaglangan" ? "success" : "warning"}>
                        {m.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Private Operator Notes */}
            <InternalNotesWidget targetId={selectedDispute.id} targetType="dispute" />

            {/* Arbitrage controls if open */}
            {selectedDispute.status !== "hal_qilindi" && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-2xs text-muted font-semibold uppercase mb-1.5">Arbitraj qarori</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: "refund", label: "Qaytarish (Refund)" },
                      { type: "payout", label: "To'lash (Payout)" },
                      { type: "split", label: "Bo'lib to'lash" },
                    ].map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => {
                          setResolutionType(opt.type as "refund" | "payout" | "split");
                          setActionError("");
                        }}
                        className={`border rounded-input px-2 py-2 text-3xs font-bold transition-all uppercase tracking-wider ${
                          resolutionType === opt.type
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-line bg-card hover:border-muted text-ink"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {resolutionType === "split" && (
                  <div className="bg-card-hover border border-line p-2.5 rounded-input">
                    <label className="text-2xs font-semibold text-muted block mb-1">Xaridorga qaytarish summasi (UZS)</label>
                    <Input
                      aria-label="Qaytariladigan summa"
                      type="number"
                      placeholder={`Maks: ${disputeContractData.activeEscrow}`}
                      value={buyerRefundAmount}
                      onChange={(e) => {
                        setBuyerRefundAmount(e.target.value);
                        setActionError("");
                      }}
                    />
                    {buyerRefundAmount && !isNaN(parseFloat(buyerRefundAmount)) && (
                      <p className="text-3xs text-muted mt-1.5 leading-none">
                        {"Mutaxassisga o'tadigan summa:"}{" "}
                        <span className="font-semibold text-accent font-mono">
                          {Math.max(0, disputeContractData.activeEscrow - parseFloat(buyerRefundAmount)).toLocaleString()} UZS
                        </span>
                      </p>
                    )}
                  </div>
                )}

                <Textarea
                  label="Qaror asosi va yechim izohi (Taraflarga va auditga yuboriladi)"
                  placeholder="Escrow mablag'larini taqsimlash qarori bo'yicha..."
                  value={resolutionNote}
                  onChange={(e) => {
                    setResolutionNote(e.target.value);
                    setActionError("");
                  }}
                  error={actionError}
                  required
                  maxLength={1000}
                />

                <div className="border-t border-line pt-3 mt-1 grid grid-cols-2 gap-2">
                  <Button variant="ghost" className="justify-center" onClick={() => setSelectedDispute(null)}>
                    Bekor qilish
                  </Button>
                  <Button variant="primary" className="justify-center" onClick={handleResolve} disabled={!resolutionType || !resolutionNote.trim() || actionLoading}>
                    Qarorni tasdiqlash
                  </Button>
                </div>
              </div>
            )}

            {/* If resolved */}
            {selectedDispute.status === "hal_qilindi" && (
              <div className="border-t border-line pt-3 text-center">
                <p className="text-2xs text-muted">
                  Ushbu nizo ishi hal qilingan.
                </p>
                {/* Try to show resolved notes from localStorage */}
                {(() => {
                  try {
                    const notes = JSON.parse(localStorage.getItem("sb2_admin_case_notes") || "{}");
                    const noteText = notes[selectedDispute.contractId];
                    if (noteText) {
                      return (
                        <div className="mt-2 text-2xs text-ink bg-card-hover p-2.5 rounded text-left border border-line/20">
                          <p className="font-semibold text-muted">Hukm qaydlari:</p>
                          <p className="mt-0.5 whitespace-pre-wrap">{noteText}</p>
                        </div>
                      );
                    }
                  } catch {}
                  return null;
                })()}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
