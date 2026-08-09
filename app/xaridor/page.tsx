"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { ContractStatusBadge } from "@/components/shared/StatusBadge";
import { contractsService, jobsService, milestonesService, proposalsService, usersService } from "@/lib/api";
import type { Contract, Job, Milestone, Proposal } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function XaridorDashboardPage() {
  const { t, lang } = useT();
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [newProposals, setNewProposals] = useState<Map<string, number>>(new Map());
  const [name, setName] = useState("");
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      contractsService.list(),
      milestonesService.listMine(),
      usersService.getCurrent(),
      jobsService.listMine(),
    ])
      .then(async ([contractList, milestoneList, user, jobList]) => {
        setContracts(contractList);
        setMilestones(milestoneList);
        if (user) setName(user.fullName);
        setJobs(jobList);
        /* Har bir ochiq e'lon bo'yicha yangi (yuborilgan) takliflar soni */
        const counts = new Map<string, number>();
        const open = jobList.filter((j) => j.status === "ochiq");
        const results = await Promise.all(
          open.map((j) => proposalsService.listForJob(j.id))
        );
        open.forEach((job, i) => {
          const fresh = results[i].filter(
            (p: Proposal) => p.status === "yuborilgan"
          ).length;
          if (fresh > 0) counts.set(job.id, fresh);
        });
        setNewProposals(counts);
      })
      /* Yuklash xatosi bo'sh ro'yxat EMAS — alohida holat ko'rsatiladi */
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;

  const loading = !contracts || !jobs || !milestones;

  const activeCount = contracts?.filter((c) => c.status === "faol").length ?? 0;
  const openJobs = jobs?.filter((j) => j.status === "ochiq").length ?? 0;
  const contractById = new Map(contracts?.map((c) => [c.id, c]));

  /* Tekshirish kutayotgan (topshirilgan) bosqichlar — eng muhim harakat */
  const toReview = (milestones ?? []).filter(
    (m) =>
      m.status === "topshirildi" &&
      contractById.get(m.contractId)?.status === "faol"
  );
  const totalNewProposals = Array.from(newProposals.values()).reduce(
    (sum, n) => sum + n,
    0
  );

  /* To'lov kutayotgan (imzolangan) shartnomalar — xaridor to'lasa ish boshlanadi */
  const fundNeeded = (contracts ?? []).filter((c) => c.status === "imzolangan");

  const recentContracts = contracts?.slice(0, 3) ?? [];
  const jobById = new Map(jobs?.map((j) => [j.id, j]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">
            {t("dash.title")}
          </h1>
          {name && (
            <p className="mt-1 text-sm text-muted">
              {t("dash.greeting")}, {name.split(" ")[0]}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/xaridor/bozor">
            <Button variant="secondary" size="sm">
              {t("bdash.findSpecialist")}
            </Button>
          </Link>
          <Link href="/xaridor/elonlarim/yangi">
            <Button size="sm">{t("bdash.postJob")}</Button>
          </Link>
        </div>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-6 w-16" />
            </Card>
          ))
        ) : (
          <>
            <Card>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("dash.activeContracts")}
              </p>
              <p className="mt-2 font-heading text-xl font-bold text-ink">
                {activeCount}
              </p>
            </Card>
            <Card>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("bdash.openJobs")}
              </p>
              <p className="mt-2 font-heading text-xl font-bold text-ink">
                {openJobs}
              </p>
            </Card>
            <Card className="col-span-2 lg:col-span-1">
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("bdash.toReview")}
              </p>
              <p
                className={`mt-2 font-heading text-xl font-bold ${
                  toReview.length > 0 ? "text-warning" : "text-ink"
                }`}
              >
                {toReview.length}
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Escrow eslatmasi */}
      <div className="flex items-start gap-3 rounded-card border border-accent/25 bg-accent/5 p-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-accent">
          <path d="M8 1.5 13.5 4v3.6c0 3.3-2.3 6.1-5.5 6.9-3.2-.8-5.5-3.6-5.5-6.9V4L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M5.8 8l1.6 1.6 2.8-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-xs text-muted">{t("bdash.escrowNote")}</p>
      </div>

      {/* Harakat talab qilinadi */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">
          {t("bdash.actionRequired")}
        </h2>
        {loading ? (
          <SkeletonCard />
        ) : toReview.length === 0 &&
          totalNewProposals === 0 &&
          fundNeeded.length === 0 ? (
          <EmptyState title={t("bdash.noActions")} />
        ) : (
          <Card padding="none" stitch>
            {fundNeeded.map((c, i) => (
              <Link
                key={c.id}
                href={`/xaridor/shartnomalar/${c.id}`}
                className={`flex flex-wrap items-center justify-between gap-3 p-4 transition-colors duration-150 hover:bg-card-hover ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-accent">
                    {t("bdash.fundNeeded")}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-ink">
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-2xs text-faint">
                    {c.sellerName} · {formatMoney(c.totalAmount, lang)}
                  </p>
                </div>
              </Link>
            ))}
            {toReview.map((m, i) => {
              const contract = contractById.get(m.contractId);
              return (
                <Link
                  key={m.id}
                  href={`/xaridor/shartnomalar/${m.contractId}`}
                  className={`flex flex-wrap items-center justify-between gap-3 p-4 transition-colors duration-150 hover:bg-card-hover ${
                    i > 0 || fundNeeded.length > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-warning">
                      {t("bdash.reviewSubmitted")}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-ink">
                      {m.title}
                    </p>
                    <p className="mt-0.5 text-2xs text-faint">
                      {contract?.title} · {formatMoney(m.amount, lang)}
                    </p>
                  </div>
                  {m.reviewDeadline && (
                    <CountdownBadge deadline={m.reviewDeadline} />
                  )}
                </Link>
              );
            })}
            {Array.from(newProposals.entries()).map(([jobId, count], i) => {
              const job = jobById.get(jobId);
              return (
                <Link
                  key={jobId}
                  href={`/xaridor/elonlarim/${jobId}`}
                  className={`flex flex-wrap items-center justify-between gap-3 p-4 transition-colors duration-150 hover:bg-card-hover ${
                    i > 0 || toReview.length > 0 || fundNeeded.length > 0
                      ? "border-t border-line"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-primary">
                      {t("bdash.proposalsWaiting")}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-ink">
                      {job?.title}
                    </p>
                  </div>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary-deep">
                    {count}
                  </span>
                </Link>
              );
            })}
          </Card>
        )}
      </section>

      {/* Oxirgi shartnomalar */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-ink">
            {t("nav.contracts")}
          </h2>
          <Link
            href="/xaridor/shartnomalar"
            className="text-xs font-medium text-primary transition-colors duration-150 hover:text-ink"
          >
            {t("dash.viewAll")}
          </Link>
        </div>
        {loading ? (
          <SkeletonCard />
        ) : recentContracts.length === 0 ? (
          <EmptyState
            title={t("contracts.emptyAll")}
            action={
              <Link href="/xaridor/bozor">
                <Button>{t("bdash.findSpecialist")}</Button>
              </Link>
            }
          />
        ) : (
          <Card padding="none">
            {recentContracts.map((contract, i) => (
              <Link
                key={contract.id}
                href={`/xaridor/shartnomalar/${contract.id}`}
                className={`flex items-center justify-between gap-3 p-4 transition-colors duration-150 hover:bg-card-hover ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {contract.title}
                  </p>
                  <p className="mt-0.5 text-2xs text-faint">
                    {contract.sellerName} · {formatMoney(contract.totalAmount, lang)}
                  </p>
                </div>
                <ContractStatusBadge status={contract.status} />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
