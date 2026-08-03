"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RatingStars } from "@/components/ui/RatingStars";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { TrustBadge } from "@/components/ui/TrustBadge";
import {
  getContracts,
  getCurrentUser,
  getReviews,
  getSellerProfile,
  getServices,
} from "@/lib/api";
import type { Contract, Review, SellerProfile, Service, User } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function ProfilPage() {
  const { t, lang } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCurrentUser(),
      getSellerProfile(),
      getServices(),
      getReviews(),
      getContracts(),
    ]).then(([u, p, s, r, c]) => {
      setUser(u);
      setProfile(p);
      setServices(s.filter((svc) => svc.status === "active"));
      setReviews(r);
      setContracts(c);
      setLoading(false);
    });
  }, []);

  const buyerByContract = new Map(contracts.map((c) => [c.id, c.buyerName]));

  if (loading || !profile) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  /* Platformada bo'lgan muddat */
  const memberMonths = Math.max(
    1,
    Math.round(
      (Date.now() - new Date(profile.memberSince).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    )
  );
  const memberDuration =
    memberMonths >= 12
      ? `${Math.floor(memberMonths / 12)} ${t("common.years")}`
      : `${memberMonths} ${t("common.months")}`;

  /* Sharhlar bo'yicha yulduzlar taqsimoti */
  const reviewCount = reviews.length;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const stats = [
    { label: t("profile.statRating"), value: profile.rating.toFixed(1) },
    { label: t("profile.statCompleted"), value: String(profile.completedContracts) },
    {
      label: t("profile.statResponse"),
      value: `${profile.responseTimeHours} ${t("common.hours")}`,
    },
    { label: t("profile.statMember"), value: memberDuration },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">
            {t("profile.title")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("profile.publicNote")}</p>
        </div>
        <Link
          href="/mutaxassis/sozlamalar"
          className="inline-flex h-9 items-center gap-2 rounded-btn border border-line bg-card px-3.5 text-xs font-medium text-ink transition-colors duration-150 hover:bg-card-hover"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M11.5 2.5l2 2L6 12l-2.7.7L4 10l7.5-7.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
          {t("profile.edit")}
        </Link>
      </div>

      {/* Profil sarlavhasi */}
      <Card padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={user?.fullName ?? "?"} size="lg" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-heading text-xl font-bold text-ink">
                {user?.fullName}
              </h2>
              <TrustBadge badge={profile.badge} />
              <Badge tone={profile.available ? "success" : "neutral"}>
                {t(profile.available ? "avail.on" : "avail.off")}
              </Badge>
            </div>
            {profile.headline && (
              <p className="mt-1 text-sm font-medium text-ink">{profile.headline}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
              <RatingStars value={profile.rating} showValue />
              <span>
                {profile.completedContracts} {t("profile.completedContracts")}
              </span>
              <span className="inline-flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-faint">
                  <path d="M8 1.8c2.5 0 4.5 2 4.5 4.5 0 3-4.5 7.4-4.5 7.4S3.5 9.3 3.5 6.3C3.5 3.8 5.5 1.8 8 1.8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <circle cx="8" cy="6.3" r="1.6" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                {profile.location}
              </span>
              <span>
                {t("profile.memberSince")} {formatDate(profile.memberSince, lang)}
              </span>
            </div>
            {/* Ishonch signali — akkount Telegram orqali tasdiqlangan */}
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-2xs font-medium text-success">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 1.5 13.5 4v3.6c0 3.3-2.3 6.1-5.5 6.9-3.2-.8-5.5-3.6-5.5-6.9V4L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5.8 8l1.6 1.6 2.8-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("profile.verifiedPhone")}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Asosiy ko'rsatkichlar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-2xs font-medium uppercase tracking-wide text-faint">
              {stat.label}
            </p>
            <p className="mt-2 font-heading text-xl font-bold text-ink">
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Men haqimda + ko'nikmalar */}
      <Card padding="lg" className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-ink">
            {t("profile.about")}
          </h2>
          <p className="mt-2 whitespace-pre-line break-words [overflow-wrap:anywhere] text-sm text-muted">
            {profile.bio}
          </p>
        </div>
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-faint">
            {t("profile.skills")}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <Badge key={skill} tone="primary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Tillar */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">
          {t("profile.languages")}
        </h2>
        {profile.languages.length === 0 ? (
          <EmptyState title={t("profile.noLanguages")} />
        ) : (
          <Card padding="none">
            {profile.languages.map((lng, i) => (
              <div
                key={lng.name}
                className={`flex items-center justify-between gap-3 p-4 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <span className="text-sm font-medium text-ink">{lng.name}</span>
                <span className="text-xs text-muted">{t(`lang.${lng.level}`)}</span>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* Xizmatlar */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">
          {t("profile.services")}
        </h2>
        {services.length === 0 ? (
          <EmptyState title={t("profile.noServices")} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <Card key={service.id} hoverable className="flex flex-col gap-2">
                <Badge tone="primary" className="self-start">
                  {t(`cat.${service.category}`)}
                </Badge>
                <h3 className="font-heading text-sm font-bold text-ink">
                  {service.title}
                </h3>
                <p className="line-clamp-2 text-xs text-muted">
                  {service.description}
                </p>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-xs">
                  <span className="font-medium text-ink">
                    {formatMoney(service.price, lang)}
                  </span>
                  <span className="text-faint">
                    {service.deliveryDays} {t("common.days")}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Portfolio — bajarilgan ishlar */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">
          {t("profile.portfolio")}
        </h2>
        {profile.portfolio.length === 0 ? (
          <EmptyState title={t("profile.noPortfolio")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.portfolio.map((item) => (
              <Card key={item.id} padding="none" className="flex flex-col overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="aspect-[3/2] w-full border-b border-line object-cover"
                />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  {item.category && (
                    <Badge tone="primary" className="self-start">
                      {t(`cat.${item.category}`)}
                    </Badge>
                  )}
                  <h3 className="font-heading text-sm font-bold text-ink">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted">{item.description}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Sharhlar */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">
          {t("profile.reviews")}
        </h2>
        {reviews.length === 0 ? (
          <EmptyState title={t("profile.noReviews")} />
        ) : (
          <>
            {/* Reyting xulosasi + taqsimot */}
            <Card padding="lg">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex flex-col items-center justify-center gap-1 sm:w-40 sm:shrink-0">
                  <span className="font-heading text-4xl font-extrabold text-ink">
                    {profile.rating.toFixed(1)}
                  </span>
                  <RatingStars value={profile.rating} />
                  <span className="text-2xs text-faint">
                    {reviewCount} {t("profile.reviews").toLowerCase()} · {t("profile.reviewsAvg")}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  {distribution.map((row) => (
                    <div key={row.star} className="flex items-center gap-2 text-2xs">
                      <span className="w-3 text-faint">{row.star}</span>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="#FFC53D" aria-hidden="true">
                        <path d="M8 1.5l2 4.1 4.5.6-3.3 3.2.8 4.5L8 11.8l-4 2.1.8-4.5L1.5 6.2 6 5.6 8 1.5Z" />
                      </svg>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card-hover">
                        <div
                          className="h-full rounded-full bg-warning transition-all duration-150"
                          style={{
                            width: `${reviewCount ? (row.count / reviewCount) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-4 text-right text-faint">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Sharhlar ro'yxati */}
            <div className="flex flex-col gap-4">
              {reviews.map((review) => {
                const buyerName =
                  review.buyerName ?? buyerByContract.get(review.contractId);
                return (
                  <Card key={review.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {buyerName && <Avatar name={buyerName} size="sm" />}
                        <div>
                          {buyerName && (
                            <p className="text-xs font-medium text-ink">{buyerName}</p>
                          )}
                          <RatingStars value={review.rating} />
                        </div>
                      </div>
                      <span className="text-2xs text-faint">
                        {formatDate(review.createdAt, lang)}
                      </span>
                    </div>
                    <p className="text-sm text-muted">{review.comment}</p>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
