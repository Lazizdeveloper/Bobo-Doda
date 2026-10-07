"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { RatingStars } from "@/components/ui/RatingStars";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { IdentityVerifiedBadge } from "@/components/ui/IdentityVerifiedBadge";
import { JobStatusBadge } from "@/components/shared/StatusBadge";
import { OfferModal } from "@/components/shared/OfferModal";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { searchMatches } from "@/lib/search";
import { catalogService, jobsService, savedService, servicesService } from "@/lib/api";
import type { Job, Service, Specialist } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/category-fields";

type TabKey = "services" | "jobs" | "specialists";
type ServiceSort = "new" | "cheap" | "expensive";
type JobSort = "new" | "budget_desc" | "budget_asc";
type SpecialistSort = "rating" | "contracts";

export default function BozorPage() {
  const { t, lang } = useT();

  const [tab, setTab] = useState<TabKey>("services");
  const [services, setServices] = useState<Service[] | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [specialists, setSpecialists] = useState<Specialist[] | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [savedSpecialistIds, setSavedSpecialistIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);

  // Common Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  // Services specific
  const [serviceSort, setServiceSort] = useState<ServiceSort>("new");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("all");

  // Jobs specific
  const [jobSort, setJobSort] = useState<JobSort>("new");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [workType, setWorkType] = useState("all"); // all, remote, onsite

  // Specialists specific
  const [specSort, setSpecSort] = useState<SpecialistSort>("rating");
  const [ratingFilter, setRatingFilter] = useState("all"); // all, 4.5, 4.0
  const [availableOnly, setAvailableOnly] = useState(false);
  const [locationFilter, setLocationFilter] = useState("all");

  // Direct offer & message modal
  const [offerSpecialist, setOfferSpecialist] = useState<Specialist | null>(null);
  const [messageSpecialist, setMessageSpecialist] = useState<Specialist | null>(null);

  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  const debouncedSearch = useDebouncedValue(search, 250);

  // URL Sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const urlTab = sp.get("tab");
    const q = sp.get("q");
    const cat = sp.get("cat");
    if (urlTab && ["services", "jobs", "specialists"].includes(urlTab)) {
      setTab(urlTab as TabKey);
    }
    if (q) setSearch(q);
    if (cat) setCategory(cat);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams();
    if (tab !== "services") sp.set("tab", tab);
    if (search.trim()) sp.set("q", search.trim());
    if (category !== "all") sp.set("cat", category);
    const qs = sp.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [tab, search, category]);

  useEffect(() => {
    setPage(1);
  }, [tab, category, debouncedSearch, serviceSort, minPrice, maxPrice, deliveryFilter, jobSort, minBudget, maxBudget, workType, specSort, ratingFilter, availableOnly, locationFilter]);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      servicesService.listPublic(),
      jobsService.list(),
      catalogService.listSpecialists(),
      savedService.listJobIds(),
      savedService.listSpecialistIds(),
    ])
      .then(([nextServices, nextJobs, nextSpecs, savedIds, savedSpecIds]) => {
        setServices(nextServices);
        setJobs(nextJobs);
        setSpecialists(nextSpecs);
        setSavedJobIds(savedIds);
        setSavedSpecialistIds(savedSpecIds);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  async function handleToggleSaveJob(jobId: string) {
    const updated = await savedService.toggleJob(jobId);
    setSavedJobIds(updated);
  }

  async function handleToggleSaveSpecialist(specId: string) {
    const updated = await savedService.toggleSpecialist(specId);
    setSavedSpecialistIds(updated);
  }

  function clearAllFilters() {
    setSearch("");
    setCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setDeliveryFilter("all");
    setMinBudget("");
    setMaxBudget("");
    setWorkType("all");
    setRatingFilter("all");
    setAvailableOnly(false);
    setLocationFilter("all");
  }

  const query = debouncedSearch.trim();

  // Filtered Services
  const minP = minPrice ? Number(minPrice) : null;
  const maxP = maxPrice ? Number(maxPrice) : null;
  const delDays = deliveryFilter === "all" ? null : Number(deliveryFilter);
  const filteredServices = (services ?? [])
    .filter((s) => category === "all" || s.category === category)
    .filter((s) => minP === null || s.price >= minP)
    .filter((s) => maxP === null || s.price <= maxP)
    .filter((s) => delDays === null || s.deliveryDays <= delDays)
    .filter((s) => !query || searchMatches(s.title, query) || searchMatches(s.description, query))
    .sort((a, b) => {
      if (serviceSort === "cheap") return a.price - b.price;
      if (serviceSort === "expensive") return b.price - a.price;
      return b.createdAt.localeCompare(a.createdAt);
    });

  // Filtered Jobs
  const minB = minBudget ? Number(minBudget) : null;
  const maxB = maxBudget ? Number(maxBudget) : null;
  const filteredJobs = (jobs ?? [])
    .filter((j) => category === "all" || j.category === category)
    .filter((j) => minB === null || j.budgetMax >= minB)
    .filter((j) => maxB === null || j.budgetMin <= maxB)
    .filter((j) => {
      if (workType === "remote") return j.description.toLowerCase().includes("masofaviy") || !j.description.toLowerCase().includes("joyida");
      if (workType === "onsite") return j.description.toLowerCase().includes("joyida") || j.description.toLowerCase().includes("ofis");
      return true;
    })
    .filter(
      (j) =>
        !query ||
        searchMatches(j.title, query) ||
        searchMatches(j.description, query) ||
        (j.skillsRequired || []).some((s) => searchMatches(s, query))
    )
    .sort((a, b) => {
      if (jobSort === "budget_desc") return b.budgetMax - a.budgetMax;
      if (jobSort === "budget_asc") return a.budgetMin - b.budgetMin;
      return b.postedAt.localeCompare(a.postedAt);
    });

  // Filtered Specialists
  const filteredSpecialists = (specialists ?? [])
    .filter((s) => category === "all" || s.profile.categories.includes(category))
    .filter((s) => {
      if (ratingFilter === "4.5") return s.profile.rating >= 4.5;
      if (ratingFilter === "4.0") return s.profile.rating >= 4.0;
      return true;
    })
    .filter((s) => !availableOnly || s.profile.available)
    .filter((s) => locationFilter === "all" || s.profile.location.toLowerCase().includes(locationFilter.toLowerCase()))
    .filter(
      (s) =>
        !query ||
        searchMatches(s.user.fullName, query) ||
        searchMatches(s.profile.headline, query) ||
        searchMatches(s.profile.bio, query) ||
        s.profile.skills.some((sk) => searchMatches(sk, query))
    )
    .sort((a, b) => {
      if (specSort === "contracts") return b.profile.completedContracts - a.profile.completedContracts;
      return b.profile.rating - a.profile.rating;
    });

  const loading = !services || !jobs || !specialists;

  // Pagination calculations
  const currentItemsCount =
    tab === "services"
      ? filteredServices.length
      : tab === "jobs"
      ? filteredJobs.length
      : filteredSpecialists.length;

  const totalPages = Math.max(1, Math.ceil(currentItemsCount / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PER_PAGE;

  const pagedServices = filteredServices.slice(pageStart, pageStart + PER_PAGE);
  const pagedJobs = filteredJobs.slice(pageStart, pageStart + PER_PAGE);
  const pagedSpecialists = filteredSpecialists.slice(pageStart, pageStart + PER_PAGE);

  const categoryOptions = [
    { value: "all", label: t("jobs.allCategories") },
    ...CATEGORIES.map((cat) => ({ value: cat, label: t(`cat.${cat}`) })),
  ];

  const searchPlaceholder =
    tab === "services"
      ? t("market.searchPh")
      : tab === "jobs"
      ? t("market.searchJobsPh")
      : t("market.searchSpecsPh");

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Banner and CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink xl:text-3xl">{t("market.title")}</h1>
          <p className="mt-1 text-sm text-muted xl:text-base">{t("market.subtitle")}</p>
        </div>

      </div>

      {/* Main 3-Tab Navigator */}
      <div className="border-b border-line pb-1">
        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v as TabKey);
            setSearch("");
          }}
          items={[
            {
              value: "services",
              label: t("market.tabServices"),
              count: services?.length,
            },
            {
              value: "jobs",
              label: t("market.tabJobs"),
              count: jobs?.length,
            },
            {
              value: "specialists",
              label: t("market.tabSpecialists"),
              count: specialists?.length,
            },
          ]}
        />
      </div>

      {/* Dynamic Filters Section */}
      <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-5 shadow-card">
        {/* Search Input and Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              clearLabel={t("search.clear")}
            />
          </div>
          <div>
            <Select
              aria-label={t("jobs.allCategories")}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoryOptions}
            />
          </div>
        </div>

        {/* Tab-specific sub-filters */}
        {tab === "services" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-line/60">
            <Input
              type="number"
              aria-label={t("market.priceMinLabel")}
              placeholder={`${t("market.priceMin")} (so'm)`}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <Input
              type="number"
              aria-label={t("market.priceMaxLabel")}
              placeholder={`${t("market.priceMax")} (so'm)`}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
            <Select
              aria-label={t("market.filterDelivery")}
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              options={[
                { value: "all", label: t("market.deliveryAny") },
                { value: "3", label: t("market.delivery3") },
                { value: "7", label: t("market.delivery7") },
                { value: "14", label: t("market.delivery14") },
              ]}
            />
            <Select
              aria-label={t("jobs.sortNew")}
              value={serviceSort}
              onChange={(e) => setServiceSort(e.target.value as ServiceSort)}
              options={[
                { value: "new", label: t("jobs.sortNew") },
                { value: "cheap", label: t("market.sortCheap") },
                { value: "expensive", label: t("market.sortExpensive") },
              ]}
            />
          </div>
        )}

        {tab === "jobs" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-line/60">
            <Input
              type="number"
              placeholder="Min byudjet (so'm)"
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Max byudjet (so'm)"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
            />
            <Select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              options={[
                { value: "all", label: "Barcha ish turlari" },
                { value: "remote", label: "Masofaviy (Remote)" },
                { value: "onsite", label: "Joyida (On-site)" },
              ]}
            />
            <Select
              value={jobSort}
              onChange={(e) => setJobSort(e.target.value as JobSort)}
              options={[
                { value: "new", label: t("jobs.sortNew") },
                { value: "budget_desc", label: "Yuqori byudjetdan" },
                { value: "budget_asc", label: "Kam byudjetdan" },
              ]}
            />
          </div>
        )}

        {tab === "specialists" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-line/60">
            <Select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              options={[
                { value: "all", label: t("market.ratingAny") },
                { value: "4.5", label: t("market.rating45") },
                { value: "4.0", label: t("market.rating40") },
              ]}
            />
            <Select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              options={[
                { value: "all", label: t("market.locationAny") },
                { value: "toshkent", label: "Toshkent" },
                { value: "samarqand", label: "Samarqand" },
                { value: "buxoro", label: "Buxoro" },
                { value: "farg'ona", label: "Farg'ona" },
                { value: "andijon", label: "Andijon" },
              ]}
            />
            <Select
              value={specSort}
              onChange={(e) => setSpecSort(e.target.value as SpecialistSort)}
              options={[
                { value: "rating", label: t("market.sortRating") },
                { value: "contracts", label: "Ko'p yakunlangan loyihalar" },
              ]}
            />
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink px-3 py-2 rounded-btn bg-surface border border-line hover:border-primary">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="rounded border-line text-primary focus:ring-primary"
              />
              <span>{t("market.filterAvailability")}</span>
            </label>
          </div>
        )}
      </div>

      {/* Results Header Info */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {!loading && currentItemsCount > 0 && (
            <>
              {t("pager.showing")
                .replace("{from}", String(pageStart + 1))
                .replace("{to}", String(Math.min(pageStart + PER_PAGE, currentItemsCount)))
                .replace("{total}", String(currentItemsCount))}
            </>
          )}
        </span>
        {(search || category !== "all" || minPrice || maxPrice || minBudget || maxBudget || availableOnly || ratingFilter !== "all") && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-primary hover:underline font-semibold"
          >
            {t("market.clearFilters")}
          </button>
        )}
      </div>

      {/* Content Section */}
      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          {/* TAB 1: XIZMATLAR */}
          {tab === "services" && (
            filteredServices.length === 0 ? (
              <Card className="text-center py-12 flex flex-col items-center justify-center">
                <p className="font-heading text-base font-bold text-ink">{t("market.empty")}</p>
                <p className="mt-1 max-w-md text-xs text-muted">{t("market.emptyServices")}</p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                    {t("market.clearFilters")}
                  </Button>
                  <Link href="/mutaxassis/services/yangi">
                    <Button size="sm">{t("market.createServiceCta")}</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {pagedServices.map((service) => (
                  <Card key={service.id} padding="none" hoverable className="group relative flex h-full flex-col overflow-hidden">
                    <Link href={`/bozor/xizmat/${service.id}`} className="absolute inset-0 z-0 rounded-card" aria-label={service.title} />
                    <div className="relative z-10 flex flex-1 flex-col gap-2.5 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="primary">{t(`cat.${service.category}`)}</Badge>
                        <span className="text-2xs text-faint">{formatDate(service.createdAt, lang)}</span>
                      </div>
                      <h3 className="font-heading text-sm font-bold text-ink group-hover:text-primary transition-colors line-clamp-2">
                        {service.title}
                      </h3>
                      <p className="line-clamp-2 text-xs text-muted">{service.description}</p>
                      <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-xs">
                        <span className="font-heading text-sm font-bold text-primary">{formatMoney(service.price, lang)}</span>
                        <span className="flex items-center gap-1 text-muted">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {service.deliveryDays} {t("common.days")}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* TAB 2: ISHLAR */}
          {tab === "jobs" && (
            filteredJobs.length === 0 ? (
              <Card className="text-center py-12 flex flex-col items-center justify-center">
                <p className="font-heading text-base font-bold text-ink">{t("market.empty")}</p>
                <p className="mt-1 max-w-md text-xs text-muted">{t("market.emptyJobs")}</p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                    {t("market.clearFilters")}
                  </Button>
                  <Link href="/xaridor/elonlarim/yangi">
                    <Button size="sm">{t("market.postJobCta")}</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pagedJobs.map((job) => (
                  <Card key={job.id} padding="lg" hoverable className="flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge tone="primary">{t(`cat.${job.category}`)}</Badge>
                          <JobStatusBadge status={job.status} />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleSaveJob(job.id)}
                          className={`p-1.5 rounded-full hover:bg-card-hover transition-colors ${
                            savedJobIds.includes(job.id) ? "text-primary" : "text-muted hover:text-ink"
                          }`}
                          title="Saqlash"
                          aria-label="Saqlash"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={savedJobIds.includes(job.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                      </div>

                      <Link href={`/mutaxassis/ish-elonlari/${job.id}`}>
                        <h3 className="font-heading text-base font-bold text-ink hover:text-primary transition-colors line-clamp-2">
                          {job.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-muted line-clamp-3">{job.description}</p>

                      {job.skillsRequired && job.skillsRequired.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {job.skillsRequired.slice(0, 4).map((skill) => (
                            <span key={skill} className="px-2 py-0.5 rounded-full text-2xs bg-surface border border-line text-muted">
                              {skill}
                            </span>
                          ))}
                          {job.skillsRequired.length > 4 && (
                            <span className="text-2xs text-faint">+{job.skillsRequired.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line pt-3 mt-1 text-xs">
                      <div>
                        <span className="font-bold text-ink text-sm">
                          {formatMoney(job.budgetMin, lang)} - {formatMoney(job.budgetMax, lang)}
                        </span>
                        <p className="text-2xs text-muted mt-0.5">
                          {job.proposalsCount || 0} ta taklif • {formatDate(job.postedAt, lang)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/mutaxassis/ish-elonlari/${job.id}`}>
                          <Button variant="secondary" size="sm">
                            {t("market.detailsBtn")}
                          </Button>
                        </Link>
                        <Link href={`/mutaxassis/ish-elonlari/${job.id}/taklif`}>
                          <Button size="sm">
                            {t("market.applyBtn")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* TAB 3: MUTAXASSISLAR */}
          {tab === "specialists" && (
            filteredSpecialists.length === 0 ? (
              <Card className="text-center py-12 flex flex-col items-center justify-center">
                <p className="font-heading text-base font-bold text-ink">{t("market.empty")}</p>
                <p className="mt-1 max-w-md text-xs text-muted">{t("market.emptySpecialists")}</p>
                <div className="mt-5">
                  <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                    {t("market.clearFilters")}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pagedSpecialists.map((spec) => (
                  <Card key={spec.user.id} padding="lg" hoverable className="flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <Avatar name={spec.user.fullName} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-heading text-sm font-bold text-ink truncate">
                                {spec.user.fullName}
                              </h3>
                              <TrustBadge badge={spec.profile.badge} />
                              {spec.profile.identityVerified && <IdentityVerifiedBadge />}
                            </div>
                            <p className="text-xs text-primary font-medium truncate mt-0.5">
                              {spec.profile.headline}
                            </p>
                            <div className="flex items-center gap-2 text-2xs text-muted mt-1">
                              <RatingStars value={spec.profile.rating} size="sm" />
                              <span>({spec.profile.reviewCount})</span>
                              <span>•</span>
                              <span>{spec.profile.completedContracts} ta ish</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleSaveSpecialist(spec.user.id)}
                          aria-label={savedSpecialistIds.includes(spec.user.id) ? t("jobs.unsave") : t("jobs.save")}
                          className={`rounded-btn p-1.5 transition-colors shrink-0 ${
                            savedSpecialistIds.includes(spec.user.id) ? "text-primary" : "text-muted hover:text-ink"
                          }`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={savedSpecialistIds.includes(spec.user.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                      </div>

                      <p className="text-xs text-muted line-clamp-2">{spec.profile.bio}</p>

                      <div className="flex flex-wrap gap-1 mt-1">
                        {spec.profile.skills.slice(0, 4).map((skill) => (
                          <span key={skill} className="px-2 py-0.5 rounded-full text-2xs bg-surface border border-line text-muted">
                            {skill}
                          </span>
                        ))}
                        {spec.profile.skills.length > 4 && (
                          <span className="text-2xs text-faint">+{spec.profile.skills.length - 4}</span>
                        )}
                      </div>

                      {/* Xizmatlari haqida ma'lumot */}
                      {(() => {
                        const specServices = (services ?? []).filter(
                          (s) => s.sellerId === spec.user.id || (s.sellerId === "me" && spec.user.id === "me")
                        );
                        if (specServices.length > 0) {
                          return (
                            <div className="rounded-input bg-surface border border-line/60 p-2 text-2xs text-muted">
                              <span className="font-semibold text-ink">Xizmatlari ({specServices.length}):</span>{" "}
                              <span className="truncate inline-block max-w-full">
                                {specServices.slice(0, 2).map((s) => s.title).join(", ")}
                                {specServices.length > 2 && "..."}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div className="rounded-input bg-surface/50 border border-line/40 px-2 py-1 text-2xs text-muted">
                            <span>Maxsus buyurtmalar qabul qiladi</span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="border-t border-line pt-3 mt-1 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-2xs text-muted">
                        <span>{spec.profile.location || "O'zbekiston"} • {formatDate(spec.profile.memberSince, lang)} dan beri</span>
                        <span className={spec.profile.available ? "text-success font-semibold" : "text-muted"}>
                          {spec.profile.available ? "● Yangi ishlarga tayyor" : "○ Band"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Link href={`/bozor/mutaxassis/${spec.user.id}`} className="w-full">
                          <Button variant="secondary" size="sm" className="w-full text-xs">
                            {t("market.viewProfile")}
                          </Button>
                        </Link>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setMessageSpecialist(spec)}
                        >
                          💬 {t("market.sendMessageBtn")}
                        </Button>
                        <Button
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setOfferSpecialist(spec)}
                        >
                          {t("market.sendOfferBtn")}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* Unified Pagination */}
          {!loading && currentItemsCount > PER_PAGE && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
              labels={{ prev: t("pager.prev"), next: t("pager.next"), page: t("pager.page"), nav: t("a11y.pagination") }}
            />
          )}
        </>
      )}

      {/* Direct Offer Modal from Specialist Card */}
      {offerSpecialist && (
        <OfferModal
          open={!!offerSpecialist}
          onClose={() => setOfferSpecialist(null)}
          sellerId={offerSpecialist.user.id}
          mode="offer"
        />
      )}

      {/* Direct Message Modal from Specialist Card */}
      {messageSpecialist && (
        <OfferModal
          open={!!messageSpecialist}
          onClose={() => setMessageSpecialist(null)}
          sellerId={messageSpecialist.user.id}
          mode="message"
        />
      )}
    </div>
  );
}
