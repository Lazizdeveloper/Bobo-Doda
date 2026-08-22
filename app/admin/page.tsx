"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AdminPageHeader, MetricCard } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { getAdminData, getAuditEvents } from "@/lib/api/admin";
import { formatMoney, formatDate } from "@/lib/format";
import type { AuditEvent } from "@/lib/admin-types";
import type { Milestone } from "@/lib/types";

type Data = ReturnType<typeof getAdminData>;

export default function AdminDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);

  useEffect(() => {
    setData(getAdminData());
    setAuditLog(getAuditEvents().slice(0, 8));
  }, []);

  const stats = useMemo(() => {
    if (!data)
      return {
        escrowTotal: 0,
        payoutsTotal: 0,
        commissionTotal: 0,
        totalGMV: 0,
        disputeRate: "0%",
        pendingKYC: 0,
        openDisputes: 0,
        pendingWithdrawals: 0,
        openReports: 0,
        openTickets: 0,
        pendingAppeals: 0,
        totalUrgent: 0,
      };

    let milestones: Milestone[] = [];
    try {
      milestones = JSON.parse(localStorage.getItem("sb2_milestones") || "[]");
    } catch {
      milestones = data.milestones;
    }

    const escrow = milestones
      .filter((m) =>
        ["mablaglangan", "topshirildi", "ozgartirish_soraldi"].includes(m.status)
      )
      .reduce((sum: number, m) => sum + m.amount, 0);

    const completedTotal = milestones
      .filter((m) => m.status === "qabul_qilindi")
      .reduce((sum: number, m) => sum + m.amount, 0);

    const commissions = Math.round(completedTotal * 0.1);
    const totalGMV = data.contracts.reduce((sum, c) => sum + c.totalAmount, 0);

    const pendingKYC = data.verifications.filter(
      (v) => v.status === "korib_chiqilmoqda"
    ).length;
    const openDisputes = data.disputes.filter(
      (d) => d.status !== "hal_qilindi"
    ).length;
    const pendingWithdrawals = data.withdrawals.filter(
      (w) => w.status === "kutilmoqda"
    ).length;
    const openReports = data.reports.filter(
      (r) => r.status === "new" || r.status === "investigating"
    ).length;
    const openTickets = data.tickets.filter((t) => t.status === "ochiq").length;
    const pendingAppeals = data.appeals.filter(
      (a) => a.status === "pending"
    ).length;

    const totalUrgent =
      pendingKYC +
      openDisputes +
      pendingWithdrawals +
      openReports +
      openTickets +
      pendingAppeals;

    const disputeRate =
      data.contracts.length > 0
        ? `${((data.disputes.length / data.contracts.length) * 100).toFixed(1)}%`
        : "0%";

    return {
      escrowTotal: escrow,
      commissionTotal: commissions,
      totalGMV,
      disputeRate,
      pendingKYC,
      openDisputes,
      pendingWithdrawals,
      openReports,
      openTickets,
      pendingAppeals,
      totalUrgent,
    };
  }, [data]);

  if (!data) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Operatsion Boshqaruv Markazi"
          description="Bozor faoliyati, xavfli navbatlar va operator harakatlari."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const actionQueues = [
    {
      label: "KYC Arizalari",
      count: stats.pendingKYC,
      href: "/admin/verifikatsiya",
      desc: "Shaxsni tasdiqlovchi passport va ID tekshiruvi",
      icon: "🛡️",
      tone: stats.pendingKYC > 0 ? "warning" : ("neutral" as BadgeTone),
    },
    {
      label: "Arbitraj & Nizolar",
      count: stats.openDisputes,
      href: "/admin/nizolar",
      desc: "Buyurtmachi va ijrochi o‘rtasidagi da'volar",
      icon: "⚖️",
      tone: stats.openDisputes > 0 ? "danger" : ("neutral" as BadgeTone),
    },
    {
      label: "Pul Yechish So'rovlari",
      count: stats.pendingWithdrawals,
      href: "/admin/tolovlar",
      desc: "Mutaxassislar kartasiga to'lovlarni tasdiqlash",
      icon: "💳",
      tone: stats.pendingWithdrawals > 0 ? "warning" : ("neutral" as BadgeTone),
    },
    {
      label: "Xavfsizlik Shikoyatlari",
      count: stats.openReports,
      href: "/admin/shikoyatlar",
      desc: "Scam, off-platform to'lov va plagiat signallari",
      icon: "🚨",
      tone: stats.openReports > 0 ? "danger" : ("neutral" as BadgeTone),
    },
    {
      label: "Yordam Chiptalari",
      count: stats.openTickets,
      href: "/admin/yordam",
      desc: "Foydalanuvchilarning ochiq murojaatlari",
      icon: "🎫",
      tone: stats.openTickets > 0 ? "primary" : ("neutral" as BadgeTone),
    },
    {
      label: "Hisob Apellyatsiyalari",
      count: stats.pendingAppeals,
      href: "/admin/apellyatsiyalar",
      desc: "Bloklangan foydalanuvchilarning qayta tiklash arizalari",
      icon: "🔄",
      tone: stats.pendingAppeals > 0 ? "warning" : ("neutral" as BadgeTone),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Operatsion Boshqaruv Markazi"
        description="Bobo&Doda bozorining jonli faoliyati, xavfsizlik navbatlari va moliyaviy oqimlari."
      />

      {/* Top Level Metric Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tizim Savdo Hajmi (GMV)"
          value={formatMoney(stats.totalGMV)}
          detail={`Jami ${data.contracts.length} ta shartnoma bo'yicha`}
          tone="primary"
        />
        <MetricCard
          label="Escrow Himoyasida"
          value={formatMoney(stats.escrowTotal)}
          detail="Bajarilayotgan faol bosqichlar mablag'i"
          tone="warning"
        />
        <MetricCard
          label="Platforma Sof Daromadi"
          value={formatMoney(stats.commissionTotal)}
          detail="Yig'ilgan 10% xizmat haqi"
          tone="success"
        />
        <MetricCard
          label="Tezkor Ko‘rib Chiqishlar"
          value={stats.totalUrgent}
          detail={`Nizo: ${stats.openDisputes} · KYC: ${stats.pendingKYC} · Shikoyat: ${stats.openReports}`}
          tone={stats.totalUrgent > 0 ? "danger" : "success"}
        />
      </section>

      {/* Actionable Queues Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-ink flex items-center gap-2">
              <span>⚡</span> Diqqat Talab Qiluvchi Operatsion Navbatlar
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Ushbu bo‘limlar zudlik bilan insoniy qaror va moderatorlik aralashuvini talab qiladi.
            </p>
          </div>
          <Badge tone={stats.totalUrgent > 0 ? "danger" : "success"}>
            {stats.totalUrgent > 0 ? `${stats.totalUrgent} ta kutmoqda` : "Navbatlar bo'sh"}
          </Badge>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {actionQueues.map((queue) => (
            <Link
              key={queue.label}
              href={queue.href}
              className="group flex flex-col justify-between rounded-2xl border border-line bg-card p-4 transition-all duration-150 hover:border-primary hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-lg border border-line group-hover:scale-105 transition-transform">
                    {queue.icon}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-ink group-hover:text-primary transition-colors">
                      {queue.label}
                    </h3>
                    <p className="text-3xs text-muted mt-0.5 leading-relaxed">{queue.desc}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                <Badge tone={queue.tone} size="sm">
                  {queue.count > 0 ? `${queue.count} ta kutilmoqda` : "Navbat toza"}
                </Badge>
                <span className="text-2xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                  Ochish →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Marketplace Health & Live Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Platform Overview stats */}
        <Card padding="lg" className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="font-heading text-sm font-bold text-ink">Bozor Holati</h2>
            <span className="flex items-center gap-1.5 text-3xs font-semibold text-success">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Real-vaqt
            </span>
          </div>

          <dl className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Foydalanuvchilar:</dt>
              <dd className="font-bold text-ink">{data.users.length} nafar</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Mutaxassislar:</dt>
              <dd className="font-semibold text-primary">
                {data.users.filter((u) => u.role === "mutaxassis").length} nafar
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Xaridorlar:</dt>
              <dd className="font-semibold text-ink">
                {data.users.filter((u) => u.role === "xaridor").length} nafar
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Faol Xizmatlar:</dt>
              <dd className="font-semibold text-ink">
                {data.services.filter((s) => s.status === "active").length} ta
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Ochiq E&apos;lonlar:</dt>
              <dd className="font-semibold text-ink">
                {data.jobs.filter((j) => j.status === "ochiq").length} ta
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2">
              <dt className="text-muted">Nizolar Ulushi:</dt>
              <dd className="font-bold text-ink">{stats.disputeRate}</dd>
            </div>
          </dl>
        </Card>

        {/* Live Audit Log */}
        <Card padding="lg" className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-heading text-sm font-bold text-ink">
                So‘nggi Operator Harakatlari & Audit Jurnali
              </h2>
              <p className="text-3xs text-muted">Barcha xavfsizlik va moliyaviy operatsiyalar qayd etilmoqda.</p>
            </div>
            <Link
              href="/admin/audit"
              className="text-xs font-semibold text-primary hover:underline"
            >
              To‘liq jurnal →
            </Link>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pt-1">
            {auditLog.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted italic">
                Hozircha audit yozuvlari mavjud emas.
              </p>
            ) : (
              auditLog.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between rounded-xl border border-line bg-surface/40 p-2.5 text-xs hover:bg-surface transition"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-ink">{event.action}</p>
                    <p className="text-2xs text-muted truncate mt-0.5">
                      <span className="font-semibold text-ink/80">{event.adminName}</span> · Ob&apos;ekt:{" "}
                      <span className="font-mono">{event.target}</span>
                      {event.details && ` · ${event.details}`}
                    </p>
                  </div>
                  <span className="text-3xs text-muted whitespace-nowrap shrink-0">
                    {formatDate(event.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

