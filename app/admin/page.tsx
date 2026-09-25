"use client";

/**
 * Bosqich 17 — real backend: `getAdminCounters()` (bir nechta real
 * `staff/*` navbatning `total`i) + `staffListAuditLogs()` (so'nggi
 * harakatlar). Eski mock `getAdminData()`/`getAuditEvents()` — butun
 * bazani (foydalanuvchi/xizmat/shartnoma/bosqich/KYC/report/ticket)
 * bitta chaqiruvda qaytarardi; real backendda bunday endpoint yo'q va
 * bo'lishi ham kerak emas (bo'lim 91-J).
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminPageHeader, MetricCard } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { getAdminCounters, staffListAuditLogs, type AdminCounters, type StaffAuditLogRow } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";
import { adminHref } from "@/lib/admin-routes";

export default function AdminDashboard() {
  const pathname = usePathname();
  const [counters, setCounters] = useState<AdminCounters | null>(null);
  const [auditLog, setAuditLog] = useState<StaffAuditLogRow[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([getAdminCounters(), staffListAuditLogs({ page: 1, perPage: 8 })])
      .then(([stats, audit]) => {
        setCounters(stats);
        setAuditLog(audit.items);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  if (loadError) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Operatsion Boshqaruv Markazi" description="Bozor faoliyati va operator harakatlari." />
        <ErrorState error={loadError} onRetry={load} />
      </div>
    );
  }

  if (!counters) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Operatsion Boshqaruv Markazi" description="Bozor faoliyati va operator harakatlari." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Operatsion Boshqaruv Markazi" description="Bobo&Doda bozorining jonli faoliyati va xavfsizlik navbatlari." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Foydalanuvchilar" value={counters.totalUsers} detail="Jami ro'yxatdan o'tganlar" tone="primary" />
        <MetricCard label="Xizmatlar" value={counters.totalServices} detail="Jami e'lon qilingan" />
        <MetricCard label="Shartnomalar" value={counters.totalContracts} detail="Jami tuzilgan" />
        <MetricCard label="Ochiq Nizolar" value={counters.openDisputes} detail="Arbitraj kutmoqda" tone={counters.openDisputes > 0 ? "danger" : "success"} />
      </section>

      <section className="grid gap-3.5 sm:grid-cols-2">
        <Link href={adminHref("/nizolar", pathname)} className="group flex flex-col justify-between rounded-2xl border border-line bg-card p-4 transition-all duration-150 hover:border-primary hover:shadow-md">
          <h3 className="text-xs font-bold text-ink group-hover:text-primary transition-colors">Nizolar markazi</h3>
          <p className="text-3xs text-muted mt-0.5">{counters.openDisputes} ta ochiq nizo ko'rib chiqilishi kerak</p>
        </Link>
        <Link href={adminHref("/tolovlar", pathname)} className="group flex flex-col justify-between rounded-2xl border border-line bg-card p-4 transition-all duration-150 hover:border-primary hover:shadow-md">
          <h3 className="text-xs font-bold text-ink group-hover:text-primary transition-colors">To'lovlar & Ledger</h3>
          <p className="text-3xs text-muted mt-0.5">To'lovlar, qaytarishlar va buxgalteriya yozuvlari</p>
        </Link>
      </section>

      <Card padding="lg" className="min-w-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
          <h2 className="font-heading text-sm font-bold text-ink">So'nggi Operator Harakatlari</h2>
          <Link href={adminHref("/audit", pathname)} className="text-xs font-semibold text-primary hover:underline shrink-0">
            To'liq jurnal →
          </Link>
        </div>
        <div className="space-y-2.5 max-h-72 overflow-y-auto pt-1">
          {auditLog.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted italic">Hozircha audit yozuvlari mavjud emas.</p>
          ) : (
            auditLog.map((event) => (
              <div key={event.id} className="flex items-start justify-between rounded-xl border border-line bg-surface/40 p-2.5 text-xs hover:bg-surface transition">
                <div className="min-w-0 pr-3">
                  <p className="font-bold text-ink">{event.action}</p>
                  <p className="text-2xs text-muted truncate mt-0.5">
                    <span className="font-semibold text-ink/80">{event.actorName}</span> · {event.resourceType} <span className="font-mono">#{event.resourceId.slice(0, 8)}</span>
                  </p>
                </div>
                <span className="text-3xs text-muted whitespace-nowrap shrink-0">{formatDate(event.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
