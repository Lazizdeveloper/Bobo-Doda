"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RatingStars } from "@/components/ui/RatingStars";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { OfferModal } from "@/components/shared/OfferModal";
import { getService, getSpecialist, type Specialist } from "@/lib/mock-api";
import type { Service } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function XizmatTafsilotiPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();

  const [service, setService] = useState<Service | null | undefined>(undefined);
  const [seller, setSeller] = useState<Specialist | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);

  useEffect(() => {
    getService(params.id).then((found) => {
      setService(found && found.status === "active" ? found : null);
      if (found) getSpecialist(found.sellerId).then(setSeller);
    });
  }, [params.id]);

  if (service === undefined) return <SkeletonCard />;
  if (service === null) return <EmptyState title={t("svc.notFound")} />;

  /* Kategoriya maydonlari qiymatlarini o'qish uchun */
  function fieldValue(value: string | string[]): string {
    const label = (v: string) => (v.startsWith("opt.") ? t(v) : v);
    return Array.isArray(value) ? value.map(label).join(", ") : label(value);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{t(`cat.${service.category}`)}</Badge>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {service.title}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {service.images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {service.images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`${service.title} — ${i + 1}`}
                  className="h-40 flex-1 rounded-card border border-line object-cover"
                />
              ))}
            </div>
          )}

          <Card padding="lg">
            <h2 className="font-heading text-base font-bold text-ink">
              {t("svc.about")}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
              {service.description}
            </p>

            {Object.keys(service.fields).length > 0 && (
              <div className="mt-6 border-t border-line pt-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-faint">
                  {t("svc.details")}
                </h3>
                <dl className="mt-2 flex flex-col divide-y divide-line">
                  {Object.entries(service.fields).map(([key, value]) => (
                    <div key={key} className="flex gap-4 py-2 text-sm">
                      <dt className="w-40 shrink-0 text-xs text-faint">
                        {t(`field.${key}`)}
                      </dt>
                      <dd className="text-ink">{fieldValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Card>
        </div>

        {/* Yon panel */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <div>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("svc.price")}
              </p>
              <p className="mt-1 font-heading text-xl font-bold text-ink">
                {formatMoney(service.price, lang)}
              </p>
            </div>
            <p className="text-xs text-muted">
              {t("svc.delivery")}: {service.deliveryDays} {t("common.days")}
            </p>
            <Button className="w-full" onClick={() => setOfferOpen(true)}>
              {t("offer.send")}
            </Button>
            <p className="rounded-input border border-accent/25 bg-accent/5 p-3 text-2xs text-muted">
              {t("offer.budgetHint")}
            </p>
          </Card>

          {seller && (
            <Card className="flex flex-col gap-3">
              <h3 className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("svc.aboutSeller")}
              </h3>
              <div className="flex items-center gap-3">
                <Avatar name={seller.user.fullName} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {seller.user.fullName}
                  </p>
                  <RatingStars value={seller.profile.rating} showValue />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TrustBadge badge={seller.profile.badge} />
                <Badge tone={seller.profile.available ? "success" : "neutral"}>
                  {t(seller.profile.available ? "avail.on" : "avail.off")}
                </Badge>
                <span className="text-2xs text-faint">
                  {seller.profile.completedContracts}{" "}
                  {t("profile.completedContracts")}
                </span>
              </div>
              <Link
                href={`/xaridor/bozor/mutaxassis/${seller.user.id}`}
                className="text-xs font-medium text-primary transition-colors duration-150 hover:text-ink"
              >
                {t("market.viewProfile")} →
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* Taklif yuborish modali (to'lovsiz) */}
      <OfferModal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        sellerId={service.sellerId}
        service={service}
      />
    </div>
  );
}
