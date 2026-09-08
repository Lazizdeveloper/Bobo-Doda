"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Table, type TableColumn } from "@/components/ui/Table";
import {
  listDisputesQueue,
  getDisputeContext,
  forceCloseContract,
  findDisputeById,
  type AdminPage,
  type AdminDisputeRow,
} from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useAdminDeepLink } from "@/lib/hooks/useAdminDeepLink";
import { adminErrorText } from "@/lib/admin-error-text";
import { formatDate, formatMoney } from "@/lib/format";
import type { Contract, Milestone, Message } from "@/lib/types";
import { messagesService } from "@/lib/api/messages";
import { InternalNotesWidget } from "@/components/admin/InternalNotesWidget";

export default function DisputesCenterPage() {
  const [page, setPage] = useState<AdminPage<AdminDisputeRow> | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ochiq" | "korib_chiqilmoqda" | "hal_qilindi">("ochiq");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection & Resolution States
  const [selectedDispute, setSelectedDispute] = useState<AdminDisputeRow | null>(null);

  /* Global qidiruvdan kelgan deep-link — yozuvni topib ochadi */
  useAdminDeepLink("disputeId", findDisputeById, setSelectedDispute);
  const [resolutionType, setResolutionType] = useState<"refund" | "payout" | "split" | null>(null);
  const [buyerRefundAmount, setBuyerRefundAmount] = useState<string>("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  /* Qidiruv debounce bilan */
  const debouncedSearch = useDebouncedValue(search, 300);

  /* SERVER tomonida filtrlanadi va sahifalanadi. */
  const load = useCallback(() => {
    setLoadError(null);
    listDisputesQueue({
      page: currentPage,
      perPage: rowsPerPage,
      search: debouncedSearch,
      status: statusFilter,
    })
      .then(setPage)
      .catch(setLoadError);
  }, [currentPage, rowsPerPage, debouncedSearch, statusFilter]);

  useEffect(load, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, rowsPerPage]);

  /* KPI — faset sanoqlaridan */
  const facets = page?.facets ?? {};
  const stats = {
    total: facets._all ?? 0,
    open: (facets.ochiq ?? 0) + (facets.korib_chiqilmoqda ?? 0),
    closed: facets.hal_qilindi ?? 0,
  };


  /* Nizo konteksti (shartnoma + bosqichlar) ALOHIDA chaqiruv bilan —
     sahifada endi faqat bitta sahifa nizolari bor, shartnomalar yo'q.
     Backend: `GET /admin/contracts/:id` + bosqichlari. */
  const [disputeContractData, setDisputeContractData] = useState<{
    contract: Contract;
    milestones: Milestone[];
    escrowFunds: number;
    activeEscrow: number;
  } | null>(null);

  const [disputeMessages, setDisputeMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    if (!selectedDispute) {
      setDisputeContractData(null);
      setDisputeMessages([]);
      return;
    }
    let cancelled = false;
    getDisputeContext(selectedDispute.contractId)
      .then(({ contract, milestones }) => {
        if (cancelled) return;
        if (!contract) {
          setDisputeContractData(null);
          return;
        }
        const escrowFunds = milestones
          .filter((m) =>
            ["mablaglangan", "topshirildi", "ozgartirish_soraldi", "qabul_qilindi"].includes(m.status)
          )
          .reduce((sum, m) => sum + m.amount, 0);
        const activeEscrow = milestones
          .filter((m) =>
            ["mablaglangan", "topshirildi", "ozgartirish_soraldi"].includes(m.status)
          )
          .reduce((sum, m) => sum + m.amount, 0);
        setDisputeContractData({ contract, milestones, escrowFunds, activeEscrow });
      })
      .catch(() => {
        if (!cancelled) setDisputeContractData(null);
      });

    setMessagesLoading(true);
    messagesService
      .list(selectedDispute.contractId)
      .then((msgs) => {
        if (!cancelled) setDisputeMessages(msgs || []);
      })
      .catch(() => {
        if (!cancelled) setDisputeMessages([]);
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDispute]);

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
        setActionError(`Xaridorga qaytarish summasi 0 va ${formatMoney(disputeContractData.activeEscrow)} oralig'ida bo'lishi kerak.`);
        return;
      }
      splitAmt = amt;
    }

    setActionLoading(true);
    setActionError("");
    try {
      /* `forceCloseContract` nizoni ham `hal_qilindi` ga o'tkazadi, qarorni
         (`resolution`) yozadi va escrow'ni taqsimlaydi — bularning hammasi
         bitta amalda. Ilgari sahifa shundan keyin `sb2_disputes` ga YANA
         o'zi yozardi: ortiqcha, kvota himoyasidan o'tmaydigan va backend'da
         umuman ishlamaydigan yozuv edi. */
      await forceCloseContract(
        selectedDispute.contractId,
        resolutionType,
        resolutionNote.trim(),
        splitAmt
      );

      setSelectedDispute(null);
      setResolutionType(null);
      setBuyerRefundAmount("");
      setResolutionNote("");
      load();
    } catch (err) {
      /* Aniq sabab ko'rsatiladi: ruxsat yo'qligi, nizo topilmasligi va
         noto'g'ri summa bir xil "xatolik yuz berdi" bo'lib qolmasin. */
      setActionError(adminErrorText(err));
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

  const columns: TableColumn<AdminDisputeRow>[] = [
    {
      key: "id",
      header: "Nizo ID",
      render: (d) => <span className="font-mono text-xs text-ink">{d.id}</span>,
    },
    {
      key: "contract",
      header: "Shartnoma",
      render: (d) => {
        return (
          <div>
            <p className="font-semibold text-ink truncate max-w-[200px]">{d.contractTitle}</p>
            <p className="text-3xs text-muted">ID: {d.contractId}</p>
          </div>
        );
      },
    },
    {
      key: "parties",
      header: "Taraflar",
      render: (d) => {
        return (
          <span className="text-xs text-ink">
            {d.buyerName || "Buyurtmachi"} ↔ {d.sellerName || "Mutaxassis"}
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
        title="Nizolar markazi"
        description="Shartnomalar bo'yicha escrow va sifat kelishmovchiliklarini ko'rib chiqish, pul qaytarish va to'lov qarorlari."
      />
        <ErrorState error={loadError} onRetry={load} />
      </>
    );
  }

  if (!page) return <p className="text-muted">Yuklanmoqda...</p>;

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
        {page.items.length ? (
          <>
            <Table
              columns={columns}
              rows={page.items}
              rowKey={(d) => d.id}
              renderMobileCard={(d) => {
                return (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{d.contractTitle}</p>
                      <p className="text-3xs text-muted">Dispute ID: {d.id}</p>
                      <p className="text-xs text-ink mt-1 font-medium">
                        {d.buyerName} ↔ {d.sellerName}
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

            {/* Milestones & Deliverables Breakdown */}
            <div className="border-b border-line pb-3">
              <p className="text-2xs text-muted font-semibold uppercase mb-1.5">
                Bosqichlar va Topshirilgan Natijalar ({disputeContractData.milestones.length} ta)
              </p>
              <div className="max-h-56 overflow-y-auto space-y-2">
                {disputeContractData.milestones.map((m) => (
                  <div key={m.id} className="p-2.5 rounded border border-line bg-card text-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink truncate max-w-[220px]">{m.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono font-semibold text-ink">{formatMoney(m.amount)}</span>
                        <Badge tone={m.status === "qabul_qilindi" ? "neutral" : m.status === "mablaglangan" ? "success" : "warning"}>
                          {m.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Deliverable link / notes if present */}
                    {m.deliverableLink && (
                      <div className="bg-surface p-1.5 rounded border border-line flex items-center gap-2">
                        <span className="text-muted font-medium">Havola:</span>
                        <a
                          href={m.deliverableLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-mono truncate"
                        >
                          🔗 {m.deliverableLink}
                        </a>
                      </div>
                    )}

                    {m.deliverableNote && (
                      <div className="bg-surface p-1.5 rounded border border-line text-muted">
                        <span className="font-semibold text-ink">Mutaxassis izohi:</span> {m.deliverableNote}
                      </div>
                    )}

                    {m.deliverableFiles && m.deliverableFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {m.deliverableFiles.map((f) => (
                          <a
                            key={f.id}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={f.name}
                            className="bg-card-hover px-2 py-0.5 rounded border border-line text-primary font-mono text-3xs flex items-center gap-1"
                          >
                            📎 {f.name} ({Math.round(f.size / 1024)} KB)
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Revision comment if present */}
                    {m.revisionComment && (
                      <div className="bg-warning/10 p-1.5 rounded border border-warning/30 text-warning-deep">
                        <span className="font-semibold">O&apos;zgartirish talabi (#{m.revisionCount ?? 1}):</span> {m.revisionComment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat History between Parties */}
            <div className="border-b border-line pb-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-2xs text-muted font-semibold uppercase">
                  Tomonlar Yozishmalari (Chat Tarixi — {disputeMessages.length} ta xabar)
                </p>
                {messagesLoading && <span className="text-3xs text-muted animate-pulse">Yuklanmoqda...</span>}
              </div>

              <div className="max-h-48 overflow-y-auto rounded border border-line bg-surface/50 p-2.5 space-y-2">
                {disputeMessages.length === 0 ? (
                  <p className="text-2xs text-muted italic text-center py-2">
                    {messagesLoading ? "Xabarlar yuklanmoqda..." : "Ushbu shartnoma bo'yicha yozishmalar mavjud emas."}
                  </p>
                ) : (
                  disputeMessages.map((msg) => {
                    const isBuyer = msg.senderId === disputeContractData.contract.buyerId;
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-2 text-2xs border ${
                          isBuyer
                            ? "bg-primary/5 border-primary/20 mr-4"
                            : "bg-card border-line ml-4"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`font-semibold text-3xs px-1.5 py-0.5 rounded ${
                              isBuyer
                                ? "bg-primary/10 text-primary"
                                : "bg-accent/10 text-accent"
                            }`}
                          >
                            {isBuyer ? `Xaridor (${disputeContractData.contract.buyerName})` : `Mutaxassis (${disputeContractData.contract.sellerName})`}
                          </span>
                          <span className="text-3xs text-muted">{formatDate(msg.createdAt)}</span>
                        </div>
                        <p className="text-ink leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        {msg.image && (
                          <div className="mt-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={msg.image} alt="Attachment" className="max-h-24 rounded border border-line" />
                          </div>
                        )}
                        {msg.files && msg.files.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {msg.files.map((file) => (
                              <a
                                key={file.id}
                                href={file.url}
                                download={file.name}
                                className="text-3xs text-primary underline bg-card px-1.5 py-0.5 rounded border border-line"
                              >
                                📎 {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
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
                          {formatMoney(Math.max(0, disputeContractData.activeEscrow - parseFloat(buyerRefundAmount)))}
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
                {/* Hukm matni nizoning O'ZIDA saqlanadi (`resolution`) —
                    `forceCloseContract` uni "Arbitraj qarori (...): ..."
                    ko'rinishida yozadi. Ilgari bu blok `sb2_admin_case_notes`
                    kalitini o'qirdi, uni esa hech kim hech qachon yozmagan:
                    arbitrdan majburiy so'ralgan asos ekranda HECH QACHON
                    ko'rinmasdi. */}
                {selectedDispute.resolution && (
                  <div className="mt-2 text-2xs text-ink bg-card-hover p-2.5 rounded text-left border border-line/20">
                    <p className="font-semibold text-muted">Hukm qaydlari:</p>
                    <p className="mt-0.5 whitespace-pre-wrap">
                      {selectedDispute.resolution}
                    </p>
                    {selectedDispute.resolvedAt && (
                      <p className="mt-1 text-3xs text-faint">
                        {formatDate(selectedDispute.resolvedAt)}
                      </p>
                    )}
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
