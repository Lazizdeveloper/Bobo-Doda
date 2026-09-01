"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { JobCard } from "@/components/shared/JobCard";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { searchMatches } from "@/lib/search";
import { CATEGORIES } from "@/lib/category-fields";
import { jobsService, savedService, usersService } from "@/lib/api";
import type { Job, SellerProfile } from "@/lib/types";
import { useT } from "@/lib/i18n";

type BudgetFilter = "all" | "low" | "mid" | "high";
type Sort = "new" | "budget";
type Tab = "all" | "matching" | "saved";

function matchesBudget(job: Job, filter: BudgetFilter): boolean {
  if (filter === "all") return true;
  if (filter === "low") return job.budgetMax <= 1_000_000;
  if (filter === "mid") return job.budgetMax > 1_000_000 && job.budgetMin <= 5_000_000;
  return job.budgetMin > 5_000_000 || job.budgetMax > 5_000_000;
}

function matchesProfile(job: Job, profile: SellerProfile | null): boolean {
  if (!profile) return false;
  if (job.status !== "ochiq") return false;
  if (profile.categories.includes(job.category)) return true;
  const skills = profile.skills.map((s) => s.toLowerCase());
  return job.skillsRequired.some((s) => skills.includes(s.toLowerCase()));
}

export default function IshElonlariPage() {
  const { t } = useT();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [budget, setBudget] = useState<BudgetFilter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 250);
  const PER_PAGE = 10;
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      jobsService.list(),
      usersService.getSellerProfile(),
      savedService.listJobIds(),
    ])
      .then(([jobList, profileData, ids]) => {
        setJobs(jobList);
        setProfile(profileData);
        setSavedIds(ids);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  /* Filtr/tab/qidiruv o'zgarsa — birinchi sahifaga */
  useEffect(() => {
    setPage(1);
  }, [tab, category, budget, sort, debouncedSearch]);

  async function handleToggleSave(jobId: string) {
    setSavedIds(await savedService.toggleJob(jobId));
  }

  const query = debouncedSearch.trim();
  const filtered = (jobs ?? [])
    .filter((j) => {
      if (tab === "saved") return savedIds.includes(j.id);
      if (tab === "matching") return matchesProfile(j, profile);
      return true;
    })
    .filter((j) => category === "all" || j.category === category)
    .filter((j) => matchesBudget(j, budget))
    .filter(
      (j) =>
        !query ||
        searchMatches(j.title, query) ||
        searchMatches(j.description, query) ||
        j.skillsRequired.some((s) => searchMatches(s, query))
    )
    .sort((a, b) =>
      sort === "new"
        ? b.postedAt.localeCompare(a.postedAt)
        : b.budgetMax - a.budgetMax
    );

  const emptyTitle =
    tab === "saved"
      ? t("jobs.emptySaved")
      : tab === "matching"
        ? t("jobs.emptyMatching")
        : t("jobs.empty");

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  const categoryOptions = [
    { value: "all", label: t("jobs.allCategories") },
    ...CATEGORIES.map((cat) => ({ value: cat, label: t(`cat.${cat}`) })),
  ];
  const budgetOptions = [
    { value: "all", label: t("jobs.budgetAll") },
    { value: "low", label: t("jobs.budgetLow") },
    { value: "mid", label: t("jobs.budgetMid") },
    { value: "high", label: t("jobs.budgetHigh") },
  ];
  const sortOptions = [
    { value: "new", label: t("jobs.sortNew") },
    { value: "budget", label: t("jobs.sortBudget") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink xl:text-3xl">
          {t("jobs.title")}
        </h1>
        <p className="mt-1 text-sm text-muted xl:text-base">{t("jobs.subtitle")}</p>
      </div>

      <div className="xl:grid xl:grid-cols-[300px_1fr] xl:items-start xl:gap-8">
        {/* Filtr paneli — faqat keng ekranda (xl+), yopishqoq */}
        <aside className="hidden xl:sticky xl:top-24 xl:block">
          <Card padding="lg" className="flex flex-col gap-5">
            <h2 className="font-heading text-sm font-bold text-ink">
              {t("jobs.filtersTitle")}
            </h2>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t("jobs.searchPh")}
              aria-label={t("jobs.searchPh")}
              clearLabel={t("search.clear")}
            />
            <Select
              label={t("jobs.category")}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoryOptions}
            />
            <Select
              label={t("jobs.budget")}
              value={budget}
              onChange={(e) => setBudget(e.target.value as BudgetFilter)}
              options={budgetOptions}
            />
            <Select
              label={t("jobs.sort")}
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              options={sortOptions}
            />
          </Card>
        </aside>

        <div className="flex flex-col gap-6">
          <Tabs
            size="lg"
            value={tab}
            onChange={(value) => setTab(value as Tab)}
            items={[
              { value: "all", label: t("jobs.tabAll"), count: jobs?.length },
              {
                value: "matching",
                label: t("jobs.tabMatching"),
                count: jobs?.filter((j) => matchesProfile(j, profile)).length,
              },
              { value: "saved", label: t("jobs.tabSaved"), count: savedIds.length },
            ]}
          />

          {/* Qidiruv va filtrlar — mobil/planshetda; keng ekranda chapdagi panelga ko'chadi */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:hidden">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t("jobs.searchPh")}
              aria-label={t("jobs.searchPh")}
              clearLabel={t("search.clear")}
            />
            <Select aria-label={t("jobs.category")} value={category} onChange={(e) => setCategory(e.target.value)} options={categoryOptions} />
            <Select aria-label={t("jobs.budget")} value={budget} onChange={(e) => setBudget(e.target.value as BudgetFilter)} options={budgetOptions} />
            <Select aria-label={t("jobs.sort")} value={sort} onChange={(e) => setSort(e.target.value as Sort)} options={sortOptions} />
          </div>

          {loadError ? (
            <ErrorState error={loadError} onRetry={load} />
          ) : !jobs ? (
            <div className="flex flex-col gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title={emptyTitle} />
          ) : (
            <div className="flex flex-col gap-4">
              {paged.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved={savedIds.includes(job.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          )}

          {jobs && filtered.length > PER_PAGE && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
              labels={{
                prev: t("pager.prev"),
                next: t("pager.next"),
                page: t("pager.page"),
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
