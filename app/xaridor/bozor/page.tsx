"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { RatingStars } from "@/components/ui/RatingStars";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { CATEGORIES } from "@/lib/category-fields";
import { catalogService, savedService, servicesService } from "@/lib/api";
import type { Service, Specialist } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

type Tab = "services" | "specialists";
type Sort = "new" | "cheap" | "expensive" | "rating";

const POPULAR_SEARCHES = [
  "Web sayt",
  "Logo dizayn",
  "Telegram bot",
  "SMM",
  "Kopirayting",
  "Mobil ilova",
];

export default function BozorPage() {
  const { t, lang } = useT();
  const [services, setServices] = useState<Service[] | null>(null);
  const [specialists, setSpecialists] = useState<Specialist[] | null>(null);
  const [tab, setTab] = useState<Tab>("services");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<Sort>("new");
  const [savedIds, setSavedIds] = useState<string[] | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);

  /* Advanced filters */
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState<unknown>(null);
  const debouncedSearch = useDebouncedValue(search, 250);
  const PER_PAGE = 12;

  /* Reset page on any filter change */
  useEffect(() => {
    setPage(1);
  }, [
    tab,
    category,
    sort,
    savedOnly,
    debouncedSearch,
    minPrice,
    maxPrice,
    deliveryFilter,
    ratingFilter,
    availableOnly,
  ]);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      servicesService.listPublic(),
      catalogService.listSpecialists(),
      savedService.listMarketIds(),
    ])
      .then(([nextServices, nextSpecialists, nextSaved]) => {
        setServices(nextServices);
        setSpecialists(nextSpecialists);
        setSavedIds(nextSaved);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  async function toggleSaved(id: string) {
    setSavedIds(await savedService.toggleMarketItem(id));
  }

  function clearAllFilters() {
    setSearch("");
    setCategory("all");
    setSort("new");
    setSavedOnly(false);
    setMinPrice("");
    setMaxPrice("");
    setDeliveryFilter("all");
    setRatingFilter("all");
    setAvailableOnly(false);
  }

  const sellerById = new Map(specialists?.map((s) => [s.user.id, s]));
  const query = debouncedSearch.trim().toLowerCase();

  const minP = minPrice ? Number(minPrice) : null;
  const maxP = maxPrice ? Number(maxPrice) : null;
  const delDays = deliveryFilter === "all" ? null : Number(deliveryFilter);
  const minRating = ratingFilter === "all" ? null : Number(ratingFilter);

  const filteredServices = (services ?? [])
    .filter((s) => category === "all" || s.category === category)
    .filter((s) => !savedOnly || savedIds?.includes(s.id))
    .filter((s) => minP === null || s.price >= minP)
    .filter((s) => maxP === null || s.price <= maxP)
    .filter((s) => delDays === null || s.deliveryDays <= delDays)
    .filter((s) => {
      if (minRating === null) return true;
      const seller = sellerById.get(s.sellerId);
      return (seller?.profile.rating ?? 0) >= minRating;
    })
    .filter((s) => {
      if (!availableOnly) return true;
      const seller = sellerById.get(s.sellerId);
      return seller?.profile.available ?? false;
    })
    .filter(
      (s) =>
        !query ||
        s.title.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        sellerById.get(s.sellerId)?.user.fullName.toLowerCase().includes(query)
    )
    .sort((a, b) => {
      if (sort === "cheap") return a.price - b.price;
      if (sort === "expensive") return b.price - a.price;
      if (sort === "rating")
        return (
          (sellerById.get(b.sellerId)?.profile.rating ?? 0) -
          (sellerById.get(a.sellerId)?.profile.rating ?? 0)
        );
      return b.createdAt.localeCompare(a.createdAt);
    });

  const filteredSpecialists = (specialists ?? [])
    .filter((s) => !savedOnly || savedIds?.includes(s.user.id))
    .filter(
      (s) => category === "all" || s.profile.categories.includes(category)
    )
    .filter((s) => minRating === null || s.profile.rating >= minRating)
    .filter((s) => !availableOnly || s.profile.available)
    .filter(
      (s) =>
        !query ||
        s.user.fullName.toLowerCase().includes(query) ||
        s.profile.headline.toLowerCase().includes(query) ||
        s.profile.skills.some((skill) => skill.toLowerCase().includes(query))
    )
    .sort((a, b) => b.profile.rating - a.profile.rating);

  const loading = !services || !specialists || !savedIds;

  const activeCount =
    tab === "services" ? filteredServices.length : filteredSpecialists.length;
  const totalPages = Math.max(1, Math.ceil(activeCount / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PER_PAGE;
  const pagedServices = filteredServices.slice(pageStart, pageStart + PER_PAGE);
  const pagedSpecialists = filteredSpecialists.slice(
    pageStart,
    pageStart + PER_PAGE
  );

  const categoryOptions = [
    { value: "all", label: t("jobs.allCategories") },
    ...CATEGORIES.map((cat) => ({ value: cat, label: t(`cat.${cat}`) })),
  ];
  const sortOptions = [
    { value: "new", label: t("jobs.sortNew") },
    { value: "cheap", label: t("market.sortCheap") },
    { value: "expensive", label: t("market.sortExpensive") },
    { value: "rating", label: t("market.sortRating") },
  ];
  const deliveryOptions = [
    { value: "all", label: t("market.deliveryAny") },
    { value: "3", label: t("market.delivery3") },
    { value: "7", label: t("market.delivery7") },
    { value: "14", label: t("market.delivery14") },
  ];
  const ratingOptions = [
    { value: "all", label: t("market.ratingAny") },
    { value: "4.5", label: t("market.rating45") },
    { value: "4.0", label: t("market.rating40") },
  ];

  /* Active Filter Pills */
  const hasActiveFilters =
    category !== "all" ||
    search.trim().length > 0 ||
    savedOnly ||
    minPrice !== "" ||
    maxPrice !== "" ||
    deliveryFilter !== "all" ||
    ratingFilter !== "all" ||
    availableOnly;

  const savedOnlyButton = (
    <Button
      variant={savedOnly ? "secondary" : "ghost"}
      size="sm"
      aria-pressed={savedOnly}
      onClick={() => setSavedOnly((value) => !value)}
      className={savedOnly ? "border-primary/60 text-primary" : ""}
    >
      <BookmarkIcon filled={savedOnly} />
      {t("market.savedOnly")}
      {savedIds && savedIds.length > 0 && (
        <span className="rounded-full bg-primary/10 px-1.5 text-2xs text-primary-deep">
          {savedIds.length}
        </span>
      )}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink xl:text-3xl">
            {t("market.title")}
          </h1>
          <p className="mt-1 text-sm text-muted xl:text-base">
            {t("market.subtitle")}
          </p>
        </div>
      </div>

      {/* Popular Quick Searches */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-muted">
          {t("market.popularSearches")}:
        </span>
        {POPULAR_SEARCHES.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => setSearch(term)}
            className="rounded-btn border border-line bg-card px-2.5 py-1 text-2xs font-medium text-ink transition-colors hover:border-primary hover:text-primary"
          >
            {term}
          </button>
        ))}
      </div>

      <div className="xl:grid xl:grid-cols-[300px_1fr] xl:items-start xl:gap-8">
        {/* Desktop Left Filter Sidebar */}
        <aside className="hidden xl:sticky xl:top-24 xl:block">
          <Card padding="lg" className="flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="font-heading text-sm font-bold text-ink">
                {t("market.filtersTitle")}
              </h2>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-2xs font-medium text-primary hover:underline"
                >
                  {t("market.clearFilters")}
                </button>
              )}
            </div>

            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t("market.searchPh")}
              aria-label={t("market.searchPh")}
              clearLabel={t("search.clear")}
            />

            <Select
              label={t("jobs.category")}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoryOptions}
            />

            {/* Price Range Filter (Only on services tab) */}
            {tab === "services" && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-ink">
                  {t("market.filterPrice")}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={t("market.priceMin")}
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <Input
                    placeholder={t("market.priceMax")}
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Delivery Duration Filter */}
            {tab === "services" && (
              <Select
                label={t("market.filterDelivery")}
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value)}
                options={deliveryOptions}
              />
            )}

            {/* Rating Filter */}
            <Select
              label={t("market.filterRating")}
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              options={ratingOptions}
            />

            {/* Availability Filter */}
            <Checkbox
              label={t("market.filterAvailability")}
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
            />

            {/* Sorting */}
            {tab === "services" && (
              <Select
                label={t("jobs.sort")}
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                options={sortOptions}
              />
            )}

            <div className="border-t border-line pt-4 [&>button]:w-full [&>button]:justify-start">
              {savedOnlyButton}
            </div>
          </Card>
        </aside>

        {/* Main Content Area */}
        <div className="flex flex-col gap-6">
          <Tabs
            size="lg"
            value={tab}
            onChange={(value) => setTab(value as Tab)}
            items={[
              {
                value: "services",
                label: t("market.tabServices"),
                count: services?.length,
              },
              {
                value: "specialists",
                label: t("market.tabSpecialists"),
                count: specialists?.length,
              },
            ]}
          />

          {/* Mobile/Tablet Filter Controls */}
          <div className="flex flex-col gap-3 xl:hidden">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={t("market.searchPh")}
                aria-label={t("market.searchPh")}
                clearLabel={t("search.clear")}
              />
              <Select
                aria-label={t("jobs.category")}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categoryOptions}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tab === "services" && (
                <Select
                  aria-label={t("jobs.sort")}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  options={sortOptions}
                  className="sm:w-44"
                />
              )}
              {tab === "services" && (
                <Select
                  aria-label={t("market.filterDelivery")}
                  value={deliveryFilter}
                  onChange={(e) => setDeliveryFilter(e.target.value)}
                  options={deliveryOptions}
                  className="sm:w-40"
                />
              )}
              <Select
                aria-label={t("market.filterRating")}
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                options={ratingOptions}
                className="sm:w-36"
              />
              {savedOnlyButton}
            </div>
          </div>

          {/* Active Filters Pill Bar */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 rounded-input border border-line bg-surface p-2.5 text-xs">
              <span className="font-semibold text-muted">
                {t("market.activeFilters")}:
              </span>
              {category !== "all" && (
                <span className="inline-flex items-center gap-1.5 rounded-btn bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">
                  {t(`cat.${category}`)}
                  <button
                    type="button"
                    onClick={() => setCategory("all")}
                    className="hover:text-danger"
                    aria-label="Remove category"
                  >
                    ×
                  </button>
                </span>
              )}
              {search.trim() && (
                <span className="inline-flex items-center gap-1.5 rounded-btn bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">
                  &ldquo;{search}&rdquo;
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="hover:text-danger"
                    aria-label="Remove search"
                  >
                    ×
                  </button>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1.5 rounded-btn bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">
                  {minPrice ? `${minPrice} UZS` : "0"} - {maxPrice ? `${maxPrice} UZS` : "∞"}
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="hover:text-danger"
                    aria-label="Remove price range"
                  >
                    ×
                  </button>
                </span>
              )}
              {deliveryFilter !== "all" && (
                <span className="inline-flex items-center gap-1.5 rounded-btn bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">
                  ≤ {deliveryFilter} {t("common.days")}
                  <button
                    type="button"
                    onClick={() => setDeliveryFilter("all")}
                    className="hover:text-danger"
                    aria-label="Remove delivery filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {ratingFilter !== "all" && (
                <span className="inline-flex items-center gap-1.5 rounded-btn bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">
                  ★ {ratingFilter}+
                  <button
                    type="button"
                    onClick={() => setRatingFilter("all")}
                    className="hover:text-danger"
                    aria-label="Remove rating filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {availableOnly && (
                <span className="inline-flex items-center gap-1.5 rounded-btn bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">
                  {t("market.filterAvailability")}
                  <button
                    type="button"
                    onClick={() => setAvailableOnly(false)}
                    className="hover:text-danger"
                    aria-label="Remove availability filter"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto text-2xs font-semibold text-primary hover:underline"
              >
                {t("market.clearFilters")}
              </button>
            </div>
          )}

          {/* Results count & showing pager info */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xs text-muted xl:text-xs" aria-live="polite">
              {!loading &&
                activeCount > 0 &&
                t("pager.showing")
                  .replace("{from}", String(pageStart + 1))
                  .replace("{to}", String(Math.min(pageStart + PER_PAGE, activeCount)))
                  .replace("{total}", String(activeCount))}
            </span>
          </div>

          {loadError ? (
            <ErrorState error={loadError} onRetry={load} />
          ) : loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : tab === "services" ? (
            filteredServices.length === 0 ? (
              <EmptyState title={t(savedOnly ? "market.emptySaved" : "market.empty")} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {pagedServices.map((service) => {
                  const seller = sellerById.get(service.sellerId);
                  return (
                    <Card
                      key={service.id}
                      padding="none"
                      hoverable
                      className="group relative flex h-full flex-col overflow-hidden"
                    >
                      <Link
                        href={`/xaridor/bozor/xizmat/${service.id}`}
                        className="absolute inset-0 z-0 rounded-card"
                        aria-label={service.title}
                      />
                      {service.images[0] && (
                        <div className="aspect-[3/1.6] w-full overflow-hidden border-b border-line bg-surface">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={service.images[0]}
                            alt={service.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="pointer-events-none relative z-10 flex flex-1 flex-col gap-2.5 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <Badge tone="primary">{t(`cat.${service.category}`)}</Badge>
                          <button
                            type="button"
                            onClick={() => void toggleSaved(service.id)}
                            aria-label={t(savedIds?.includes(service.id) ? "market.unsave" : "market.save")}
                            aria-pressed={savedIds?.includes(service.id)}
                            className="pointer-events-auto -mr-1 -mt-1 rounded-btn p-2 text-faint transition-colors hover:bg-card-hover hover:text-primary"
                          >
                            <BookmarkIcon filled={savedIds?.includes(service.id)} />
                          </button>
                        </div>
                        <h3 className="font-heading text-sm font-bold text-ink group-hover:text-primary transition-colors">
                          {service.title}
                        </h3>
                        <p className="line-clamp-2 text-xs text-muted">
                          {service.description}
                        </p>
                        {seller && (
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <Avatar name={seller.user.fullName} size="sm" />
                            <span className="truncate font-medium text-ink">
                              {seller.user.fullName}
                            </span>
                            <RatingStars value={seller.profile.rating} showValue />
                          </div>
                        )}
                        <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-xs">
                          <span className="font-heading text-sm font-bold text-primary">
                            {formatMoney(service.price, lang)}
                          </span>
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
                  );
                })}
              </div>
            )
          ) : filteredSpecialists.length === 0 ? (
            <EmptyState title={t(savedOnly ? "market.emptySaved" : "market.empty")} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pagedSpecialists.map(({ user, profile }) => (
                <Card
                  key={user.id}
                  hoverable
                  className="group relative flex h-full flex-col gap-3"
                >
                  <Link
                    href={`/xaridor/bozor/mutaxassis/${user.id}`}
                    className="absolute inset-0 z-0 rounded-card"
                    aria-label={user.fullName}
                  />
                  <div className="pointer-events-none relative z-10 flex h-full flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar name={user.fullName} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-heading text-sm font-bold text-ink group-hover:text-primary transition-colors">
                            {user.fullName}
                          </h3>
                          <TrustBadge badge={profile.badge} />
                        </div>
                        {profile.headline && (
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {profile.headline}
                          </p>
                        )}
                      </div>
                      <div className="pointer-events-auto flex items-center gap-1">
                        <Badge tone={profile.available ? "success" : "neutral"}>
                          {t(profile.available ? "avail.on" : "avail.off")}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => void toggleSaved(user.id)}
                          aria-label={t(savedIds?.includes(user.id) ? "market.unsave" : "market.save")}
                          aria-pressed={savedIds?.includes(user.id)}
                          className="rounded-btn p-2 text-faint transition-colors hover:bg-card-hover hover:text-primary"
                        >
                          <BookmarkIcon filled={savedIds?.includes(user.id)} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <RatingStars value={profile.rating} showValue />
                      <span>
                        {profile.completedContracts} {t("profile.completedContracts")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.slice(0, 4).map((skill) => (
                        <Badge key={skill}>{skill}</Badge>
                      ))}
                    </div>
                    <span className="mt-auto border-t border-line pt-3 text-xs font-medium text-primary">
                      {t("market.viewProfile")} →
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!loading && activeCount > PER_PAGE && (
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

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path
        d="M5 3.5h10v13L10 13l-5 3.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
