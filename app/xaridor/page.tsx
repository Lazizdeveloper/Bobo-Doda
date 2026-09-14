"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { ContractStatusBadge } from "@/components/shared/StatusBadge";
import { contractsService, milestonesService, usersService } from "@/lib/api";
import type { Contract, Milestone } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

/**
 * Bosqich 17 — real backendda Job/Proposal/Message modellari yo'q, shuning
 * uchun "Ish e'lonlarim"/"Kelgan takliflar"/"So'nggi xabarlar" bloklari
 * olib tashlangan. Harakat markazi endi FAQAT real signallardan: to'lov
 * kutayotgan shartnomalar (`!fundedAt`) va ko'rib chiqilishi kerak bosqichlar.
 */
export default function XaridorDashboardPage() {
  const { t, lang } = useT();
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [name, setName] = useState("");
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([contractsService.list(), milestonesService.listMine(), usersService.getCurrent()])
      .then(([contractList, milestoneList, user]) => {
        setContracts(contractList);
        setMilestones(milestoneList);
        if (user) setName(user.fullName);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;

  const loading = !contracts || !milestones;

  const activeContracts = contracts?.filter((c) => c.status === "faol") || [];
  const contractById = new Map(contracts?.map((c) => [c.id, c]));

  const toReview = (milestones ?? []).filter(
    (m) => m.status === "topshirildi" && contractById.get(m.contractId)?.status === "faol",
  );
  const fundNeeded = (contracts ?? []).filter((c) => c.status === "faol" && !c.fundedAt);
  const recentContracts = contracts?.slice(0, 5) ?? [];

  const totalSpent = (milestones ?? []).filter((m) => m.status === "qabul_qilindi").reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-card border border-line bg-surface p-6 shadow-card">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-ink tracking-tight">{t("dash.title")}</h1>
          {name && (
            <p className="mt-1 text-sm text-muted font-medium">
              {t("dash.greeting")}, {name.split(" ")[0]}
            </p>
          )}
        </div>
        <Link href="/xaridor/bozor">
          <Button>{t("bdash.findSpecialist")}</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-8 w-16" />
            </Card>
          ))
        ) : (
          <>
            <Card className="flex flex-col justify-center border-l-4 border-l-primary">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("bdash.totalSpent")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">{formatMoney(totalSpent, lang)}</p>
            </Card>
            <Card className="flex flex-col justify-center border-l-4 border-l-success">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("bdash.activeProjects")}</p>
              <p className="mt-2 font-heading text-2xl font-black text-ink">{activeContracts.length}</p>
            </Card>
            <Card className="flex flex-col justify-center border-l-4 border-l-warning">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("bdash.toReview")}</p>
              <p className={`mt-2 font-heading text-2xl font-black ${toReview.length > 0 ? "text-warning" : "text-ink"}`}>{toReview.length}</p>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
        <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
          <section>
            <h2 className="font-heading text-xl font-bold text-ink mb-4">{t("bdash.actionCenter")}</h2>

            {loading ? (
              <SkeletonCard />
            ) : toReview.length === 0 && fundNeeded.length === 0 ? (
              <Card className="text-center py-12 border-dashed">
                <h3 className="font-heading text-lg font-bold text-ink">{t("bdash.allCaughtUp")}</h3>
                <p className="text-sm text-muted mt-1">{t("bdash.noActions")}</p>
              </Card>
            ) : (
              <Card padding="none" stitch className="overflow-hidden">
                {fundNeeded.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/xaridor/shartnomalar/${c.id}`}
                    className={`flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:bg-card-hover ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <div>
                      <p className="text-sm font-bold text-danger">{t("bdash.fundNeeded")}</p>
                      <p className="text-base font-medium text-ink mt-0.5">{c.title}</p>
                      <p className="text-xs text-muted mt-1">
                        {t("bdash.contractWith")} {c.sellerName} • {formatMoney(c.totalAmount, lang)}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm">
                      {t("bdash.fundBtn")}
                    </Button>
                  </Link>
                ))}

                {toReview.map((m, i) => {
                  const contract = contractById.get(m.contractId);
                  return (
                    <Link
                      key={m.id}
                      href={`/xaridor/shartnomalar/${m.contractId}`}
                      className={`flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:bg-card-hover ${i > 0 || fundNeeded.length > 0 ? "border-t border-line" : ""}`}
                    >
                      <div>
                        <p className="text-sm font-bold text-warning">{t("bdash.reviewSubmitted")}</p>
                        <p className="text-base font-medium text-ink mt-0.5">{m.title}</p>
                        <p className="text-xs text-muted mt-1">
                          {contract?.title} • {formatMoney(m.amount, lang)}
                        </p>
                      </div>
                      {m.reviewDeadline && <CountdownBadge deadline={m.reviewDeadline} />}
                    </Link>
                  );
                })}
              </Card>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6 min-w-0">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold text-ink">{t("bdash.recentContracts")}</h2>
              <Link href="/xaridor/shartnomalar" className="text-sm font-medium text-primary hover:underline">
                {t("dash.viewAll")}
              </Link>
            </div>

            {loading ? (
              <SkeletonCard />
            ) : recentContracts.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-sm text-muted">{t("contracts.emptyAll")}</p>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {recentContracts.map((contract) => (
                  <Link key={contract.id} href={`/xaridor/shartnomalar/${contract.id}`} className="block">
                    <Card hoverable padding="md" className="flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-ink text-sm line-clamp-1">{contract.title}</h3>
                        <ContractStatusBadge status={contract.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-muted">{contract.sellerName}</span>
                        <span className="font-bold text-ink">{formatMoney(contract.totalAmount, lang)}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <Card className="bg-primary/5 border-primary/20">
            <h3 className="font-bold text-primary mb-2">{t("bdash.helpTeaserTitle")}</h3>
            <p className="text-sm text-muted mb-4">{t("bdash.helpTeaserBody")}</p>
            <Link href="/xaridor/yordam">
              <Button variant="secondary" className="w-full">
                {t("bdash.helpTeaserBtn")}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
