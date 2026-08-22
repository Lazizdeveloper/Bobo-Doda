"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getAdminData, updateTrustReport } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";
import type { TrustReport } from "@/lib/admin-types";
import { InternalNotesWidget } from "@/components/admin/InternalNotesWidget";
import { DangerousActionModal } from "@/components/admin/DangerousActionModal";

export default function TrustReportsPage() {
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selectedReport, setSelectedReport] = useState<TrustReport | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionOutcome, setActionOutcome] = useState<"action_taken" | "dismissed">("action_taken");

  function load() {
    setData(getAdminData());
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    if (!data) return { total: 0, newReports: 0, highSeverity: 0, resolved: 0 };
    return {
      total: data.reports.length,
      newReports: data.reports.filter((r) => r.status === "new" || r.status === "investigating").length,
      highSeverity: data.reports.filter((r) => r.severity === "high" && r.status !== "resolved").length,
      resolved: data.reports.filter((r) => r.status === "resolved" || r.status === "dismissed").length,
    };
  }, [data]);

  const filteredReports = useMemo(() => {
    if (!data) return [];
    return data.reports.filter((r) => {
      if (categoryFilter !== "all" && r.reasonType !== categoryFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (severityFilter !== "all" && r.severity !== severityFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.description.toLowerCase().includes(q) ||
          r.targetTitle.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, categoryFilter, statusFilter, severityFilter, search]);

  const totalPages = Math.ceil(filteredReports.length / rowsPerPage);
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredReports.slice(start, start + rowsPerPage);
  }, [filteredReports, currentPage, rowsPerPage]);

  const getSeverityTone = (sev: TrustReport["severity"]): BadgeTone => {
    switch (sev) {
      case "critical":
      case "high":
        return "danger";
      case "medium":
        return "warning";
      case "low":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const getStatusTone = (status: TrustReport["status"]): BadgeTone => {
    switch (status) {
      case "new":
        return "danger";
      case "investigating":
        return "warning";
      case "resolved":
        return "success";
      case "dismissed":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const categoryLabels: Record<string, string> = {
    off_platform: "Platformadan tashqari aloqa / To'lov",
    scam: "Firibgarlik / Shubhali faoliyat",
    inappropriate: "Haqorat / Noo'rin muomala",
    plagiarism: "Plagiat / Mualliflik huquqi",
    spam: "Spam / Reklama",
    fake_profile: "Soxta profil",
    copyright: "Mualliflik huquqi buzilishi",
  };

  const columns: TableColumn<TrustReport>[] = [
    {
      key: "targetTitle",
      header: "Shikoyat Qilingan Ob'ekt / Foydalanuvchi",
      render: (r) => (
        <div className="min-w-0">
          <p className="font-bold text-ink truncate">{r.targetTitle}</p>
          <p className="text-2xs text-muted">
            Shikoyat qiluvchi: <span className="text-ink">{r.reporterName}</span> · ID: {r.id}
          </p>
        </div>
      ),
    },
    {
      key: "reasonType",
      header: "Qoidabuzarlik Turi",
      render: (r) => (
        <span className="text-xs font-medium text-ink">
          {categoryLabels[r.reasonType] || r.reasonType}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Xavflilik Darajasi",
      render: (r) => (
        <Badge tone={getSeverityTone(r.severity)} size="sm">
          {r.severity.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Holat",
      render: (r) => (
        <Badge tone={getStatusTone(r.status)} size="sm">
          {r.status === "new" ? "Yangi" : r.status === "investigating" ? "Tekshirilmoqda" : r.status === "resolved" ? "Chora ko'rildi" : "Rad etildi"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Yuborilgan",
      render: (r) => <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>,
    },
    {
      key: "action",
      header: "Tekshirish",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedReport(r)} className="text-xs">
          Ochish →
        </Button>
      ),
    },
  ];

  if (!data) return <p className="text-muted">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Xavfsizlik & Qoidabuzarlik Shikoyatlari (Trust & Safety)"
        description="Foydalanuvchilar o‘rtasidagi noo‘rin harakatlar, platformadan tashqari to‘lov urinishlari, scam va plagiat signallarini tekshirish."
      />

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jami Shikoyatlar" value={stats.total} detail="Barcha vaqtdagi signallar" />
        <MetricCard label="Yangi & Tekshiruvda" value={stats.newReports} detail="Operator aralashuvi kerak" tone="warning" />
        <MetricCard label="Yuqori Xavf (High)" value={stats.highSeverity} detail="Zudlik bilan to'xtatish lozim" tone="danger" />
        <MetricCard label="Hal Qilingan" value={stats.resolved} detail="Chora ko'rilgan arizalar" tone="success" />
      </section>

      {/* Filter and Search */}
      <Card padding="md" className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Kategoriya bo'yicha filtr"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha toifalar</option>
              <option value="off_platform">Off-platform aloqa</option>
              <option value="scam">Scam / Firibgarlik</option>
              <option value="inappropriate">Haqorat / Noo&apos;rin muomala</option>
              <option value="plagiarism">Plagiat</option>
              <option value="spam">Spam</option>
            </select>

            <select
              aria-label="Xavflilik bo'yicha filtr"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha darajalar</option>
              <option value="high">Yuqori (High)</option>
              <option value="medium">O‘rta (Medium)</option>
              <option value="low">Past (Low)</option>
            </select>

            <select
              aria-label="Holat bo'yicha filtr"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
            >
              <option value="all">Barcha holatlar</option>
              <option value="new">Yangi</option>
              <option value="investigating">Tekshiruvda</option>
              <option value="resolved">Chora ko‘rildi</option>
              <option value="dismissed">Rad etildi</option>
            </select>
          </div>

          <div className="w-full sm:w-72">
            <Input
              aria-label="Qidirish"
              placeholder="Shikoyat matni, ism yoki ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="mt-4">
        {filteredReports.length ? (
          <>
            <Table
              columns={columns}
              rows={paginatedReports}
              rowKey={(r) => r.id}
              renderMobileCard={(r) => (
                <div className="flex items-start justify-between gap-3 p-3 border border-line rounded-xl bg-card">
                  <div>
                    <p className="font-bold text-ink">{r.targetTitle}</p>
                    <p className="text-2xs text-muted">{categoryLabels[r.reasonType] || r.reasonType}</p>
                    <Badge tone={getSeverityTone(r.severity)} size="sm" className="mt-1">
                      {r.severity}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedReport(r)}>
                    Ko‘rish
                  </Button>
                </div>
              )}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalRows={filteredReports.length}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </>
        ) : (
          <Card className="py-12 text-center text-xs text-muted">
            Shikoyatlar mavjud emas.
          </Card>
        )}
      </div>

      {/* Report Inspection Modal */}
      {selectedReport && (
        <Modal
          open={Boolean(selectedReport)}
          onClose={() => setSelectedReport(null)}
          title={`Shikoyatni tekshirish #${selectedReport.id}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  tone="danger"
                  onClick={() => {
                    setActionOutcome("action_taken");
                    setActionModalOpen(true);
                  }}
                >
                  Sanksiya qo‘llash (Action Taken)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setActionOutcome("dismissed");
                    setActionModalOpen(true);
                  }}
                >
                  Asossiz deb yopish (Dismiss)
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
                Yopish
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-line bg-surface/60 p-3">
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Shikoyat qilingan:</span>
                <p className="font-bold text-ink mt-0.5">{selectedReport.targetTitle}</p>
                <p className="text-3xs text-muted font-mono">{selectedReport.targetId}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Shikoyat qiluvchi:</span>
                <p className="font-semibold text-ink mt-0.5">{selectedReport.reporterName}</p>
                <p className="text-3xs text-muted font-mono">{selectedReport.reporterId}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Toifa:</span>
                <p className="font-semibold text-ink mt-0.5">{categoryLabels[selectedReport.reasonType] || selectedReport.reasonType}</p>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-muted">Xavflilik:</span>
                <Badge tone={getSeverityTone(selectedReport.severity)} size="sm" className="mt-0.5">
                  {selectedReport.severity.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div>
              <span className="text-3xs uppercase font-bold text-muted block mb-1">Shikoyat bayoni & dalillar:</span>
              <div className="rounded-xl border border-line bg-card p-3.5 text-xs text-ink leading-relaxed whitespace-pre-wrap">
                {selectedReport.description}
              </div>
            </div>

            {selectedReport.evidenceUrl && (
              <div>
                <span className="text-3xs uppercase font-bold text-muted block mb-1">Biriktirilgan fayl / havola:</span>
                <p className="text-primary hover:underline">
                  <a href={selectedReport.evidenceUrl} target="_blank" rel="noreferrer">{selectedReport.evidenceUrl}</a>
                </p>
              </div>
            )}

            {/* Operator Notes on this report */}
            <InternalNotesWidget targetId={selectedReport.id} targetType="report" />
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      {selectedReport && (
        <DangerousActionModal
          open={actionModalOpen}
          onClose={() => setActionModalOpen(false)}
          title={
            actionOutcome === "action_taken"
              ? "Shikoyat bo‘yicha sanksiya qo‘llash"
              : "Shikoyatni asossiz deb rad etish"
          }
          description={
            actionOutcome === "action_taken"
              ? `"${selectedReport.targetTitle}" bo‘yicha ogohlantirish yoki cheklov qayd etiladi va shikoyat yopiladi.`
              : "Ushbu shikoyatda qoidabuzarlik alomatlari topilmadi va u arxivlanadi."
          }
          impactDetails={[
            "Qaror audit jurnalida qayd etiladi",
            "Foydalanuvchi ishonch reytingi qayta hisoblanadi",
          ]}
          confirmLabel={actionOutcome === "action_taken" ? "Sanksiyani tasdiqlash" : "Rad etishni tasdiqlash"}
          confirmTone={actionOutcome === "action_taken" ? "danger" : "primary"}
          onConfirm={(reason) => {
            updateTrustReport(selectedReport.id, actionOutcome === "action_taken" ? "resolved" : "dismissed", reason);
            load();
            setActionModalOpen(false);
            setSelectedReport(null);
          }}
        />
      )}
    </div>
  );
}
