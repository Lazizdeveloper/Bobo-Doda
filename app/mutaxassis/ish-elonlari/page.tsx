"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { JobCard } from "@/components/shared/JobCard";
import { OfferStatusBadge, ProposalStatusBadge } from "@/components/shared/StatusBadge";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { searchMatches } from "@/lib/search";
import { CATEGORIES } from "@/lib/category-fields";
import { jobsService, offersService, proposalsService, savedService, usersService } from "@/lib/api";
import type { Job, Offer, Proposal, SellerProfile } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

type BudgetFilter = "all" | "low" | "mid" | "high";
type Sort = "new" | "budget";
type Tab = "matching" | "all" | "proposals" | "saved" | "offers";

function matchesBudget(job: Job, filter: BudgetFilter): boolean {
  if (filter === "all") return true;
  if (filter === "low") return job.budgetMax <= 1_000_000;
  if (filter === "mid") return job.budgetMax > 1_000_000 && job.budgetMin <= 5_000_000;
  return job.budgetMin > 5_000_000 || job.budgetMax > 5_000_000;
}

function matchesProfile(job: Job, profile: SellerProfile | null): boolean {
  if (!profile) return true;
  if (job.status !== "ochiq") return false;
  if (profile.categories && profile.categories.includes(job.category)) return true;
  const skills = (profile.skills || []).map((s) => s.toLowerCase());
  return (job.skillsRequired || []).some((s) => skills.includes(s.toLowerCase()));
}

export default function IshElonlariPage() {
  const { t, lang } = useT();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("matching");
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
      usersService.getSellerProfile().catch(() => null),
      savedService.listJobIds(),
      proposalsService.listMine(),
      offersService.listIncoming(),
    ])
      .then(([jobList, profileData, ids, myProps, incomingOffers]) => {
        setJobs(jobList);
        setProfile(profileData);
        setSavedIds(ids);
        setProposals(myProps);
        setOffers(incomingOffers);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("q");
    const cat = sp.get("cat");
    const b = sp.get("budget");
    const s = sp.get("sort");
    const tParam = sp.get("tab");
    if (q) setSearch(q);
    if (cat) setCategory(cat);
    if (b && ["all", "low", "mid", "high"].includes(b)) setBudget(b as BudgetFilter);
    if (s && ["new", "budget"].includes(s)) setSort(s as Sort);
    if (tParam && ["matching", "all", "proposals", "saved", "offers"].includes(tParam)) {
      setTab(tParam as Tab);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams();
    if (search.trim()) sp.set("q", search.trim());
    if (category !== "all") sp.set("cat", category);
    if (budget !== "all") sp.set("budget", budget);
    if (sort !== "new") sp.set("sort", sort);
    if (tab !== "matching") sp.set("tab", tab);
    const qs = sp.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [tab, category, budget, sort, search]);

  useEffect(() => {
    setPage(1);
  }, [tab, category, budget, sort, debouncedSearch]);

  async function handleToggleSave(jobId: string) {
    setSavedIds(await savedService.toggleJob(jobId));
  }

  const query = debouncedSearch.trim();
  const filteredJobs = (jobs ?? [])
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
        (j.skillsRequired || []).some((s) => searchMatches(s, query))
    )
    .sort((a, b) =>
      sort === "new"
        ? b.postedAt.localeCompare(a.postedAt)
        : b.budgetMax - a.budgetMax
    );

  const jobById = new Map((jobs ?? []).map((j) => [j.id, j]));

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedJobs = filteredJobs.slice(
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

  const matchingCount = (jobs ?? []).filter((j) => matchesProfile(j, profile)).length;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink xl:text-3xl">
            {t("jobs.title")}
          </h1>
          <p className="mt-1 text-sm text-muted xl:text-base">{t("jobs.subtitle")}</p>
        </div>
        <Link href="/xaridor/bozor">
          <Button variant="secondary" size="sm">
            Bozorni ko'rish →
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(v) => {
          setTab(v as Tab);
          setSearch("");
        }}
        items={[
          { value: "matching", label: t("dash.matchingJobs"), count: matchingCount },
          { value: "all", label: t("jobs.tabAll"), count: jobs?.length },
          { value: "proposals", label: t("dash.myProposals"), count: proposals?.length },
          { value: "saved", label: t("market.filterSaved"), count: savedIds.length },
          { value: "offers", label: t("dash.incomingOffers"), count: offers.length },
        ]}
      />

      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : (
        <>
          {/* TAB: PROPOSALS */}
          {tab === "proposals" && (
            <div className="flex flex-col gap-4">
              {!proposals ? (
                <SkeletonCard />
              ) : proposals.length === 0 ? (
                <EmptyState
                  title={t("props.empty")}
                  action={
                    <Button onClick={() => setTab("matching")}>
                      Mos ishlarni ko'rish
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {proposals.map((prop) => {
                    const job = jobById.get(prop.jobId);
                    return (
                      <Card key={prop.id} padding="md" hoverable className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {job && <Badge tone="primary">{t(`cat.${job.category}`)}</Badge>}
                              <ProposalStatusBadge status={prop.status} />
                            </div>
                            <Link href={`/mutaxassis/takliflarim/${prop.id}`}>
                              <h3 className="font-heading text-base font-bold text-ink hover:text-primary transition-colors mt-1.5">
                                {job?.title || "Loyiha"}
                              </h3>
                            </Link>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-heading text-base font-bold text-ink">
                              {formatMoney(prop.bidAmount, lang)}
                            </span>
                            <Link href={`/mutaxassis/takliflarim/${prop.id}`}>
                              <Button size="sm" variant="secondary">
                                Ko'rish →
                              </Button>
                            </Link>
                          </div>
                        </div>

                        <p className="text-xs text-muted line-clamp-2 bg-surface/50 p-3 rounded-btn border border-line/60">
                          "{prop.coverLetter}"
                        </p>

                        <div className="flex items-center justify-between text-2xs text-muted pt-2 border-t border-line/60">
                          <span>{prop.estimatedDeliveryDays ? `${prop.estimatedDeliveryDays} kunda yetkazish` : "Muddat ko'rsatilgan"}</span>
                          <span>Yuborilgan vaqti: {formatDate(prop.createdAt, lang)}</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: OFFERS */}
          {tab === "offers" && (
            <div className="flex flex-col gap-4">
              {offers.length === 0 ? (
                <EmptyState
                  title="Hozircha buyurtmachilardan kelgan takliflar yo'q"
                  action={
                    <Button onClick={() => setTab("matching")}>
                      Ishlarni ko'rish
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {offers.map((offer) => (
                    <Card key={offer.id} padding="md" hoverable className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar name={offer.buyerName} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-ink truncate">{offer.title}</p>
                            <p className="text-xs text-muted mt-0.5">
                              Buyurtmachi: <span className="font-semibold text-ink">{offer.buyerName}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-heading text-base font-bold text-primary">
                            {formatMoney(offer.budget, lang)}
                          </span>
                          <OfferStatusBadge status={offer.status} />
                        </div>
                      </div>

                      <p className="text-xs text-muted line-clamp-2 bg-surface/50 p-2.5 rounded-btn border border-line/60">
                        "{offer.message}"
                      </p>

                      <div className="flex items-center justify-between text-2xs text-muted pt-2 border-t border-line/60">
                        <span>{formatDate(offer.createdAt, lang)}</span>
                        <Link href={`/mutaxassis/takliflarim/kelgan/${offer.id}`}>
                          <Button size="sm">
                            Taklifni ko'rish →
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TABS: MATCHING, ALL, SAVED */}
          {["matching", "all", "saved"].includes(tab) && (
            <div className="xl:grid xl:grid-cols-[300px_1fr] xl:items-start xl:gap-8">
              {/* Filtr paneli */}
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
                  {(category !== "all" || budget !== "all" || sort !== "new" || search) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setCategory("all");
                        setBudget("all");
                        setSort("new");
                      }}
                    >
                      Filtrlarni tozalash
                    </Button>
                  )}
                </Card>
              </aside>

              {/* Mobil qidiruv va filtrlash */}
              <div className="flex flex-col gap-4 min-w-0">
                <div className="flex flex-col gap-3 xl:hidden">
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder={t("jobs.searchPh")}
                    aria-label={t("jobs.searchPh")}
                    clearLabel={t("search.clear")}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      aria-label={t("jobs.category")}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      options={categoryOptions}
                    />
                    <Select
                      aria-label={t("jobs.sort")}
                      value={sort}
                      onChange={(e) => setSort(e.target.value as Sort)}
                      options={sortOptions}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {filteredJobs.length > 0 &&
                      t("pager.showing")
                        .replace("{from}", String((currentPage - 1) * PER_PAGE + 1))
                        .replace("{to}", String(Math.min(currentPage * PER_PAGE, filteredJobs.length)))
                        .replace("{total}", String(filteredJobs.length))}
                  </span>
                </div>

                {/* E'lonlar ro'yxati */}
                {!jobs ? (
                  <div className="flex flex-col gap-3">
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <Card className="text-center py-12 flex flex-col items-center justify-center">
                    <p className="font-heading text-base font-bold text-ink">
                      {tab === "saved"
                        ? "Saqlangan ishlar yo'q"
                        : tab === "matching"
                        ? "Hozircha sizga mos ishlar topilmadi"
                        : "Ishlar topilmadi"}
                    </p>
                    <p className="mt-1 text-xs text-muted max-w-md">
                      {tab === "saved"
                        ? "O'zingizga ma'qul ishlarni saqlab qo'yishingiz mumkin."
                        : "Filtrlarni o'zgartirib ko'ring yoki barcha ishlarni tekshiring."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setCategory("all");
                          setBudget("all");
                          if (tab !== "all") setTab("all");
                        }}
                      >
                        Barcha ishlarni ko'rish
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-4">
                    {pagedJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        saved={savedIds.includes(job.id)}
                        onToggleSave={handleToggleSave}
                      />
                    ))}

                    {filteredJobs.length > PER_PAGE && (
                      <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        onChange={setPage}
                        labels={{
                          prev: t("pager.prev"),
                          next: t("pager.next"),
                          page: t("pager.page"),
                          nav: t("a11y.pagination"),
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
