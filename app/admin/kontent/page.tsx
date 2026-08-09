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
import { getAdminData, adminModerate, forceCloseContract } from "@/lib/api/admin";
import { formatDate, formatMoney } from "@/lib/format";
import type { Contract, Job, Service, Milestone } from "@/lib/types";

export default function ContentControlPage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [tab, setTab] = useState<"contracts" | "jobs" | "services">("contracts");
  const [search, setSearch] = useState("");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Selection and Action States
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Force close states
  const [forceCloseModalOpen, setForceCloseModalOpen] = useState(false);
  const [resolutionType, setResolutionType] = useState<"refund" | "payout" | "split" | null>(null);
  const [splitRefundAmount, setSplitRefundAmount] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
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

  const stats = useMemo(() => {
    if (!data) return { contracts: 0, jobs: 0, services: 0 };
    return {
      contracts: data.contracts.length,
      jobs: data.jobs.length,
      services: data.services.length,
    };
  }, [data]);

  const filteredContracts = useMemo(() => {
    if (!data) return [];
    return data.contracts.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.buyerName.toLowerCase().includes(q) ||
          c.sellerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, search]);

  const filteredJobs = useMemo(() => {
    if (!data) return [];
    return data.jobs.filter((j) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          j.title.toLowerCase().includes(q) ||
          j.id.toLowerCase().includes(q) ||
          j.buyerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, search]);

  const filteredServices = useMemo(() => {
    if (!data) return [];
    return data.services.filter((s) => {
      const user = data.users.find((u) => u.id === s.sellerId);
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          user?.fullName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, search]);

  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredContracts.slice(start, start + rowsPerPage);
  }, [filteredContracts, currentPage, rowsPerPage]);

  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredJobs.slice(start, start + rowsPerPage);
  }, [filteredJobs, currentPage, rowsPerPage]);

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredServices.slice(start, start + rowsPerPage);
  }, [filteredServices, currentPage, rowsPerPage]);

  const selectedContractMilestones = useMemo((): Milestone[] => {
    if (!selectedContract) return [];
    try {
      return JSON.parse(localStorage.getItem("sb2_milestones") || "[]")
        .filter((m: Milestone) => m.contractId === selectedContract.id);
    } catch {
      return [];
    }
  }, [selectedContract]);

  const selectedContractEscrowStats = useMemo(() => {
    if (!selectedContract || !selectedContractMilestones.length) return { total: 0, active: 0 };
    const list = selectedContractMilestones;
    return {
      total: list.reduce((sum, m) => sum + m.amount, 0),
      active: list
        .filter((m) => ["mablaglangan", "topshirildi", "ozgartirish_soraldi"].includes(m.status))
        .reduce((sum, m) => sum + m.amount, 0),
    };
  }, [selectedContract, selectedContractMilestones]);

  const handleToggleContentStatus = async (kind: "job" | "service", id: string) => {
    if (!confirm("Ushbu kontentning faollik holatini o'zgartirmoqchimisiz?")) return;
    setActionLoading(true);
    try {
      adminModerate("content", id);
      setSelectedJob(null);
      setSelectedService(null);
      load();
    } catch {
      alert("Xato yuz berdi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceClose = async () => {
    if (!selectedContract || !resolutionType) return;
    if (resolutionNotes.trim().length < 10) {
      setActionError("Majburan yopish sababi kamida 10 ta belgidan iborat bo'lishi shart.");
      return;
    }

    let splitVal: number | undefined = undefined;
    if (resolutionType === "split") {
      const amt = parseFloat(splitRefundAmount);
      if (isNaN(amt) || amt < 0 || amt > selectedContractEscrowStats.active) {
        setActionError(`Xaridorga qaytarish summasi 0 va ${selectedContractEscrowStats.active.toLocaleString()} UZS oralig'ida bo'lishi kerak.`);
        return;
      }
      splitVal = amt;
    }

    setActionLoading(true);
    setActionError("");
    try {
      forceCloseContract(selectedContract.id, resolutionType, resolutionNotes.trim(), splitVal);
      setForceCloseModalOpen(false);
      setSelectedContract(null);
      setResolutionType(null);
      setSplitRefundAmount("");
      setResolutionNotes("");
      load();
    } catch {
      setActionError("Majburan yopishda xatolik yuz berdi.");
    } finally {
      setActionLoading(false);
    }
  };

  const getContractStatusLabel = (status: string) => {
    const map: Record<string, { label: string; tone: BadgeTone }> = {
      imzolangan: { label: "Imzolangan", tone: "neutral" },
      faol: { label: "Faol", tone: "success" },
      yakunlangan: { label: "Yakunlangan", tone: "neutral" },
      bekor_qilingan: { label: "Bekor qilingan", tone: "danger" },
      nizo: { label: "Nizo", tone: "warning" },
    };
    return map[status] || { label: status, tone: "neutral" };
  };

  const contractColumns: TableColumn<Contract>[] = [
    { key: "id", header: "Shartnoma ID", render: (c) => <span className="font-mono text-2xs text-ink">{c.id}</span> },
    { key: "title", header: "Loyiha", render: (c) => <span className="font-semibold text-ink truncate max-w-[150px] block">{c.title}</span> },
    {
      key: "parties",
      header: "Taraflar",
      render: (c) => (
        <span className="text-xs text-ink">
          {c.buyerName} ↔ {c.sellerName}
        </span>
      ),
    },
    { key: "amount", header: "Byudjet", render: (c) => <span className="font-mono text-ink font-semibold">{formatMoney(c.totalAmount)}</span> },
    {
      key: "status",
      header: "Holati",
      render: (c) => {
        const info = getContractStatusLabel(c.status);
        return <Badge tone={info.tone}>{info.label}</Badge>;
      },
    },
    { key: "action", header: "Boshqarish", render: (c) => <Button size="sm" variant="secondary" onClick={() => setSelectedContract(c)}>Boshqarish</Button> },
  ];

  const jobColumns: TableColumn<Job>[] = [
    { key: "id", header: "E'lon ID", render: (j) => <span className="font-mono text-2xs text-ink">{j.id}</span> },
    { key: "title", header: "Sarlavha", render: (j) => <span className="font-semibold text-ink truncate max-w-[200px] block">{j.title}</span> },
    { key: "buyer", header: "Buyurtmachi", render: (j) => <span className="text-xs text-ink">{j.buyerName}</span> },
    {
      key: "budget",
      header: "Byudjet",
      render: (j) => (
        <span className="font-mono text-xs text-ink">
          {formatMoney(j.budgetMin)} - {formatMoney(j.budgetMax)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Holati",
      render: (j) => (
        <Badge tone={j.status === "ochiq" ? "success" : "neutral"}>
          {j.status === "ochiq" ? "Faol" : "Yopilgan"}
        </Badge>
      ),
    },
    { key: "action", header: "Ko'rish", render: (j) => <Button size="sm" variant="secondary" onClick={() => setSelectedJob(j)}>{"Ko'rish"}</Button> },
  ];

  const serviceColumns: TableColumn<Service>[] = [
    { key: "id", header: "Xizmat ID", render: (s) => <span className="font-mono text-2xs text-ink">{s.id}</span> },
    { key: "title", header: "Sarlavha", render: (s) => <span className="font-semibold text-ink truncate max-w-[200px] block">{s.title}</span> },
    {
      key: "seller",
      header: "Mutaxassis",
      render: (s) => {
        const user = data?.users.find((u) => u.id === s.sellerId);
        return <span className="text-xs text-ink">{user?.fullName || s.sellerId}</span>;
      },
    },
    { key: "price", header: "Boshlang'ich Narx", render: (s) => <span className="font-mono text-xs text-ink">{formatMoney(s.price)}</span> },
    {
      key: "status",
      header: "Holati",
      render: (s) => (
        <Badge tone={s.status === "active" ? "success" : "warning"}>
          {s.status === "active" ? "Faol" : "Muzlatilgan"}
        </Badge>
      ),
    },
    { key: "action", header: "Ko'rish", render: (s) => <Button size="sm" variant="secondary" onClick={() => setSelectedService(s)}>{"Ko'rish"}</Button> },
  ];

  if (!data) return <p className="text-muted font-sans">Yuklanmoqda...</p>;

  return (
    <>
      <AdminPageHeader
        title="Bozor kontenti va Shartnomalar"
        description="Marketplace shartnomalarini majburan yopish, escrow pul arbitraji, hamda ish e'lonlari va freelancer xizmatlari moderatsiyasi."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Jami Shartnomalar" value={stats.contracts} detail="Barcha kelishuvlar" />
        <MetricCard label="Faol Ish E'lonlari" value={data.jobs.filter((j) => j.status === "ochiq").length} detail={`Jami ${stats.jobs} ta`} tone="primary" />
        <MetricCard label="Faol Freelance Xizmatlar" value={data.services.filter((s) => s.status === "active").length} detail={`Jami ${stats.services} ta`} tone="success" />
      </section>

      {/* Tabs and Search Bar */}
      <Card padding="md" className="mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex border-b border-line pb-0.5">
            {[
              { id: "contracts", label: "Shartnomalar" },
              { id: "jobs", label: "Ish e'lonlari" },
              { id: "services", label: "Freelancer Xizmatlari" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id as "contracts" | "jobs" | "services");
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
                tab === "contracts"
                  ? "Loyiha, ID yoki foydalanuvchi..."
                  : tab === "jobs"
                    ? "E'lon nomi, ID..."
                    : "Xizmat nomi, mutaxassis..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table grids */}
      <div className="mt-4">
        {tab === "contracts" && (
          filteredContracts.length ? (
            <>
              <Table
                columns={contractColumns}
                rows={paginatedContracts}
                rowKey={(c) => c.id}
                renderMobileCard={(c) => {
                  const info = getContractStatusLabel(c.status);
                  return (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{c.title}</p>
                        <p className="text-3xs text-muted">ID: {c.id}</p>
                        <p className="text-xs text-ink mt-1 font-medium">{c.buyerName} ↔ {c.sellerName}</p>
                        <p className="text-xs text-ink font-mono mt-1 font-semibold text-primary">{formatMoney(c.totalAmount)}</p>
                        <div className="mt-2">
                          <Badge tone={info.tone}>{info.label}</Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setSelectedContract(c)}>Boshqarish</Button>
                    </div>
                  );
                }}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredContracts.length / rowsPerPage)}
                onPageChange={setCurrentPage}
                totalRows={filteredContracts.length}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          ) : (
            <Card className="py-12 text-center text-muted font-sans">Shartnomalar topilmadi.</Card>
          )
        )}

        {tab === "jobs" && (
          filteredJobs.length ? (
            <>
              <Table
                columns={jobColumns}
                rows={paginatedJobs}
                rowKey={(j) => j.id}
                renderMobileCard={(j) => (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{j.title}</p>
                      <p className="text-3xs text-muted">ID: {j.id}</p>
                      <p className="text-xs text-ink mt-1">Buyurtmachi: {j.buyerName}</p>
                      <p className="text-xs text-ink font-mono mt-1">Byudjet: {formatMoney(j.budgetMin)} - {formatMoney(j.budgetMax)}</p>
                      <div className="mt-2">
                        <Badge tone={j.status === "ochiq" ? "success" : "neutral"}>
                          {j.status === "ochiq" ? "Faol" : "Yopilgan"}
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setSelectedJob(j)}>{"Ko'rish"}</Button>
                  </div>
                )}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredJobs.length / rowsPerPage)}
                onPageChange={setCurrentPage}
                totalRows={filteredJobs.length}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          ) : (
             <Card className="py-12 text-center text-muted font-sans">{"Ish e'lonlari topilmadi."}</Card>
          )
        )}

        {tab === "services" && (
          filteredServices.length ? (
            <>
              <Table
                columns={serviceColumns}
                rows={paginatedServices}
                rowKey={(s) => s.id}
                renderMobileCard={(s) => {
                  const user = data.users.find((u) => u.id === s.sellerId);
                  return (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{s.title}</p>
                        <p className="text-3xs text-muted">ID: {s.id}</p>
                        <p className="text-xs text-ink mt-1">Mutaxassis: {user?.fullName || s.sellerId}</p>
                        <p className="text-xs text-ink font-mono mt-1">{"Boshlang'ich Narx: "}{formatMoney(s.price)}</p>
                        <div className="mt-2">
                          <Badge tone={s.status === "active" ? "success" : "warning"}>
                            {s.status === "active" ? "Faol" : "Muzlatilgan"}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setSelectedService(s)}>{"Ko'rish"}</Button>
                    </div>
                  );
                }}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredServices.length / rowsPerPage)}
                onPageChange={setCurrentPage}
                totalRows={filteredServices.length}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          ) : (
            <Card className="py-12 text-center text-muted font-sans">Freelancer xizmatlari topilmadi.</Card>
          )
        )}
      </div>

      {/* Contract Detail Modal */}
      <Modal
        open={!!selectedContract}
        onClose={() => setSelectedContract(null)}
        title="Shartnoma boshqaruvi"
      >
        {selectedContract && (
          <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="border-b border-line pb-3">
              <p className="text-2xs text-muted font-semibold uppercase">Loyiha sarlavhasi</p>
              <h3 className="font-heading text-sm font-bold text-ink">{selectedContract.title}</h3>
              <p className="text-3xs text-muted mt-0.5">Shartnoma ID: {selectedContract.id}</p>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-xs border-b border-line pb-3">
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Buyurtmachi (Buyer)</dt>
                <dd className="mt-0.5 text-ink font-medium">{selectedContract.buyerName} (ID: {selectedContract.buyerId})</dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Mutaxassis (Seller)</dt>
                <dd className="mt-0.5 text-ink font-medium">{selectedContract.sellerName} (ID: {selectedContract.sellerId})</dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Jami summasi</dt>
                <dd className="mt-0.5 text-ink font-mono font-semibold text-primary">{formatMoney(selectedContract.totalAmount)}</dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Holati</dt>
                <dd className="mt-0.5">
                  <Badge tone={getContractStatusLabel(selectedContract.status).tone}>
                    {getContractStatusLabel(selectedContract.status).label}
                  </Badge>
                </dd>
              </div>
            </dl>

            {/* Milestones */}
            <div>
              <p className="text-2xs text-muted font-semibold uppercase mb-1.5">Bosqichlar (Milestones)</p>
              {selectedContractMilestones.length ? (
                <div className="divide-y divide-line border border-line rounded bg-card max-h-32 overflow-y-auto">
                  {selectedContractMilestones.map((m) => (
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
              ) : (
                <p className="text-2xs text-muted">Bosqichlar mavjud emas.</p>
              )}
            </div>

            {/* Show closed case notes if force closed */}
            {["bekor_qilingan", "yakunlangan"].includes(selectedContract.status) && (
              <div className="border-t border-line pt-3">
                {(() => {
                  try {
                    const notes = JSON.parse(localStorage.getItem("sb2_admin_case_notes") || "{}");
                    const forceCloseMsg = notes[selectedContract.id];
                    if (forceCloseMsg) {
                      return (
                        <div className="rounded bg-card-hover border border-line/20 p-2.5 text-2xs text-ink">
                          <p className="font-semibold text-muted">Operatsion yopilish qaydlari:</p>
                          <p className="mt-1 whitespace-pre-wrap italic">{forceCloseMsg}</p>
                        </div>
                      );
                    }
                  } catch {}
                  return null;
                })()}
              </div>
            )}

            {/* Administrative actions */}
            {!["bekor_qilingan", "yakunlangan"].includes(selectedContract.status) && (
              <div className="flex flex-col gap-2 border-t border-line pt-3 mt-1">
                <p className="text-2xs text-muted font-semibold uppercase mb-0.5">Moderator operatsiyalari</p>
                <Button variant="danger" className="justify-center" onClick={() => {
                  setResolutionNotes("");
                  setResolutionType(null);
                  setSplitRefundAmount("");
                  setActionError("");
                  setForceCloseModalOpen(true);
                }}>
                  Shartnomani majburan yopish (Escrow Refund/Payout)
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Force Close Modal */}
      <Modal
        open={forceCloseModalOpen}
        onClose={() => setForceCloseModalOpen(false)}
        title="Majburan yopish va Escrow taqsimlash"
      >
        {selectedContract && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted">
              Ushbu amal faol escrow summasini qayta taqsimlab shartnomani majburan yopadi. Muqobil loyiha: <strong className="text-ink">{selectedContract.title}</strong>
            </p>

            <div className="bg-card-hover p-2.5 rounded text-2xs text-ink border border-line/10">
              <p><span className="text-muted">Muzlatilgan Escrow:</span> <strong className="font-mono text-warning">{formatMoney(selectedContractEscrowStats.active)}</strong></p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Escrow yechimi</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: "refund", label: "Refund Buyer" },
                  { type: "payout", label: "Payout Specialist" },
                  { type: "split", label: "Split summani bo'lish" },
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
                  aria-label="Split Refund UZS"
                  type="number"
                  placeholder={`Maks: ${selectedContractEscrowStats.active}`}
                  value={splitRefundAmount}
                  onChange={(e) => {
                    setSplitRefundAmount(e.target.value);
                    setActionError("");
                  }}
                />
                {splitRefundAmount && !isNaN(parseFloat(splitRefundAmount)) && (
                  <p className="text-3xs text-muted mt-1.5 leading-none">
                    {"Mutaxassisga to'lanadigan summa:"}{" "}
                    <span className="font-semibold text-accent font-mono">
                      {Math.max(0, selectedContractEscrowStats.active - parseFloat(splitRefundAmount)).toLocaleString()} UZS
                    </span>
                  </p>
                )}
              </div>
            )}

            <Textarea
              label="Majburan yopish sababi (Taraflarga ko'rinadi va auditda yoziladi)"
              placeholder="Nizo bo'yicha yakuniy arbitraj yechimi..."
              value={resolutionNotes}
              onChange={(e) => {
                setResolutionNotes(e.target.value);
                setActionError("");
              }}
              error={actionError}
              required
              maxLength={1000}
            />

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => setForceCloseModalOpen(false)}>Bekor qilish</Button>
              <Button variant="danger" onClick={handleForceClose} disabled={!resolutionType || !resolutionNotes.trim() || actionLoading}>
                Majburan yopishni tasdiqlash
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Job Details Modal */}
      <Modal
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title="Ish e'loni moderatsiyasi"
      >
        {selectedJob && (
          <div className="flex flex-col gap-4 text-xs">
            <div>
              <p className="text-2xs text-muted font-semibold uppercase">Sarlavha</p>
              <h3 className="font-heading text-sm font-bold text-ink">{selectedJob.title}</h3>
              <p className="text-3xs text-muted mt-0.5">ID: {selectedJob.id}</p>
            </div>

            <div className="bg-card-hover border border-line/20 p-2.5 rounded leading-relaxed text-muted">
              <p className="text-2xs text-muted font-semibold uppercase mb-1">{"E'lon matni"}</p>
              &quot;{selectedJob.description}&quot;
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Buyurtmachi</dt>
                <dd className="mt-0.5 text-ink font-medium">{selectedJob.buyerName}</dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">{"Byudjet oralig'i"}</dt>
                <dd className="mt-0.5 text-ink font-semibold">{formatMoney(selectedJob.budgetMin)} - {formatMoney(selectedJob.budgetMax)}</dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Yuborilgan sanasi</dt>
                <dd className="mt-0.5 text-muted">{formatDate(selectedJob.postedAt)}</dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">{"E'lon holati"}</dt>
                <dd className="mt-0.5">
                  <Badge tone={selectedJob.status === "ochiq" ? "success" : "neutral"}>
                    {selectedJob.status === "ochiq" ? "Ochiq / Faol" : "Yopilgan"}
                  </Badge>
                </dd>
              </div>
            </dl>

            <div className="border-t border-line pt-3 mt-1 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelectedJob(null)}>Orqaga</Button>
              <Button variant={selectedJob.status === "ochiq" ? "danger" : "primary"} onClick={() => handleToggleContentStatus("job", selectedJob.id)} disabled={actionLoading}>
                {selectedJob.status === "ochiq" ? "E'lonni muzlatish / Yopish" : "E'lonni ochish"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Service Details Modal */}
      <Modal
        open={!!selectedService}
        onClose={() => setSelectedService(null)}
        title="Xizmat moderatsiyasi"
      >
        {selectedService && (
          <div className="flex flex-col gap-4 text-xs">
            <div>
              <p className="text-2xs text-muted font-semibold uppercase">Xizmat nomi</p>
              <h3 className="font-heading text-sm font-bold text-ink">{selectedService.title}</h3>
              <p className="text-3xs text-muted mt-0.5">ID: {selectedService.id}</p>
            </div>

            <div className="bg-card-hover border border-line/20 p-2.5 rounded leading-relaxed text-muted">
              <p className="text-2xs text-muted font-semibold uppercase mb-1">Xizmat tavsifi</p>
              &quot;{selectedService.description}&quot;
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Mutaxassis ID</dt>
                <dd className="mt-0.5 text-ink font-mono">{selectedService.sellerId}</dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">{"Boshlang'ich Narx"}</dt>
                <dd className="mt-0.5 text-ink font-semibold">{formatMoney(selectedService.price)}</dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Yetkazish muddati</dt>
                <dd className="mt-0.5 text-ink">{selectedService.deliveryDays} kun</dd>
              </div>
              <div>
                <dt className="text-2xs text-muted font-semibold uppercase">Holati</dt>
                <dd className="mt-0.5">
                  <Badge tone={selectedService.status === "active" ? "success" : "warning"}>
                    {selectedService.status === "active" ? "Faol" : "Muzlatilgan / Pauza"}
                  </Badge>
                </dd>
              </div>
            </dl>

            <div className="border-t border-line pt-3 mt-1 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelectedService(null)}>Orqaga</Button>
              <Button variant={selectedService.status === "active" ? "danger" : "primary"} onClick={() => handleToggleContentStatus("service", selectedService.id)} disabled={actionLoading}>
                {selectedService.status === "active" ? "Xizmatni muzlatish / Pauza" : "Xizmatni faollashtirish"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
