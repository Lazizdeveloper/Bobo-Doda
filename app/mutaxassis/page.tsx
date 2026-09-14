"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { ContractStatusBadge } from "@/components/shared/StatusBadge";
import { contractsService, milestonesService, sellerApplicationService, servicesService, usersService } from "@/lib/api";
import type { Contract, Milestone, Service, VerificationStatus } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { sellerNet } from "@/lib/fees";
import { useT } from "@/lib/i18n";

/**
 * Bosqich 17 — real backendda Job/Proposal/Offer/Message modellari yo'q
 * (bo'lim 91-B "mock audit"), shuning uchun "Kelgan takliflar"/"Mos ish
 * e'lonlari"/"So'nggi xabarlar" bloklari va profil to'liqligi vidjeti
 * (mock'ning boy SellerProfile maydonlariga bog'liq — real backendda
 * doim to'liqsiz ko'rinardi) OLIB TASHLANGAN. O'rniga real ma'lumot:
 * daromad/faol shartnomalar statistikasi + so'nggi shartnomalar ro'yxati.
 */
export default function MutaxassisDashboardPage() {
  const { t, lang } = useT();
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [applicationStatus, setApplicationStatus] = useState<VerificationStatus | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([contractsService.list(), milestonesService.listMine(), servicesService.listMine(), usersService.getCurrent()])
      .then(([contractList, milestoneList, serviceList, user]) => {
        setContracts(contractList);
        setMilestones(milestoneList);
        setServices(serviceList);
        if (user) setName(user.fullName);
      })
      .catch(setLoadError);
    /* Ariza holati — asosiy yuklashni bloklamaydi (fon signalligi) */
    sellerApplicationService
      .getCurrent()
      .then((app) => setApplicationStatus(app?.status ?? null))
      .catch(() => setApplicationStatus(null));
  }, []);

  useEffect(load, [load]);

  const loading = !contracts || !milestones;

  const activeContracts = contracts?.filter((c) => c.status === "faol") || [];
  const pendingDecisions = contracts?.filter((c) => c.status === "imzolangan").length ?? 0;
  const totalEarnings = (milestones ?? [])
    .filter((m) => m.status === "qabul_qilindi")
    .reduce((sum, m) => sum + sellerNet(m.amount), 0);
  const recentContracts = [...(contracts ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="font-heading text-3xl font-extrabold text-ink">{t("dash.title")}</h1>
        {name && (
          <p className="mt-2 text-muted">
            {t("dash.greeting")}, {name.split(" ")[0]}
          </p>
        )}
      </div>

      {applicationStatus && applicationStatus !== "tasdiqlangan" && (
        <Card
          className={
            applicationStatus === "rad_etilgan"
              ? "border-danger/30 bg-danger/5"
              : "border-warning/30 bg-warning/5"
          }
        >
          <p className="font-heading text-sm font-bold text-ink">
            {applicationStatus === "rad_etilgan" ? t("dash.applicationRejected") : t("dash.applicationPending")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {applicationStatus === "rad_etilgan" ? t("dash.applicationRejectedDesc") : t("dash.applicationPendingDesc")}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-8 w-24" />
            </Card>
          ))
        ) : (
          <>
            <Card className="border-primary/20 bg-primary/5">
              <p className="text-xs font-bold uppercase text-primary-deep tracking-wider">{t("dash.netIncome")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">{formatMoney(totalEarnings, lang)}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase text-muted tracking-wider">{t("dash.activeContracts")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">{activeContracts.length}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase text-muted tracking-wider">{t("dash.pendingDecisions")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">{pendingDecisions}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase text-muted tracking-wider">{t("nav.services")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">{services.length}</p>
            </Card>
          </>
        )}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-bold text-ink">{t("dash.recentContracts")}</h2>
          <Link href="/mutaxassis/shartnomalar" className="text-sm font-medium text-primary hover:underline">
            {t("dash.viewAll")}
          </Link>
        </div>
        {loading ? (
          <SkeletonCard />
        ) : recentContracts.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-muted">{t("dash.noContracts")}</p>
          </Card>
        ) : (
          <Card padding="none" stitch>
            {recentContracts.map((c, i) => (
              <Link
                key={c.id}
                href={`/mutaxassis/shartnomalar/${c.id}`}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 hover:bg-card-hover transition-colors ${i > 0 ? "border-t border-line" : ""}`}
              >
                <div className="min-w-0">
                  <p className="font-bold text-ink text-base truncate">{c.title}</p>
                  <p className="text-sm text-muted mt-1">{formatDate(c.createdAt, lang)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-ink whitespace-nowrap text-sm">{formatMoney(c.totalAmount, lang)}</span>
                  <ContractStatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
