"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { RatingStars } from "@/components/ui/RatingStars";
import { Select } from "@/components/ui/Select";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { CATEGORIES } from "@/lib/category-fields";
import { getPublicServices, getSpecialists, type Specialist } from "@/lib/mock-api";
import type { Service } from "@/lib/types";
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

  useEffect(() => {
    getPublicServices().then(setServices);
    getSpecialists().then(setSpecialists);
  }, []);

  const sellerById = new Map(specialists?.map((s) => [s.user.id, s]));
  const query = search.trim().toLowerCase();

  const filteredServices = (services ?? [])
    .filter((s) => category === "all" || s.category === category)
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

  const loading = !services || !specialists;

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
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("market.searchPh")}
          aria-label={t("market.searchPh")}
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

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : tab === "services" ? (
        filteredServices.length === 0 ? (
          <EmptyState title={t("market.empty")} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredServices.map((service) => {
              const seller = sellerById.get(service.sellerId);
              return (
                <Link
                  key={service.id}
                  href={`/xaridor/bozor/xizmat/${service.id}`}
                  className="block"
                >
                  <Card padding="none" hoverable className="flex h-full flex-col overflow-hidden">
                    {service.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={service.images[0]}
                        alt={service.title}
                        className="aspect-[3/1.4] w-full border-b border-line object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col gap-2.5 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="primary">{t(`cat.${service.category}`)}</Badge>
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
                </Link>
              );
            })}
          </div>
        )
      ) : filteredSpecialists.length === 0 ? (
        <EmptyState title={t("market.empty")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSpecialists.map(({ user, profile }) => (
            <Link
              key={user.id}
              href={`/xaridor/bozor/mutaxassis/${user.id}`}
              className="block"
            >
              <Card hoverable className="flex h-full flex-col gap-3">
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
                  <Badge tone={profile.available ? "success" : "neutral"}>
                    {t(profile.available ? "avail.on" : "avail.off")}
                  </Badge>
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
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
