"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { ContractStatusBadge } from "@/components/shared/StatusBadge";
import { JobCard } from "@/components/shared/JobCard";
import {
  contractsService,
  jobsService,
  milestonesService,
  savedService,
  sellerApplicationService,
  servicesService,
  usersService,
} from "@/lib/api";
import type { Contract, Job, Milestone, Service, VerificationStatus } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { sellerNet } from "@/lib/fees";
import { useT } from "@/lib/i18n";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { searchMatches } from "@/lib/search";
import { CATEGORIES } from "@/lib/category-fields";

export default function MutaxassisDashboardPage() {
  const { t, lang } = useT();
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [applicationStatus, setApplicationStatus] = useState<VerificationStatus | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const debouncedSearch = useDebouncedValue(search, 200);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      contractsService.list(),
      milestonesService.listMine(),
      servicesService.listMine(),
      jobsService.list(),
      savedService.listJobIds(),
      usersService.getCurrent(),
    ])
      .then(([contractList, milestoneList, serviceList, jobList, ids, user]) => {
        setContracts(contractList);
        setMilestones(milestoneList);
        setServices(serviceList);
        setJobs(jobList);
        setSavedIds(ids);
        if (user) setName(user.fullName);
      })
      .catch(setLoadError);

    /* Ariza holati — asosiy yuklashni bloklamaydi */
    sellerApplicationService
      .getCurrent()
      .then((app) => setApplicationStatus(app?.status ?? null))
      .catch(() => setApplicationStatus(null));
  }, []);

  useEffect(load, [load]);

  async function handleToggleSave(jobId: string) {
    setSavedIds(await savedService.toggleJob(jobId));
  }

  const loading = !contracts || !milestones || jobs === null;

  const activeContracts = contracts?.filter((c) => c.status === "faol") || [];
  const openJobs = (jobs ?? []).filter((j) => j.status === "ochiq");
  const totalEarnings = (milestones ?? [])
    .filter((m) => m.status === "qabul_qilindi")
    .reduce((sum, m) => sum + sellerNet(m.amount), 0);
  const recentContracts = [...(contracts ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const query = debouncedSearch.trim();
  const filteredJobs = openJobs
    .filter((j) => category === "all" || j.category === category)
    .filter(
      (j) =>
        !query ||
        searchMatches(j.title, query) ||
        searchMatches(j.description, query) ||
        (j.skillsRequired || []).some((s) => searchMatches(s, query))
    )
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));

  const displayedJobs = filteredJobs.slice(0, 6);

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Sarlavha va Tezkor amallar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-ink">{t("dash.title")}</h1>
          {name && (
            <p className="mt-1 text-muted">
              {t("dash.greeting")}, {name.split(" ")[0]}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/mutaxassis/ish-elonlari">
            <Button variant="secondary" size="sm">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="mr-1.5" aria-hidden="true">
                <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {t("nav.jobs")}
            </Button>
          </Link>
          <Link href="/mutaxassis/xizmatlarim/yangi">
            <Button size="sm">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="mr-1.5" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {t("dash.newService")}
            </Button>
          </Link>
        </div>
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
          {applicationStatus === "rad_etilgan" && (
            <Link href="/mutaxassis/royxat" className="mt-3 inline-block text-xs font-semibold text-primary hover:underline">
              {t("onboard.reapplyBtn")}
            </Link>
          )}
        </Card>
      )}

      {/* 4 ta Statistika kartochkasi */}
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
            <Link href="/mutaxassis/shartnomalar">
              <Card hoverable>
                <p className="text-xs font-bold uppercase text-muted tracking-wider">{t("dash.activeContracts")}</p>
                <p className="mt-2 font-heading text-2xl font-black text-ink">{activeContracts.length}</p>
              </Card>
            </Link>
            <Link href="/mutaxassis/ish-elonlari">
              <Card hoverable className="border-accent/20 bg-accent/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase text-primary-deep tracking-wider">{t("dash.openJobs")}</p>
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
                <p className="mt-2 font-heading text-2xl font-black text-ink">{openJobs.length}</p>
              </Card>
            </Link>
            <Link href="/mutaxassis/xizmatlarim">
              <Card hoverable>
                <p className="text-xs font-bold uppercase text-muted tracking-wider">{t("nav.services")}</p>
                <p className="mt-2 font-heading text-2xl font-black text-ink">{services.length}</p>
              </Card>
            </Link>
          </>
        )}
      </div>

      {/* ASOSIY QISM: Ish e'lonlari (Birinchi kirgan mutaxassis darhol ko'radi) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-heading text-xl font-bold text-ink">{t("dash.availableJobs")}</h2>
              {!loading && (
                <Badge tone="primary">
                  {openJobs.length} {t("jobs.open").toLowerCase()}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted mt-1">{t("dash.availableJobsDesc")}</p>
          </div>
          <Link
            href="/mutaxassis/ish-elonlari"
            className="text-sm font-semibold text-primary hover:text-primary-deep hover:underline shrink-0"
          >
            {t("dash.viewAll")} ({openJobs.length}) →
          </Link>
        </div>

        {/* Qidiruv va Kategoriya tanlagich */}
        <div className="flex flex-col gap-3">
          <div className="max-w-md">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t("dash.searchJobsPh")}
              aria-label={t("dash.searchJobsPh")}
              clearLabel={t("search.clear")}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === "all"
                  ? "bg-primary text-white"
                  : "bg-surface text-muted hover:bg-card-hover hover:text-ink border border-line"
              }`}
            >
              {t("dash.allCategories")}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  category === cat
                    ? "bg-primary text-white"
                    : "bg-surface text-muted hover:bg-card-hover hover:text-ink border border-line"
                }`}
              >
                {t(`cat.${cat}`)}
              </button>
            ))}
          </div>
        </div>

        {/* E'lonlar ro'yxati */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : displayedJobs.length === 0 ? (
          <Card className="text-center py-10">
            <p className="font-heading text-sm font-bold text-ink">{t("dash.noJobsFound")}</p>
            <p className="mt-1 text-xs text-muted">{t("jobs.emptyFiltered")}</p>
            {(search || category !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                }}
              >
                {t("search.clear")}
              </Button>
            )}
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved={savedIds.includes(job.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>

            {filteredJobs.length > displayedJobs.length && (
              <div className="text-center pt-2">
                <Link href="/mutaxassis/ish-elonlari">
                  <Button variant="secondary" size="sm">
                    {t("dash.browseJobBoard")} ({openJobs.length} ta loyiha) →
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* So'nggi shartnomalar */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-ink">{t("dash.recentContracts")}</h2>
          <Link href="/mutaxassis/shartnomalar" className="text-sm font-medium text-primary hover:underline">
            {t("dash.viewAll")}
          </Link>
        </div>
        {loading ? (
          <SkeletonCard />
        ) : recentContracts.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-8 text-center">
            <p className="font-heading text-sm font-bold text-ink">{t("dash.noContracts")}</p>
            <p className="mt-1 max-w-md text-xs text-muted">{t("dash.noContractsDesc")}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Link href="/mutaxassis/ish-elonlari">
                <Button size="sm">{t("dash.browseJobBoard")}</Button>
              </Link>
              <Link href="/mutaxassis/xizmatlarim/yangi">
                <Button variant="secondary" size="sm">
                  {t("dash.newService")}
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card padding="none" stitch>
            {recentContracts.map((c, i) => (
              <Link
                key={c.id}
                href={`/mutaxassis/shartnomalar/${c.id}`}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 hover:bg-card-hover transition-colors ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-bold text-ink text-base truncate">{c.title}</p>
                  <p className="text-sm text-muted mt-1">{formatDate(c.createdAt, lang)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-ink whitespace-nowrap text-sm">
                    {formatMoney(c.totalAmount, lang)}
                  </span>
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
