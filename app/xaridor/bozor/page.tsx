"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { searchMatches } from "@/lib/search";
import { servicesService } from "@/lib/api";
import type { Service } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

type Sort = "new" | "cheap" | "expensive";

/* Bosqich 17 — real backendda PUBLIC mutaxassis direktoriyasi (reyting/
   joylashuv/mavjudlik bilan) yo'q, faqat xizmatlar katalogi bor. Shuning
   uchun "Mutaxassislar" tabi, saqlangan (bookmark) va sotuvchi profiliga
   bog'liq filtrlar (reyting/joylashuv/mavjudlik) olib tashlangan. */
export default function BozorPage() {
  const { t, lang } = useT();
  const [services, setServices] = useState<Service[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<Sort>("new");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState<unknown>(null);
  const debouncedSearch = useDebouncedValue(search, 250);
  const PER_PAGE = 12;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("q");
    const cat = sp.get("cat");
    const s = sp.get("sort");
    const minP = sp.get("minPrice");
    const maxP = sp.get("maxPrice");
    const deliv = sp.get("delivery");
    if (q) setSearch(q);
    if (cat) setCategory(cat);
    if (s && ["new", "cheap", "expensive"].includes(s)) setSort(s as Sort);
    if (minP) setMinPrice(minP);
    if (maxP) setMaxPrice(maxP);
    if (deliv) setDeliveryFilter(deliv);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams();
    if (search.trim()) sp.set("q", search.trim());
    if (category !== "all") sp.set("cat", category);
    if (sort !== "new") sp.set("sort", sort);
    if (minPrice) sp.set("minPrice", minPrice);
    if (maxPrice) sp.set("maxPrice", maxPrice);
    if (deliveryFilter !== "all") sp.set("delivery", deliveryFilter);
    const qs = sp.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [search, category, sort, minPrice, maxPrice, deliveryFilter]);

  useEffect(() => {
    setPage(1);
  }, [category, sort, debouncedSearch, minPrice, maxPrice, deliveryFilter]);

  const load = useCallback(() => {
    setLoadError(null);
    servicesService
      .listPublic()
      .then((nextServices) => {
        setServices(nextServices);
        setCategories(Array.from(new Set(nextServices.map((s) => s.category))));
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  function clearAllFilters() {
    setSearch("");
    setCategory("all");
    setSort("new");
    setMinPrice("");
    setMaxPrice("");
    setDeliveryFilter("all");
  }

  const query = debouncedSearch.trim();
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
      if (sort === "cheap") return a.price - b.price;
      if (sort === "expensive") return b.price - a.price;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const loading = !services;
  const totalPages = Math.max(1, Math.ceil(filteredServices.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PER_PAGE;
  const pagedServices = filteredServices.slice(pageStart, pageStart + PER_PAGE);

  const categoryOptions = [
    { value: "all", label: t("jobs.allCategories") },
    ...categories.map((cat) => ({ value: cat, label: t(`cat.${cat}`) })),
  ];
  const sortOptions = [
    { value: "new", label: t("jobs.sortNew") },
    { value: "cheap", label: t("market.sortCheap") },
    { value: "expensive", label: t("market.sortExpensive") },
  ];
  const deliveryOptions = [
    { value: "all", label: t("market.deliveryAny") },
    { value: "3", label: t("market.delivery3") },
    { value: "7", label: t("market.delivery7") },
    { value: "14", label: t("market.delivery14") },
  ];

  const hasActiveFilters =
    category !== "all" || search.trim().length > 0 || minPrice !== "" || maxPrice !== "" || deliveryFilter !== "all";

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink xl:text-3xl">{t("market.title")}</h1>
        <p className="mt-1 text-sm text-muted xl:text-base">{t("market.subtitle")}</p>
      </div>

      <div className="xl:grid xl:grid-cols-[300px_1fr] xl:items-start xl:gap-8">
        <aside className="hidden xl:sticky xl:top-24 xl:block">
          <Card padding="lg" className="flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="font-heading text-sm font-bold text-ink">{t("market.filtersTitle")}</h2>
              {hasActiveFilters && (
                <button type="button" onClick={clearAllFilters} className="text-2xs font-medium text-primary hover:underline">
                  {t("market.clearFilters")}
                </button>
              )}
            </div>

            <SearchInput value={search} onChange={setSearch} placeholder={t("market.searchPh")} aria-label={t("market.searchPh")} clearLabel={t("search.clear")} />
            <Select label={t("jobs.category")} value={category} onChange={(e) => setCategory(e.target.value)} options={categoryOptions} />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-ink">{t("market.filterPrice")}</span>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={t("market.priceMin")} aria-label={t("market.priceMinLabel")} type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                <Input placeholder={t("market.priceMax")} aria-label={t("market.priceMaxLabel")} type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
            </div>

            <Select label={t("market.filterDelivery")} value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)} options={deliveryOptions} />
            <Select label={t("jobs.sort")} value={sort} onChange={(e) => setSort(e.target.value as Sort)} options={sortOptions} />
          </Card>
        </aside>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 xl:hidden">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SearchInput value={search} onChange={setSearch} placeholder={t("market.searchPh")} aria-label={t("market.searchPh")} clearLabel={t("search.clear")} />
              <Select aria-label={t("jobs.category")} value={category} onChange={(e) => setCategory(e.target.value)} options={categoryOptions} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select aria-label={t("jobs.sort")} value={sort} onChange={(e) => setSort(e.target.value as Sort)} options={sortOptions} className="sm:w-44" />
              <Select aria-label={t("market.filterDelivery")} value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)} options={deliveryOptions} className="sm:w-40" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-2xs text-muted xl:text-xs" aria-live="polite">
              {!loading &&
                filteredServices.length > 0 &&
                t("pager.showing")
                  .replace("{from}", String(pageStart + 1))
                  .replace("{to}", String(Math.min(pageStart + PER_PAGE, filteredServices.length)))
                  .replace("{total}", String(filteredServices.length))}
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
          ) : filteredServices.length === 0 ? (
            <EmptyState title={t("market.empty")} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pagedServices.map((service) => (
                <Card key={service.id} padding="none" hoverable className="group relative flex h-full flex-col overflow-hidden">
                  <Link href={`/xaridor/bozor/xizmat/${service.id}`} className="absolute inset-0 z-0 rounded-card" aria-label={service.title} />
                  <div className="relative z-10 flex flex-1 flex-col gap-2.5 p-4">
                    <Badge tone="primary">{t(`cat.${service.category}`)}</Badge>
                    <h3 className="font-heading text-sm font-bold text-ink group-hover:text-primary transition-colors">{service.title}</h3>
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
          )}

          {!loading && filteredServices.length > PER_PAGE && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
              labels={{ prev: t("pager.prev"), next: t("pager.next"), page: t("pager.page"), nav: t("a11y.pagination") }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
