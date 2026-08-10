"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AdminPageHeader, MetricCard } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
    setAuditLog(getAuditEvents().slice(0, 5));
  }, []);

  const stats = useMemo(() => {
    if (!data) return { escrowTotal: 0, payoutsTotal: 0, commissionTotal: 0, openRisks: 0 };
    
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

    const commissions = Math.round(completedTotal * 0.1);

    const pendingKYC = data.verifications.filter((v) => v.status === "korib_chiqilmoqda").length;
    const openDisputes = data.disputes.filter((d) => d.status !== "hal_qilindi").length;
    const pendingWithdrawals = data.withdrawals.filter((w) => w.status === "kutilmoqda").length;

    return {
      escrowTotal: escrow,
      commissionTotal: commissions,
      openRisks: pendingKYC + openDisputes + pendingWithdrawals,
      pendingKYC,
      openDisputes,
      pendingWithdrawals,
    };
  }, [data]);

  if (!data) {
    return (
      <>
        <AdminPageHeader
          title="Operatsion boshqaruv"
          description="Marketplace holati, xavfli navbatlar va kunlik operatsiyalar uchun yagona markaz."
        />
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </section>
        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SkeletonCard />
          </div>
          <SkeletonCard />
        </section>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Operatsion boshqaruv"
        description="Marketplace holati, xavfli navbatlar va kunlik operatsiyalar uchun yagona markaz."
      />

      {/* KPI Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tizim aylanmasi (GMV)"
          value={formatMoney(data.contracts.reduce((sum, c) => sum + c.totalAmount, 0))}
          detail="Jami shartnomalar qiymati"
          tone="primary"
        />
        <MetricCard
          label="Escrow'dagi faol mablag'"
          value={formatMoney(stats.escrowTotal)}
          detail="Muzlatilgan loyihalar byudjeti"
          tone="warning"
        />
        <MetricCard
          label="Tizim sof daromadi"
          value={formatMoney(stats.commissionTotal)}
          detail="Yig'ilgan 10% komissiyalar"
          tone="success"
        />
        <MetricCard
          label="Tezkor hal etiluvchi xavflar"
          value={stats.openRisks}
          detail={`Nizo: ${stats.openDisputes} · KYC: ${stats.pendingKYC} · Yechish: ${stats.pendingWithdrawals}`}
          tone={stats.openRisks > 0 ? "danger" : "success"}
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Urgent queues links */}
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-ink">Tezkor moderatsiya navbatlari</h2>
            <Badge tone="warning">Harakat talab qilinadi</Badge>
          </div>
          
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: "KYC Arizalari", count: stats.pendingKYC, href: "/admin/verifikatsiya", desc: "Mutaxassis shaxsini tasdiqlash" },
              { label: "Arbitraj nizolari", count: stats.openDisputes, href: "/admin/nizolar", desc: "Loyiha kelishmovchiliklarini yopish" },
              { label: "Yechish so'rovlari", count: stats.pendingWithdrawals, href: "/admin/tolovlar", desc: "Mablag' yechishni tasdiqlash" },
              { label: "Yordam murojaatlari", count: data.tickets.filter((t) => t.status === "ochiq").length, href: "/admin/yordam", desc: "Foydalanuvchilar support chiptalari" },
            ].map((queue) => (
              <Link
                key={queue.label}
                href={queue.href}
                className="rounded-input border border-line bg-card-hover p-4 transition-all hover:border-primary flex justify-between items-center group"
              >
                <div>
                  <p className="text-xs font-semibold text-ink group-hover:text-primary transition-colors">{queue.label}</p>
                  <p className="text-3xs text-muted mt-0.5">{queue.desc}</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-xl font-extrabold text-ink">{queue.count}</p>
                  <p className="text-3xs text-muted">kutilmoqda</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* System Activity Summary */}
        <Card padding="lg">
          <h2 className="font-heading text-base font-bold text-ink border-b border-line pb-3">Platforma hajmi</h2>
          <dl className="mt-3 flex flex-col gap-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted">{"Jami ro'yxatdan o'tganlar:"}</dt>
              <dd className="font-semibold text-ink">{data.users.length} ta foydalanuvchi</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Mustaqil mutaxassislar:</dt>
              <dd className="font-semibold text-accent">{data.users.filter((u) => u.role === "mutaxassis").length} ta freelancer</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{"Faol ish e'lonlari:"}</dt>
              <dd className="font-semibold text-ink">{data.jobs.filter((j) => j.status === "ochiq").length}{" ta e'lon"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Bozordagi xizmatlar:</dt>
              <dd className="font-semibold text-ink">{data.services.filter((s) => s.status === "active").length} ta xizmat</dd>
            </div>
          </dl>
        </Card>

        {/* Recent Audit Actions */}
        <Card padding="lg" className="lg:col-span-3">
          <h2 className="font-heading text-base font-bold text-ink border-b border-line pb-3">Oxirgi moderatorlik harakatlari</h2>
          <div className="mt-3 flex flex-col gap-3">
            {auditLog.length ? (
              auditLog.map((event) => (
                <div key={event.id} className="flex justify-between items-start text-xs border-b border-line/5 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-ink font-medium">{event.action}</p>
                    <p className="text-3xs text-muted mt-0.5">Moderator: {event.adminName} · Obyekt ID: {event.target}</p>
                  </div>
                  <span className="text-3xs text-muted whitespace-nowrap ml-2">
                    {formatDate(event.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted py-4 text-center">Moderatorlik amallari qayd etilmagan.</p>
            )}
          </div>
        </Card>
      </section>
    </>
  );
}
