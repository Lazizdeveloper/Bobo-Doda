"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { OfferStatusBadge } from "@/components/shared/StatusBadge";
import { getSentOffers } from "@/lib/api";
import type { Offer } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function XaridorTakliflarimPage() {
  const { t, lang } = useT();
  const [offers, setOffers] = useState<Offer[] | null>(null);

  useEffect(() => {
    getSentOffers().then(setOffers);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("offers.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("offers.subtitle")}</p>
      </div>

      {!offers ? (
        <SkeletonCard />
      ) : offers.length === 0 ? (
        <EmptyState
          title={t("offers.empty")}
          action={
            <Link href="/xaridor/bozor">
              <Button>{t("offers.emptyCta")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {offers.map((offer) => (
            <Link
              key={offer.id}
              href={`/xaridor/takliflarim/${offer.id}`}
              className="block"
            >
              <Card hoverable className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={offer.sellerName} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {offer.sellerName}
                      </p>
                      <p className="mt-0.5 text-2xs text-faint">
                        {formatDate(offer.createdAt, lang)}
                      </p>
                    </div>
                  </div>
                  <OfferStatusBadge status={offer.status} />
                </div>
                <h3 className="font-heading text-sm font-bold text-ink">
                  {offer.title}
                </h3>
                <p className="line-clamp-2 text-xs text-muted">{offer.message}</p>
                <div className="flex items-center justify-between border-t border-line pt-3 text-xs">
                  <span className="font-medium text-ink">
                    {formatMoney(offer.budget, lang)}
                  </span>
                  {offer.status === "qabul_qilindi" && offer.contractId && (
                    <span className="font-medium text-primary">
                      {t("props.openContract")} →
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
