"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getAdminData, addAudit } from "@/lib/api/admin";
import { formatMoney, formatDate } from "@/lib/format";
import type { Job } from "@/lib/types";
import { DangerousActionModal } from "@/components/admin/DangerousActionModal";

export default function JobsModerationPage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  function load() {
    setData(getAdminData());
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    if (!data) return { total: 0, open: 0, closed: 0, totalProposals: 0 };
    return {
      total: data.jobs.length,
      open: data.jobs.filter((j) => j.status === "ochiq").length,
      closed: data.jobs.filter((j) => j.status === "yopilgan").length,
      totalProposals: data.jobs.reduce((sum, j) => sum + j.proposalsCount, 0),
    };
  }, [data]);

  const filteredJobs = useMemo(() => {
    if (!data) return [];
    return data.jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (categoryFilter !== "all" && j.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.buyerName.toLowerCase().includes(q) ||
          j.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, statusFilter, categoryFilter, search]);

  const totalPages = Math.ceil(filteredJobs.length / rowsPerPage);
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredJobs.slice(start, start + rowsPerPage);
  }, [filteredJobs, currentPage, rowsPerPage]);

  function handleCloseJob(jobId: string, reason: string) {
    try {
      const jobs = JSON.parse(localStorage.getItem("sb2_jobs") || "[]") as Job[];
      const idx = jobs.findIndex((j) => j.id === jobId);
      if (idx !== -1) {
        jobs[idx].status = "yopilgan";
        localStorage.setItem("sb2_jobs", JSON.stringify(jobs));
        addAudit("Admin loyihani majburiy yopdi", jobId, `Sabab: ${reason}`);
        load();
        if (selectedJob?.id === jobId) {
          setSelectedJob({ ...selectedJob, status: "yopilgan" });
        }
      }
    } catch {
      // ignore
    }
  }

  const columns: TableColumn<Job>[] = [
    {
      key: "title",
      header: "Loyiha Nomi & Xaridor",
      render: (j) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink truncate max-w-xs">{j.title}</p>
          <p className="text-2xs text-muted">
            Xaridor: <span className="font-medium text-ink">{j.buyerName}</span> · ID: {j.id}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategoriya",
      render: (j) => (
        <Badge tone="neutral" size="sm" className="capitalize">
          {j.category}
        </Badge>
      ),
    },
    {
      key: "budget",
      header: "Byudjet",
      render: (j) => (
        <span className="font-bold text-primary text-xs">
          {formatMoney(j.budgetMin)} - {formatMoney(j.budgetMax)}
        </span>
      ),
    },
    {
      key: "proposalsCount",
      header: "Takliflar",
      render: (j) => (
        <Badge tone={j.proposalsCount > 0 ? "primary" : "neutral"} size="sm">
          {j.proposalsCount} ta taklif
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Holat",
      render: (j) => (
        <Badge tone={j.status === "ochiq" ? "success" : "neutral"} size="sm">
          {j.status === "ochiq" ? "Ochiq" : "Yopilgan"}
        </Badge>
      ),
    },
    {
      key: "postedAt",
      header: "Joylashtirilgan",
      render: (j) => <span className="text-xs text-muted">{formatDate(j.postedAt)}</span>,
    },
    {
      key: "action",
      header: "Moderatsiya",
      render: (j) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedJob(j)} className="text-xs">
          Tekshirish →
        </Button>
      ),
    },
  ];

  if (!data) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Mijoz Loyihalari & E'lonlar Boshqaruvi"
        description="Xaridorlar tomonidan e'lon qilingan ochiq ishlar, byudjetlar, screening savollari va qabul qilingan takliflar nazorati."
      />

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jami Loyihalar" value={stats.total} detail="Barcha e'lonlar" />
        <MetricCard label="Ochiq E'lonlar" value={stats.open} detail="Hozirda taklif qabul qilinmoqda" tone="success" />
        <MetricCard label="Yopilgan / Tugatilgan" value={stats.closed} detail="Ijrochi topilgan yoki bekor qilingan" />
        <MetricCard label="Yuborilgan Takliflar" value={stats.totalProposals} detail="Mutaxassislar arizalari" tone="primary" />
      </section>

      {/* Search and Filters */}
      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Holat filtri"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha holatlar</option>
              <option value="ochiq">Ochiq</option>
              <option value="yopilgan">Yopilgan</option>
            </select>

            <select
              aria-label="Kategoriya filtri"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha kategoriyalar</option>
              <option value="dizayn">Dizayn & Grafika</option>
              <option value="dasturlash">Dasturlash & IT</option>
              <option value="tarjima">Tarjima & Matnlar</option>
              <option value="marketing">Marketing & SMM</option>
              <option value="video">Video & Audio</option>
              <option value="biznes">Biznes & Boshqaruv</option>
            </select>
          </div>

          <div className="w-full sm:w-72">
            <Input
              aria-label="Qidirish"
              placeholder="Loyiha nomi, xaridor yoki ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="mt-4">
        {filteredJobs.length ? (
          <>
            <Table
              columns={columns}
              rows={paginatedJobs}
              rowKey={(j) => j.id}
              renderMobileCard={(j) => (
                <div className="flex items-start justify-between gap-3 p-3 border border-line rounded-xl bg-card">
                  <div>
                    <p className="font-semibold text-ink">{j.title}</p>
                    <p className="text-2xs text-muted">{j.buyerName} · {formatMoney(j.budgetMax)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedJob(j)}>
                    Ko‘rish
                  </Button>
                </div>
              )}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalRows={filteredJobs.length}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </>
        ) : (
          <Card className="py-12 text-center text-xs text-muted">
            Loyihalar topilmadi.
          </Card>
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <Modal
          open={Boolean(selectedJob)}
          onClose={() => setSelectedJob(null)}
          title={`Loyiha tekshiruvi: ${selectedJob.title}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              {selectedJob.status === "ochiq" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  tone="danger"
                  onClick={() => setCloseModalOpen(true)}
                >
                  Loyihani majburiy yopish
                </Button>
              ) : (
                <span className="text-xs text-muted font-medium">Loyiha yopilgan</span>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedJob(null)}>
                Yopish
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-line bg-surface/60 p-3">
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Byudjet oralig‘i:</span>
                <p className="font-bold text-primary text-sm mt-0.5">
                  {formatMoney(selectedJob.budgetMin)} - {formatMoney(selectedJob.budgetMax)}
                </p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Xaridor:</span>
                <p className="font-semibold text-ink mt-0.5">{selectedJob.buyerName}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Kategoriya:</span>
                <p className="font-semibold text-ink mt-0.5 capitalize">{selectedJob.category}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Takliflar:</span>
                <p className="font-semibold text-ink mt-0.5">{selectedJob.proposalsCount} ta</p>
              </div>
            </div>

            <div>
              <span className="text-3xs uppercase font-bold text-muted block mb-1">Talab qilingan ko‘nikmalar:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedJob.skillsRequired.map((s, i) => (
                  <span key={i} className="rounded-md bg-surface px-2 py-0.5 text-2xs border border-line text-ink">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-3xs uppercase font-bold text-muted block mb-1">Batafsil topshiriq tavsifi:</span>
              <div className="rounded-xl border border-line bg-card p-3.5 text-xs text-ink leading-relaxed whitespace-pre-wrap">
                {selectedJob.description}
              </div>
            </div>

            {/* Screening Questions */}
            {selectedJob.screeningQuestions && selectedJob.screeningQuestions.length > 0 && (
              <div>
                <span className="text-3xs uppercase font-bold text-muted block mb-1">
                  Saralash savollari ({selectedJob.screeningQuestions.length} ta):
                </span>
                <div className="rounded-xl border border-line bg-surface/50 p-3 space-y-1.5">
                  {selectedJob.screeningQuestions.map((q, idx) => (
                    <p key={idx} className="text-xs text-ink">
                      <span className="font-bold text-primary">{idx + 1}.</span> {q}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Force Close Job Modal */}
      {selectedJob && (
        <DangerousActionModal
          open={closeModalOpen}
          onClose={() => setCloseModalOpen(false)}
          title="Loyihani majburiy yopish"
          description={`"${selectedJob.title}" loyihasini qoidabuzarlik yoki noo‘rin mazmun tufayli ommadan yopish.`}
          impactDetails={[
            "Loyiha qidiruv va ro'yxatdan yopiladi",
            "Mavjud taklif yuborgan mutaxassislar xabardor qilinadi",
          ]}
          confirmLabel="Loyihani yopish"
          confirmTone="danger"
          onConfirm={(reason) => {
            handleCloseJob(selectedJob.id, reason);
            setCloseModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
