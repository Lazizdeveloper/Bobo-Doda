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
import { getAdminCounters, staffListAuditLogs, hasPermission, type AdminCounters, type StaffAuditLogRow } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";
import { adminHref } from "@/lib/admin-routes";
import { useT } from "@/lib/i18n";
import { formatAuditAction, formatAuditResource, formatAuditActorName } from "@/lib/audit-format";

export default function AdminDashboard() {
  const pathname = usePathname();
  const { lang } = useT();
  const [counters, setCounters] = useState<AdminCounters | null>(null);
  const [auditLog, setAuditLog] = useState<StaffAuditLogRow[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    const canSeeAudit = hasPermission("audit");
    Promise.all([
      getAdminCounters(),
      canSeeAudit
        ? staffListAuditLogs({ page: 1, perPage: 8 })
            .then((audit) => audit?.items ?? [])
            .catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([stats, auditItems]) => {
        setCounters(stats);
        setAuditLog(auditItems);
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

  const metricCards = [
    hasPermission("users") && (
      <MetricCard key="users" label="Foydalanuvchilar" value={counters.totalUsers} detail="Jami ro'yxatdan o'tganlar" tone="primary" />
    ),
    hasPermission("services") && (
      <MetricCard key="services" label="Xizmatlar" value={counters.totalServices} detail="Jami e'lon qilingan" />
    ),
    hasPermission("jobs") && (
      <MetricCard key="jobs" label="Ish E'lonlari" value={counters.totalJobs} detail="Ochiq loyihalar" />
    ),
    hasPermission("orders") && (
      <MetricCard key="orders" label="Shartnomalar" value={counters.totalContracts} detail="Jami tuzilgan" />
    ),
    hasPermission("kyc") && (
      <MetricCard key="kyc" label="Verifikatsiya (KYC)" value={counters.pendingKyc} detail="Kutilayotgan arizalar" tone={counters.pendingKyc > 0 ? "warning" : "primary"} />
    ),
    hasPermission("disputes") && (
      <MetricCard key="disputes" label="Ochiq Nizolar" value={counters.openDisputes} detail="Arbitraj kutmoqda" tone={counters.openDisputes > 0 ? "danger" : "success"} />
    ),
    hasPermission("payments") && (
      <MetricCard key="payments" label="Pul Chiqarish" value={counters.pendingWithdrawals} detail="Kutilayotgan so'rovlar" tone={counters.pendingWithdrawals > 0 ? "warning" : "primary"} />
    ),
  ].filter(Boolean);

  const quickLinks = [
    hasPermission("disputes") && {
      key: "disputes",
      href: adminHref("/nizolar", pathname),
      title: "Nizolar markazi",
      desc: `${counters.openDisputes} ta ochiq nizo ko'rib chiqilishi kerak`,
    },
    hasPermission("payments") && {
      key: "payments",
      href: adminHref("/tolovlar", pathname),
      title: "To'lovlar & Ledger",
      desc: "To'lovlar, qaytarishlar va buxgalteriya yozuvlari",
    },
    hasPermission("kyc") && {
      key: "kyc",
      href: adminHref("/verifikatsiya", pathname),
      title: "Verifikatsiya Navbati",
      desc: `${counters.pendingKyc} ta ariza ko'rib chiqish kutmoqda`,
    },
    hasPermission("jobs") && {
      key: "jobs",
      href: adminHref("/loyihalar", pathname),
      title: "Ish E'lonlari",
      desc: `${counters.totalJobs} ta ochiq loyiha navbatda`,
    },
    hasPermission("services") && {
      key: "services",
      href: adminHref("/xizmatlar", pathname),
      title: "Xizmatlar Moderatsiyasi",
      desc: `${counters.totalServices} ta e'lon qilingan xizmat`,
    },
    hasPermission("users") && {
      key: "users",
      href: adminHref("/foydalanuvchilar", pathname),
      title: "Foydalanuvchilar Boshqaruvi",
      desc: `${counters.totalUsers} ta ro'yxatdan o'tgan foydalanuvchi`,
    },
  ].filter(Boolean) as { key: string; href: string; title: string; desc: string }[];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Operatsion Boshqaruv Markazi" description="Bobololadono bozorining jonli faoliyati va xavfsizlik navbatlari." />

      {metricCards.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards}
        </section>
      )}

      {quickLinks.length > 0 && (
        <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group flex flex-col justify-between rounded-2xl border border-line bg-card p-4 transition-all duration-150 hover:border-primary hover:shadow-md"
            >
              <h3 className="text-xs font-bold text-ink group-hover:text-primary transition-colors">{item.title}</h3>
              <p className="text-3xs text-muted mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </section>
      )}

      {hasPermission("audit") && (
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
                    <p className="font-bold text-ink">{formatAuditAction(event.action, lang)}</p>
                    <p className="text-2xs text-muted truncate mt-0.5">
                      <span className="font-semibold text-ink/80">{formatAuditActorName(event.actorName, lang)}</span> · {formatAuditResource(event.resourceType, lang)}{" "}
                      {event.resourceId && (
                        <span className="font-mono text-primary font-medium">#{event.resourceId.slice(0, 8)}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-3xs text-muted whitespace-nowrap shrink-0">{formatDate(event.createdAt, lang)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
