"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { RatingStars } from "@/components/ui/RatingStars";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { OfferModal } from "@/components/shared/OfferModal";
import { catalogService, servicesService } from "@/lib/api";
import type { Review, Service, Specialist } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function MutaxassisProfiliPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const [specialist, setSpecialist] = useState<Specialist | null | undefined>(
    undefined
  );
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [offerOpen, setOfferOpen] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      catalogService.getSpecialist(params.id),
      servicesService.listPublic(),
      catalogService.listSellerReviews(params.id),
    ])
      .then(([spec, allServices, reviewList]) => {
        setSpecialist(spec);
        setServices(allServices.filter((s) => s.sellerId === params.id));
        setReviews(reviewList);
      })
      .catch(setLoadError);
  }, [params.id]);

  useEffect(load, [load]);

  if (specialist === undefined) {
    return loadError ? (
      <ErrorState error={loadError} onRetry={load} />
    ) : (
      <SkeletonCard />
    );
  }
  if (specialist === null) return <EmptyState title={t("spec.notFound")} />;

  const { user, profile } = specialist;

  return (
    <div className="flex flex-col gap-6">
      {/* Sarlavha */}
      <Card padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={user.fullName} size="lg" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-xl font-bold text-ink">
                {user.fullName}
              </h1>
              <TrustBadge badge={profile.badge} />
              <Badge tone={profile.available ? "success" : "neutral"}>
                {t(profile.available ? "avail.on" : "avail.off")}
              </Badge>
            </div>
            {profile.headline && (
              <p className="mt-1 text-sm font-medium text-ink">
                {profile.headline}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
              <RatingStars value={profile.rating} showValue />
              <span>
                {profile.completedContracts} {t("profile.completedContracts")}
              </span>
              {profile.location && <span>{profile.location}</span>}
              <span>
                {t("profile.memberSince")} {formatDate(profile.memberSince, lang)}
              </span>
            </div>
          </div>
          <div className="sm:self-start">
            <Button onClick={() => setOfferOpen(true)}>{t("offer.send")}</Button>
          </div>
        </div>
      </Card>

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
        {profile.languages.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-faint">
              {t("profile.languages")}
            </h3>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {profile.languages.map((lng) => (
                <span key={lng.name}>
                  <span className="text-ink">{lng.name}</span> ·{" "}
                  {t(`lang.${lng.level}`)}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Xizmatlari — buyurtma berish mumkin */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">
          {t("profile.services")}
        </h2>
        {services.length === 0 ? (
          <EmptyState title={t("profile.noServices")} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/xaridor/bozor/xizmat/${service.id}`}
                className="block"
              >
                <Card hoverable className="flex h-full flex-col gap-2">
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
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Portfolio */}
      {profile.portfolio.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-bold text-ink">
            {t("profile.portfolio")}
          </h2>
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
        </section>
      )}

      {/* Sharhlar */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">
          {t("profile.reviews")}
        </h2>
        {reviews.length === 0 ? (
          <EmptyState title={t("profile.noReviews")} />
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <Card key={review.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {review.buyerName && (
                      <Avatar name={review.buyerName} size="sm" />
                    )}
                    <div>
                      {review.buyerName && (
                        <p className="text-xs font-medium text-ink">
                          {review.buyerName}
                        </p>
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
            ))}
          </div>
        )}
      </section>

      {/* Taklif yuborish modali (to'lovsiz) */}
      <OfferModal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        sellerId={user.id}
      />
    </div>
  );
}
