"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getAdminData, forceCloseContract } from "@/lib/api/admin";
import { formatMoney, formatDate } from "@/lib/format";
import type { Contract } from "@/lib/types";
import { DangerousActionModal } from "@/components/admin/DangerousActionModal";

export default function ContractsLifecyclePage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [forceModalOpen, setForceModalOpen] = useState(false);
  const [forceResolution, setForceResolution] = useState<"refund" | "payout">("refund");

  function load() {
    setData(getAdminData());
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    if (!data) return { total: 0, active: 0, dispute: 0, completed: 0, totalAmount: 0 };
    return {
      total: data.contracts.length,
      active: data.contracts.filter((c) => c.status === "faol").length,
      dispute: data.contracts.filter((c) => c.status === "nizo").length,
      completed: data.contracts.filter((c) => c.status === "yakunlangan").length,
      totalAmount: data.contracts.reduce((sum, c) => sum + c.totalAmount, 0),
    };
  }, [data]);

  const contractMilestones = useMemo(() => {
    if (!selectedContract || !data) return [];
    return data.milestones.filter((m) => m.contractId === selectedContract.id);
  }, [selectedContract, data]);

  const filteredContracts = useMemo(() => {
    if (!data) return [];
    return data.contracts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
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
  }, [data, statusFilter, search]);

  const totalPages = Math.ceil(filteredContracts.length / rowsPerPage);
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredContracts.slice(start, start + rowsPerPage);
  }, [filteredContracts, currentPage, rowsPerPage]);

  const getStatusInfo = (status: Contract["status"]): { label: string; tone: BadgeTone } => {
    switch (status) {
      case "faol":
        return { label: "Faol", tone: "success" };
      case "nizo":
        return { label: "Nizoda (Dispute)", tone: "danger" };
      case "yakunlangan":
        return { label: "Yakunlangan", tone: "neutral" };
      case "bekor_qilingan":
        return { label: "Bekor qilingan", tone: "warning" };
      default:
        return { label: status, tone: "neutral" };
    }
  };

  const columns: TableColumn<Contract>[] = [
    {
      key: "title",
      header: "Shartnoma & Tomonlar",
      render: (c) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink truncate max-w-xs">{c.title}</p>
          <p className="text-2xs text-muted">
            <span className="font-medium text-ink">{c.buyerName}</span> (Xaridor) →{" "}
            <span className="font-medium text-primary">{c.sellerName}</span> (Ijrochi)
          </p>
          <p className="text-3xs text-muted font-mono">ID: {c.id}</p>
        </div>
      ),
    },
    {
      key: "sourceType",
      header: "Manba",
      render: (c) => (
        <Badge tone="neutral" size="sm" className="capitalize">
          {c.sourceType}
        </Badge>
      ),
    },
    {
      key: "totalAmount",
      header: "Shartnoma Qiymati",
      render: (c) => (
        <span className="font-bold text-primary text-xs">{formatMoney(c.totalAmount)}</span>
      ),
    },
    {
      key: "status",
      header: "Holat",
      render: (c) => {
        const info = getStatusInfo(c.status);
        return <Badge tone={info.tone} size="sm">{info.label}</Badge>;
      },
    },
    {
      key: "createdAt",
      header: "Tuzilgan Sana",
      render: (c) => <span className="text-xs text-muted">{formatDate(c.createdAt)}</span>,
    },
    {
      key: "action",
      header: "Boshqarish",
      render: (c) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedContract(c)} className="text-xs">
          Boshqarish →
        </Button>
      ),
    },
  ];

  if (!data) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Shartnomalar & Buyurtmalar Nazorati"
        description="Platformadagi barcha xavfsiz bitimlar (Escrow), bosqichlar (milestones) va tomonlararo hisob-kitoblar."
      />

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jami Shartnomalar" value={stats.total} detail={`Umumiy qiymat: ${formatMoney(stats.totalAmount)}`} />
        <MetricCard label="Faol Jarayonda" value={stats.active} detail="Escrow himoyasida bajarilmoqda" tone="success" />
        <MetricCard label="Arbitraj / Nizoda" value={stats.dispute} detail="Admin qarorini kutmoqda" tone="danger" />
        <MetricCard label="Muvaffaqiyatli Yakunlangan" value={stats.completed} detail="Mablag' to'liq to'langan" />
      </section>

      {/* Filter and Search */}
      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Holat bo'yicha filtr"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha holatlar</option>
              <option value="faol">Faol</option>
              <option value="nizo">Nizoda</option>
              <option value="yakunlangan">Yakunlangan</option>
              <option value="bekor_qilingan">Bekor qilingan</option>
            </select>
          </div>

          <div className="w-full sm:w-72">
            <Input
              aria-label="Qidirish"
              placeholder="Shartnoma nomi, tomonlar yoki ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="mt-4">
        {filteredContracts.length ? (
          <>
            <Table
              columns={columns}
              rows={paginatedContracts}
              rowKey={(c) => c.id}
              renderMobileCard={(c) => (
                <div className="flex items-start justify-between gap-3 p-3 border border-line rounded-xl bg-card">
                  <div>
                    <p className="font-semibold text-ink">{c.title}</p>
                    <p className="text-2xs text-muted">{c.buyerName} → {c.sellerName}</p>
                    <p className="font-bold text-primary text-xs mt-1">{formatMoney(c.totalAmount)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedContract(c)}>
                    Ko‘rish
                  </Button>
                </div>
              )}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalRows={filteredContracts.length}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </>
        ) : (
          <Card className="py-12 text-center text-xs text-muted">
            Shartnomalar topilmadi.
          </Card>
        )}
      </div>

      {/* Contract Detail Modal */}
      {selectedContract && (
        <Modal
          open={Boolean(selectedContract)}
          onClose={() => setSelectedContract(null)}
          title={`Shartnoma boshqaruvi: ${selectedContract.title}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              {selectedContract.status === "faol" || selectedContract.status === "nizo" ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    tone="warning"
                    onClick={() => {
                      setForceResolution("refund");
                      setForceModalOpen(true);
                    }}
                  >
                    Xaridorga qaytarish (Refund)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    tone="success"
                    onClick={() => {
                      setForceResolution("payout");
                      setForceModalOpen(true);
                    }}
                  >
                    Mutaxassisga chiqarish (Release)
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted">Shartnoma holati: {selectedContract.status}</span>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedContract(null)}>
                Yopish
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-line bg-surface/60 p-3">
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Umumiy Qiymat:</span>
                <p className="font-bold text-primary text-sm mt-0.5">{formatMoney(selectedContract.totalAmount)}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Xaridor:</span>
                <p className="font-semibold text-ink mt-0.5">{selectedContract.buyerName}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Ijrochi:</span>
                <p className="font-semibold text-ink mt-0.5">{selectedContract.sellerName}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Holat:</span>
                <Badge tone={getStatusInfo(selectedContract.status).tone} size="sm" className="mt-0.5">
                  {getStatusInfo(selectedContract.status).label}
                </Badge>
              </div>
            </div>

            {/* Milestones Timeline */}
            <div>
              <h4 className="font-heading text-xs font-bold text-ink mb-2">
                Bosqichlar & Escrow holati ({contractMilestones.length} ta bosqich)
              </h4>
              {contractMilestones.length === 0 ? (
                <Card className="py-6 text-center text-muted">Ushbu shartnomada bosqichlar mavjud emas.</Card>
              ) : (
                <div className="space-y-2">
                  {contractMilestones.map((m, idx) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-line bg-card p-3 text-xs"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{idx + 1}. {m.title}</span>
                          <Badge size="sm" tone={m.status === "qabul_qilindi" ? "success" : m.status === "mablaglangan" ? "primary" : "neutral"}>
                            {m.status}
                          </Badge>
                        </div>
                        <p className="text-2xs text-muted mt-0.5">{m.description}</p>
                        <p className="text-3xs text-muted mt-0.5">Muddat: {formatDate(m.dueDate)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-primary">{formatMoney(m.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Force Close Modal */}
      {selectedContract && (
        <DangerousActionModal
          open={forceModalOpen}
          onClose={() => setForceModalOpen(false)}
          title={`Shartnomani majburiy yopish (${forceResolution === "refund" ? "Qaytarish" : "To'lash"})`}
          description={
            forceResolution === "refund"
              ? `Mablag' (${formatMoney(selectedContract.totalAmount)}) xaridor hisobiga qaytariladi va shartnoma bekor qilinadi.`
              : `Mablag' (${formatMoney(selectedContract.totalAmount)}) mutaxassis hisobiga o'tkaziladi va shartnoma yakunlangan deb hisoblanadi.`
          }
          impactDetails={[
            "Escrow balansi darhol bo'shatiladi",
            "Ikkala tomon elektron bildirishnoma oladi",
            "Audit jurnali administrator javobgarligini qayd etadi",
          ]}
          confirmLabel={forceResolution === "refund" ? "Xaridorga qaytarish" : "Ijrochiga to'lash"}
          confirmTone={forceResolution === "refund" ? "warning" : "primary"}
          onConfirm={(reason) => {
            forceCloseContract(selectedContract.id, forceResolution, reason);
            load();
            setForceModalOpen(false);
            setSelectedContract(null);
          }}
        />
      )}
    </div>
  );
}
