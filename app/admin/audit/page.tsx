"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminPageHeader, MetricCard, Pagination } from "@/components/admin/AdminUI";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { getAuditEvents, getAdminData } from "@/lib/api/admin";
import type { AuditEvent } from "@/lib/admin-types";
import type { Milestone } from "@/lib/types";
import { formatDate, formatTime, formatMoney } from "@/lib/format";

export default function AuditPage() {
  const [tab, setTab] = useState<"audit" | "analytics">("audit");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [adminData, setAdminData] = useState<ReturnType<typeof getAdminData> | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setEvents(getAuditEvents());
    setAdminData(getAdminData());
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [tab]);

  const analyticsData = useMemo(() => {
    if (!adminData) return null;
    const users = adminData.users;
    const contracts = adminData.contracts;
    const verifications = adminData.verifications;
    const disputes = adminData.disputes;
    const jobs = adminData.jobs;

    // 1. User distribution
    const buyersCount = users.filter((u) => u.role === "xaridor").length;
    const specialistsCount = users.filter((u) => u.role === "mutaxassis").length;

    // 2. Contract completion rate
    const completedContracts = contracts.filter((c) => c.status === "yakunlangan").length;
    const activeContracts = contracts.filter((c) => c.status === "faol").length;
    const cancelledContracts = contracts.filter((c) => c.status === "bekor_qilingan").length;
    const totalContracts = contracts.length || 1;
    const completionRate = Math.round((completedContracts / totalContracts) * 100);

    // 3. Verification conversion
    const totalKYC = verifications.length || 1;
    const approvedKYC = verifications.filter((v) => v.status === "tasdiqlangan").length;
    const kycConversion = Math.round((approvedKYC / totalKYC) * 100);

    // 4. Job category distribution
    const categoryCounts: Record<string, number> = {};
    jobs.forEach((j) => {
      categoryCounts[j.category] = (categoryCounts[j.category] || 0) + 1;
    });

    // 5. Financial volume and mock commissions (10% of completed milestones)
    let milestones: Milestone[] = [];
    try {
      milestones = JSON.parse(localStorage.getItem("sb2_milestones") || "[]");
    } catch {
      milestones = [];
    }
    const completedMilestoneSum = milestones
      .filter((m) => m.status === "qabul_qilindi")
      .reduce((sum: number, m) => sum + m.amount, 0);

    const activeEscrowSum = milestones
      .filter((m) => ["mablaglangan", "topshirildi", "ozgartirish_soraldi"].includes(m.status))
      .reduce((sum: number, m) => sum + m.amount, 0);

    const systemRevenue = completedMilestoneSum * 0.1;

    return {
      buyersCount,
      specialistsCount,
      completedContracts,
      activeContracts,
      cancelledContracts,
      completionRate,
      approvedKYC,
      totalKYC: verifications.length,
      kycConversion,
      categoryCounts,
      completedMilestoneSum,
      activeEscrowSum,
      systemRevenue,
      disputesCount: disputes.length,
      resolvedDisputes: disputes.filter((d) => d.status === "hal_qilindi").length,
    };
  }, [adminData]);

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return events.slice(start, start + rowsPerPage);
  }, [events, currentPage, rowsPerPage]);

  const auditColumns: TableColumn<AuditEvent>[] = [
    { key: "admin", header: "Admin", render: (row) => <span className="font-medium text-ink">{row.adminName}</span> },
    { key: "action", header: "Amal / Hodisa", render: (row) => <span className="text-ink">{row.action}</span> },
    { key: "target", header: "Obyekt ID / Nomi", render: (row) => <span className="font-mono text-xs text-muted">{row.target}</span> },
    { key: "date", header: "Vaqt", render: (row) => <span className="text-xs text-muted">{formatDate(row.createdAt)} · {formatTime(row.createdAt)}</span> },
  ];

  return (
    <>
      <AdminPageHeader
        title="Auditorlik va Analitika Markazi"
        description="Faqat rahbariyat va bosh auditor uchun: ma'murlar auditi, tizim tranzaksiyalari va operatsion tahlillar."
      />

      {/* Tabs */}
      <Card padding="md" className="mb-6">
        <div className="flex border-b border-line pb-0.5">
          {[
            { id: "audit", label: "Adminlar amallari auditi (Audit Logs)" },
            { id: "analytics", label: "Tizim tahlili va ko'rsatkichlar (Analytics)" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as "audit" | "analytics")}
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

      {/* Tab 1: Audit logs */}
      {tab === "audit" && (
        events.length ? (
          <>
            <Table
              columns={auditColumns}
              rows={paginatedEvents}
              rowKey={(row) => row.id}
              renderMobileCard={(row) => (
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between font-semibold text-ink">
                    <span>{row.adminName}</span>
                    <span className="text-muted text-3xs">{formatDate(row.createdAt)} {formatTime(row.createdAt)}</span>
                  </div>
                  <p className="text-ink">{row.action}</p>
                  <p className="text-3xs text-muted font-mono mt-0.5">Obyekt: {row.target}</p>
                </div>
              )}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(events.length / rowsPerPage)}
              onPageChange={setCurrentPage}
              totalRows={events.length}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </>
        ) : (
          <Card className="py-12 text-center text-muted font-sans">Audit hodisalari hali mavjud emas.</Card>
        )
      )}

      {/* Tab 2: Analytics */}
      {tab === "analytics" && analyticsData && (
        <div className="flex flex-col gap-6">
          {/* Financials & Overview Cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Bitimlar aylanmasi (GMV)" value={formatMoney(analyticsData.completedMilestoneSum)} detail="Muvaffaqiyatli yakunlangan bosqichlar" tone="success" />
            <MetricCard label="Tizim komissiya daromadi" value={formatMoney(analyticsData.systemRevenue)} detail="10% komissiya yig'imi" tone="primary" />
            <MetricCard label="KYC Ariza Tasdiqlari" value={`${analyticsData.approvedKYC} / ${analyticsData.totalKYC}`} detail={`Konversiya: ${analyticsData.kycConversion}%`} tone="primary" />
            <MetricCard label="Nizolar Hal etilishi" value={`${analyticsData.resolvedDisputes} / ${analyticsData.disputesCount}`} detail="Ochiq arbitraj kelishuvlari" tone="warning" />
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            {/* User Growth & Distribution */}
            <Card padding="lg">
              <h3 className="font-heading text-sm font-bold text-ink border-b border-line pb-2 mb-4">Foydalanuvchilar taqsimoti</h3>
              
              <div className="flex items-center justify-around py-4">
                <div className="text-center">
                  <p className="font-heading text-3xl font-extrabold text-primary">{analyticsData.buyersCount}</p>
                  <p className="text-xs text-muted mt-1 uppercase font-semibold">Xaridorlar</p>
                </div>
                {/* SVG Doughnut chart */}
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#0E2E24" strokeWidth="3" />
                    {(() => {
                      const total = analyticsData.buyersCount + analyticsData.specialistsCount || 1;
                      const specPerc = (analyticsData.specialistsCount / total) * 100;
                      return (
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          stroke="#FFC53D"
                          strokeWidth="3.2"
                          strokeDasharray={`${specPerc} ${100 - specPerc}`}
                        />
                      );
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-sm font-heading font-extrabold text-ink">
                      {Math.round((analyticsData.specialistsCount / (analyticsData.buyersCount + analyticsData.specialistsCount || 1)) * 100)}%
                    </p>
                    <p className="text-3xs text-muted uppercase">Mutaxassis</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-heading text-3xl font-extrabold text-accent">{analyticsData.specialistsCount}</p>
                  <p className="text-xs text-muted mt-1 uppercase font-semibold">Mutaxassislar</p>
                </div>
              </div>

              <div className="mt-4 text-xs text-muted border-t border-line/10 pt-3 leading-relaxed">
                Tizimdagi jami mutaxassislar soni xaridorlarga nisbatan ustunlik qiladi. Bu yuqori raqobatbardosh bozorni bildiradi.
              </div>
            </Card>

            {/* Contract completion metrics */}
            <Card padding="lg">
              <h3 className="font-heading text-sm font-bold text-ink border-b border-line pb-2 mb-4">Shartnoma yakunlanishi</h3>
              
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-ink mb-1.5">
                    <span>Shartnomalar muvaffaqiyati (Completion Rate)</span>
                    <span className="text-primary">{analyticsData.completionRate}%</span>
                  </div>
                  <div className="h-3 w-full bg-card-hover rounded-full overflow-hidden border border-line/20">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${analyticsData.completionRate}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                  <div className="bg-card-hover rounded p-2 border border-line/10">
                    <p className="font-semibold text-success">{analyticsData.completedContracts}</p>
                    <p className="text-3xs text-muted uppercase mt-0.5">Yakunlandi</p>
                  </div>
                  <div className="bg-card-hover rounded p-2 border border-line/10">
                    <p className="font-semibold text-warning">{analyticsData.activeContracts}</p>
                    <p className="text-3xs text-muted uppercase mt-0.5">Faol (Active)</p>
                  </div>
                  <div className="bg-card-hover rounded p-2 border border-line/10">
                    <p className="font-semibold text-danger">{analyticsData.cancelledContracts}</p>
                    <p className="text-3xs text-muted uppercase mt-0.5">{"Bekor bo'ldi"}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Category Performance */}
            <Card padding="lg" className="md:col-span-2">
              <h3 className="font-heading text-sm font-bold text-ink border-b border-line pb-2 mb-4">{"Kategoriyalar bo'yicha ish hajmlari"}</h3>
              
              <div className="flex flex-col gap-3">
                {Object.entries(analyticsData.categoryCounts).map(([cat, count]) => {
                  const maxCount = Math.max(...Object.values(analyticsData.categoryCounts), 1);
                  const widthPercent = Math.round((count / maxCount) * 100);
                  const displayCat = cat.charAt(0).toUpperCase() + cat.slice(1);
                  return (
                    <div key={cat} className="flex items-center gap-4 text-xs">
                      <span className="w-24 font-medium text-ink truncate">{displayCat}</span>
                      <div className="flex-1 h-4 bg-card-hover rounded overflow-hidden relative border border-line/10">
                        <div
                          className="h-full bg-accent rounded"
                          style={{ width: `${widthPercent}%` }}
                        />
                        <span className="absolute inset-y-0 right-2 flex items-center text-3xs font-semibold text-ink">
                          {count}{" ta e'lon"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
