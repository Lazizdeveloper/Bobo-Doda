"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Table, type TableColumn } from "@/components/ui/Table";
import {
  getAdminData,
  resolveReport,
  suspendUser,
  advanceIncident,
  createIncident,
  getIncidents,
  type AdminIncident,
  type IncidentSeverity,
} from "@/lib/api/admin";
import { formatDate, formatTime } from "@/lib/format";
import type { Report } from "@/lib/types";

function severityTone(value: IncidentSeverity): BadgeTone {
  return value === "SEV-1" ? "danger" : value === "SEV-2" ? "warning" : "neutral";
}

export default function IncidentsPage() {
  const [tab, setTab] = useState<"conduct" | "infrastructure">("conduct");
  const [data, setData] = useState<ReturnType<typeof getAdminData> | null>(null);
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);

  // Search/Filters for User Reports
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState<"all" | "yangi" | "korib_chiqildi">("yangi");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection states for User Reports
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolveAction, setResolveAction] = useState<"resolve" | "ban" | null>(null);
  const [reportNotes, setReportNotes] = useState("");
  const [banDays, setBanDays] = useState<number | null>(7);
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [reportSearch, reportStatusFilter, tab]);

  // Infrastructure Incident States
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<AdminIncident | null>(null);
  const [title, setTitle] = useState("");
  const [impact, setImpact] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("SEV-2");
  const [incidentNote, setIncidentNote] = useState("");
  const [incidentError, setIncidentError] = useState("");

  function load() {
    setData(getAdminData());
    setIncidents(getIncidents());
  }

  useEffect(() => {
    load();
  }, []);

  const reportStats = useMemo(() => {
    if (!data) return { total: 0, newReports: 0, resolved: 0 };
    return {
      total: data.reports.length,
      newReports: data.reports.filter((r) => r.status === "yangi").length,
      resolved: data.reports.filter((r) => r.status === "korib_chiqildi").length,
    };
  }, [data]);

  const filteredReports = useMemo(() => {
    if (!data) return [];
    return data.reports.filter((r) => {
      // 1. Status Filter
      if (reportStatusFilter !== "all" && r.status !== reportStatusFilter) return false;

      // 2. Search Filter
      if (reportSearch.trim()) {
        const q = reportSearch.toLowerCase();
        const reporter = data.users.find((u) => u.id === r.reporterId);
        const target = data.users.find((u) => u.id === r.targetUserId);
        return (
          r.description.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          reporter?.fullName.toLowerCase().includes(q) ||
          target?.fullName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, reportStatusFilter, reportSearch]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredReports.slice(start, start + rowsPerPage);
  }, [filteredReports, currentPage, rowsPerPage]);

  const handleResolveReport = async () => {
    if (!selectedReport || !resolveAction) return;
    if (reportNotes.trim().length < 5) {
      setActionError("Qaror izohi kamida 5 ta belgidan iborat bo'lishi shart.");
      return;
    }

    setActionLoading(true);
    setActionError("");
    try {
      if (resolveAction === "ban") {
        // Suspend target user first
        suspendUser(selectedReport.targetUserId, `Shikoyat bo'yicha jazo (#${selectedReport.id}): ${reportNotes.trim()}`, banDays);
      }

      // Resolve report
      resolveReport(selectedReport.id, resolveAction === "ban" ? "resolved" : "dismissed", reportNotes.trim());
      setSelectedReport(null);
      setResolveAction(null);
      setReportNotes("");
      load();
    } catch {
      setActionError("Amalni bajarishda xatolik yuz berdi.");
    } finally {
      setActionLoading(false);
    }
  };

  // Infrastructure Incident Functions
  function handleCreateIncident(event: FormEvent) {
    event.preventDefault();
    setIncidentError("");
    try {
      createIncident({ title, impact, severity });
      setCreateOpen(false);
      setTitle("");
      setImpact("");
      load();
    } catch {
      setIncidentError("Sarlavha va foydalanuvchiga ta’sirini batafsil kiriting.");
    }
  }

  function handleAdvanceIncident() {
    if (!selectedIncident) return;
    setIncidentError("");
    try {
      advanceIncident(selectedIncident.id, incidentNote);
      setSelectedIncident(null);
      setIncidentNote("");
      load();
    } catch {
      setIncidentError("Timeline izohi kamida 5 belgidan iborat bo‘lishi kerak.");
    }
  }

  const reportReasonLabel = (reason: string) => {
    const map: Record<string, string> = {
      spam: "Spam / Keraksiz xabarlar",
      abuse: "Haqorat / Qo'pol muomala",
      fraud: "Firibgarlik / Aldov",
      harassment: "Tazyiq / Bezorilik",
      other: "Boshqa qoidabuzarlik",
    };
    return map[reason] || reason;
  };

  const reportColumns: TableColumn<Report>[] = [
    {
      key: "id",
      header: "Shikoyat ID",
      render: (r) => <span className="font-mono text-2xs text-ink">{r.id}</span>,
    },
    {
      key: "reporter",
      header: "Shikoyatchi",
      render: (r) => {
        const user = data?.users.find((u) => u.id === r.reporterId);
        return (
          <div>
            <p className="font-semibold text-ink">{user?.fullName || r.reporterId}</p>
            <p className="text-3xs text-muted">ID: {r.reporterId}</p>
          </div>
        );
      },
    },
    {
      key: "target",
      header: "Shikoyat qilinuvchi",
      render: (r) => {
        const user = data?.users.find((u) => u.id === r.targetUserId);
        return (
          <div>
            <p className="font-semibold text-ink text-danger">{user?.fullName || r.targetUserId}</p>
            <p className="text-3xs text-muted">ID: {r.targetUserId}</p>
          </div>
        );
      },
    },
    {
      key: "reason",
      header: "Turi",
      render: (r) => <Badge tone="danger">{reportReasonLabel(r.reason)}</Badge>,
    },
    {
      key: "createdAt",
      header: "Sana",
      render: (r) => <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>,
    },
    {
      key: "status",
      header: "Holati",
      render: (r) => (
        <Badge tone={r.status === "yangi" ? "warning" : "success"}>
          {r.status === "yangi" ? "Yangi" : "Ko'rib chiqilgan"}
        </Badge>
      ),
    },
    {
      key: "action",
      header: "Ko'rish",
      render: (r) => (
        <Button size="sm" variant="secondary" onClick={() => {
          setSelectedReport(r);
          setResolveAction(null);
          setReportNotes("");
          setActionError("");
        }}>
          {"Ko'rib chiqish"}
        </Button>
      ),
    },
  ];

  if (!data) return <p className="text-muted font-sans">Yuklanmoqda...</p>;

  return (
    <>
      <AdminPageHeader
        title="Incidentlar va Shikoyatlar navbati"
        description="Foydalanuvchilar conduct shikoyatlari moderatsiyasi, shuningdek platformadagi texnik uzilishlar yechimi markazi."
        action={
          tab === "infrastructure" ? (
            <Button onClick={() => setCreateOpen(true)}>Incident ochish</Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <Card padding="md">
        <div className="flex border-b border-line pb-0.5">
          {[
            { id: "conduct", label: "Foydalanuvchilar shikoyatlari (Reports)" },
            { id: "infrastructure", label: "Tizim hodisalari (System Incidents)" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as "conduct" | "infrastructure")}
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
      </Card>

      {/* Tab Content 1: User Reports Queue */}
      {tab === "conduct" && (
        <div className="mt-4 flex flex-col gap-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Jami Shikoyatlar" value={reportStats.total} detail="Barcha xulq-atvor arizalari" />
            <MetricCard label="Ko'rilmagan (Yangi)" value={reportStats.newReports} detail="Operativ moderatsiya kutilmoqda" tone="warning" />
            <MetricCard label="Hal etilgan" value={reportStats.resolved} detail="Yopilgan conduct ishlari" tone="success" />
          </section>

          {/* Search/Filter */}
          <Card padding="md">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[150px]">
                <select
                  aria-label="Holat bo'yicha filtr"
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value as "all" | "yangi" | "korib_chiqildi")}
                  className="w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-primary"
                >
                  <option value="yangi">Yangi shikoyatlar (New)</option>
                  <option value="korib_chiqildi">{"Ko'rib chiqilganlar"}</option>
                  <option value="all">Barcha shikoyatlar</option>
                </select>
              </div>
              <div className="w-full sm:w-64">
                <Input
                  aria-label="Qidirish"
                  placeholder="ID, tavsif, foydalanuvchi..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Table */}
          {filteredReports.length ? (
            <>
              <Table
                columns={reportColumns}
                rows={paginatedReports}
                rowKey={(r) => r.id}
                renderMobileCard={(r) => {
                  const rep = data.users.find((u) => u.id === r.reporterId);
                  const tar = data.users.find((u) => u.id === r.targetUserId);
                  return (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-danger">Qoidabuzar: {tar?.fullName || r.targetUserId}</p>
                        <p className="text-3xs text-muted">Arizachi: {rep?.fullName || r.reporterId}</p>
                        <p className="text-xs font-semibold text-primary mt-1">{reportReasonLabel(r.reason)}</p>
                        <p className="text-2xs text-muted mt-1 leading-snug italic">&quot;{r.description}&quot;</p>
                        <div className="mt-2.5">
                          <Badge tone={r.status === "yangi" ? "warning" : "success"}>
                            {r.status === "yangi" ? "Yangi" : "Ko'rib chiqilgan"}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => {
                        setSelectedReport(r);
                        setResolveAction(null);
                        setReportNotes("");
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
                totalPages={Math.ceil(filteredReports.length / rowsPerPage)}
                onPageChange={setCurrentPage}
                totalRows={filteredReports.length}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          ) : (
            <Card className="py-12 text-center text-muted font-sans">Shikoyatlar navbatda topilmadi.</Card>
          )}
        </div>
      )}

      {/* Tab Content 2: Infrastructure Incidents (Original functionality) */}
      {tab === "infrastructure" && (
        <div className="mt-4 flex flex-col gap-4">
          {incidents.length ? incidents.map((incident) => (
            <Card key={incident.id} padding="lg">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={severityTone(incident.severity)}>{incident.severity}</Badge>
                    <Badge tone={incident.status === "yopildi" ? "success" : "warning"}>
                      {incident.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <h2 className="mt-3 break-words font-heading text-base font-bold text-ink">{incident.title}</h2>
                  <p className="mt-2 break-words text-sm text-muted">{incident.impact}</p>
                  <p className="mt-3 text-2xs text-faint">IC: {incident.commander} · {formatDate(incident.createdAt)} {formatTime(incident.createdAt)}</p>
                </div>
                {incident.status !== "yopildi" && (
                  <Button size="sm" variant="secondary" onClick={() => setSelectedIncident(incident)}>
                    Holatni yangilash
                  </Button>
                )}
              </div>
              <ol className="mt-4 border-l border-line pl-4">
                {incident.timeline.map((item) => (
                  <li key={`${item.at}-${item.text}`} className="mb-3 last:mb-0">
                    <p className="break-words text-xs text-ink">{item.text}</p>
                    <p className="mt-0.5 text-2xs text-faint">{formatDate(item.at)} · {formatTime(item.at)}</p>
                  </li>
                ))}
              </ol>
            </Card>
          )) : <Card className="py-12 text-center text-muted font-sans">Hozircha ochilgan tizim incidentlari yo‘q.</Card>}
        </div>
      )}

      {/* User Report Detail/Action Modal */}
      <Modal
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Conduct shikoyatini arbitraj qilish"
      >
        {selectedReport && (
          <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="border-b border-line pb-3">
              <p className="text-2xs text-muted font-semibold uppercase">Shikoyat qilinayotgan shaxs</p>
              <h3 className="font-heading text-sm font-bold text-danger">
                {data.users.find((u) => u.id === selectedReport.targetUserId)?.fullName || selectedReport.targetUserId}
              </h3>
              <p className="text-3xs text-muted mt-0.5">ID: {selectedReport.targetUserId} · Roli: {data.users.find((u) => u.id === selectedReport.targetUserId)?.role}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-2xs text-ink bg-card-hover p-2.5 rounded-input border border-line/10">
              <div>
                <span className="text-muted">Arizachi: </span>
                <span className="font-semibold">{data.users.find((u) => u.id === selectedReport.reporterId)?.fullName || selectedReport.reporterId}</span>
              </div>
              <div>
                <span className="text-muted">Shikoyat turi: </span>
                <span className="font-semibold text-danger">{reportReasonLabel(selectedReport.reason)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted">Yuborilgan sana: </span>
                <span>{formatDate(selectedReport.createdAt)}</span>
              </div>
            </div>

            <div className="bg-card-hover p-2.5 rounded border border-line/10">
              <p className="text-2xs text-muted font-semibold uppercase mb-1">Qoidabuzarlik tavsifi:</p>
              <p className="text-xs text-ink italic leading-relaxed whitespace-pre-wrap">
                &quot;{selectedReport.description}&quot;
              </p>
            </div>

            {/* Actions if new */}
            {selectedReport.status === "yangi" && (
              <div className="flex flex-col gap-3 border-t border-line pt-3 mt-1">
                <div>
                  <p className="text-2xs text-muted font-semibold uppercase mb-1.5">Intizomiy chora</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setResolveAction("resolve")}
                      className={`border rounded-input px-2 py-2 text-2xs font-bold transition-all ${
                        resolveAction === "resolve"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-line bg-card hover:border-muted text-ink"
                      }`}
                    >
                      Ogohlantirish & Shikoyatni yopish
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolveAction("ban")}
                      className={`border rounded-input px-2 py-2 text-2xs font-bold transition-all ${
                        resolveAction === "ban"
                          ? "border-danger bg-danger/10 text-danger"
                          : "border-line bg-card hover:border-muted text-ink"
                      }`}
                    >
                      Bloklash (Suspend) + Yopish
                    </button>
                  </div>
                </div>

                {resolveAction === "ban" && (
                  <div className="bg-card-hover border border-line p-2.5 rounded-input">
                    <label className="text-2xs font-semibold text-muted block mb-1">Bloklash muddati</label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { label: "7 kun", value: 7 },
                        { label: "30 kun", value: 30 },
                        { label: "Doimiy", value: null },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setBanDays(opt.value)}
                          className={`border rounded-input px-2 py-1.5 text-3xs font-semibold transition-all ${
                            banDays === opt.value
                              ? "border-danger bg-danger/10 text-danger"
                              : "border-line bg-card hover:border-muted text-ink"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Textarea
                  label="Qaror tafsiloti va audit izohi (Kamida 5 ta belgi)"
                  placeholder="Qoidabuzarlik tekshirildi va ko'rilgan chora..."
                  value={reportNotes}
                  onChange={(e) => {
                    setReportNotes(e.target.value);
                    setActionError("");
                  }}
                  error={actionError}
                  required
                  maxLength={1000}
                />

                <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
                  <Button variant="ghost" className="justify-center" onClick={() => setSelectedReport(null)}>
                    Bekor qilish
                  </Button>
                  <Button variant="danger" className="justify-center" onClick={handleResolveReport} disabled={!resolveAction || !reportNotes.trim() || actionLoading}>
                    Qarorni tasdiqlash
                  </Button>
                </div>
              </div>
            )}

            {/* If closed */}
            {selectedReport.status === "korib_chiqildi" && (
              <div className="border-t border-line pt-3">
                <p className="text-2xs text-muted text-center">
                  Ushbu conduct shikoyati operatsiyasi yakunlangan.
                </p>
                {(() => {
                  try {
                    const notes = JSON.parse(localStorage.getItem("sb2_admin_report_notes") || "{}");
                    const resNotes = notes[selectedReport.id];
                    if (resNotes) {
                      return (
                        <div className="rounded bg-card-hover border border-line/10 p-2 text-2xs text-ink mt-2">
                          <p className="font-semibold text-muted">Yakuniy hukm:</p>
                          <p className="mt-0.5 whitespace-pre-wrap">{resNotes}</p>
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

      {/* Infrastructure Create Incident Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi incident">
        <form onSubmit={handleCreateIncident} className="flex flex-col gap-4">
          <Input label="Sarlavha" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
          <Select
            label="Og‘irlik"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
            options={[
              { value: "SEV-1", label: "SEV-1 — kritik" },
              { value: "SEV-2", label: "SEV-2 — yuqori" },
              { value: "SEV-3", label: "SEV-3 — cheklangan" },
            ]}
          />
          <Textarea label="Foydalanuvchiga ta’siri" value={impact} onChange={(e) => setImpact(e.target.value)} maxLength={1000} required error={incidentError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Bekor qilish</Button>
            <Button type="submit">E’lon qilish</Button>
          </div>
        </form>
      </Modal>

      {/* Infrastructure Advance Incident Modal */}
      <Modal open={!!selectedIncident} onClose={() => setSelectedIncident(null)} title="Incident timeline’ini yangilash">
        <p className="text-sm text-muted">Keyingi holat: <strong className="text-ink">{selectedIncident?.status === "ochiq" ? "Tekshirilmoqda" : selectedIncident?.status === "tekshirilmoqda" ? "Bartaraf etildi" : "Yopildi"}</strong></p>
        <div className="mt-4">
          <Textarea label="Bajarilgan ish va natija" value={incidentNote} onChange={(e) => setIncidentNote(e.target.value)} maxLength={1000} error={incidentError} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setSelectedIncident(null)}>Bekor qilish</Button>
          <Button onClick={handleAdvanceIncident}>Holatni o‘tkazish</Button>
        </div>
      </Modal>
    </>
  );
}
