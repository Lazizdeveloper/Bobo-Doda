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
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState<unknown>(null);
  const debouncedSearch = useDebouncedValue(search, 250);
  const PER_PAGE = 12;

  /* Filtr/tab/qidiruv o'zgarsa — birinchi sahifaga qaytish */
  useEffect(() => {
    setPage(1);
  }, [tab, category, sort, savedOnly, debouncedSearch]);

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
      /* Yuklash xatosi bo'sh ro'yxat EMAS — alohida holat ko'rsatiladi */
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  async function toggleSaved(id: string) {
    setSavedIds(await savedService.toggleMarketItem(id));
  }

  const sellerById = new Map(specialists?.map((s) => [s.user.id, s]));
  const query = debouncedSearch.trim().toLowerCase();

  const filteredServices = (services ?? [])
    .filter((s) => category === "all" || s.category === category)
    .filter((s) => !savedOnly || savedIds?.includes(s.id))
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
    .filter(
      (s) =>
        !query ||
        s.user.fullName.toLowerCase().includes(query) ||
        s.profile.headline.toLowerCase().includes(query) ||
        s.profile.skills.some((skill) => skill.toLowerCase().includes(query))
    )
    .sort((a, b) => b.profile.rating - a.profile.rating);

  const loading = !services || !specialists || !savedIds;

  /* Client-side pagination (backend-ready: keyin API offset/limit'ga o'tadi) */
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("market.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("market.subtitle")}</p>
      </div>

      <Tabs
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

      {/* Qidiruv va filtrlar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          options={[
            { value: "all", label: t("jobs.allCategories") },
            ...CATEGORIES.map((cat) => ({ value: cat, label: t(`cat.${cat}`) })),
          ]}
        />
        {tab === "services" && (
          <Select
            aria-label={t("jobs.sort")}
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            options={[
              { value: "new", label: t("jobs.sortNew") },
              { value: "cheap", label: t("market.sortCheap") },
              { value: "expensive", label: t("market.sortExpensive") },
              { value: "rating", label: t("market.sortRating") },
            ]}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
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
        <span className="text-2xs text-faint" aria-live="polite">
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
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : tab === "services" ? (
        filteredServices.length === 0 ? (
          <EmptyState title={t(savedOnly ? "market.emptySaved" : "market.empty")} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pagedServices.map((service) => {
              const seller = sellerById.get(service.sellerId);
              return (
                <Card
                  key={service.id}
                  padding="none"
                  hoverable
                  className="relative flex h-full flex-col overflow-hidden"
                >
                  <Link
                    href={`/xaridor/bozor/xizmat/${service.id}`}
                    className="absolute inset-0 z-0 rounded-card"
                    aria-label={service.title}
                  />
                    {service.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={service.images[0]}
                        alt={service.title}
                        className="aspect-[3/1.4] w-full border-b border-line object-cover"
                      />
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
                      <h3 className="font-heading text-sm font-bold text-ink">
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
                        <span className="font-heading text-sm font-bold text-ink">
                          {formatMoney(service.price, lang)}
                        </span>
                        <span className="text-faint">
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
        <div className="grid gap-4 md:grid-cols-2">
          {pagedSpecialists.map(({ user, profile }) => (
            <Card
              key={user.id}
              hoverable
              className="relative flex h-full flex-col gap-3"
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
                      <h3 className="font-heading text-sm font-bold text-ink">
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
