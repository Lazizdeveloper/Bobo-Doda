"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { RatingStars } from "@/components/ui/RatingStars";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { OfferModal } from "@/components/shared/OfferModal";
import { catalogService, servicesService } from "@/lib/api";
import type { Service, Specialist } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function XizmatTafsilotiPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();

  const [service, setService] = useState<Service | null | undefined>(undefined);
  const [seller, setSeller] = useState<Specialist | null>(null);
  const [otherServices, setOtherServices] = useState<Service[]>([]);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [offerOpen, setOfferOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<Set<number>>(new Set());
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    servicesService
      .get(params.id)
      .then(async (found) => {
        if (found && found.status === "active") {
          setService(found);
          const [spec, allServices] = await Promise.all([
            catalogService.getSpecialist(found.sellerId),
            servicesService.listPublic(),
          ]);
          setSeller(spec);
          setOtherServices(
            allServices.filter(
              (s) => s.sellerId === found.sellerId && s.id !== found.id
            )
          );
        } else {
          setService(null);
        }
      })
      .catch(setLoadError);
  }, [params.id]);

  useEffect(load, [load]);

  if (service === undefined) {
    return loadError ? (
      <ErrorState error={loadError} onRetry={load} />
    ) : (
      <SkeletonCard />
    );
  }
  if (service === null) return <EmptyState title={t("svc.notFound")} />;

  /* Kategoriya maydonlari qiymatlarini o'qish uchun */
  function fieldValue(value: string | string[]): string {
    const label = (v: string) => (v.startsWith("opt.") ? t(v) : v);
    return Array.isArray(value) ? value.map(label).join(", ") : label(value);
  }

  const faqs = [
    {
      q: t("svc.faq1_q"),
      a: t("svc.faq1_a"),
    },
    {
      q: t("svc.faq2_q"),
      a: t("svc.faq2_a"),
    },
  ];

  function toggleExtra(i: number) {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const extras = service.extras ?? [];
  const extrasTotal = extras
    .filter((_, i) => selectedExtras.has(i))
    .reduce((sum, e) => sum + e.price, 0);
  const orderTotal = service.price + extrasTotal;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <Breadcrumb
        items={[
          { label: t("nav.market"), href: "/xaridor/bozor" },
          { label: t(`cat.${service.category}`), href: `/xaridor/bozor` },
          { label: service.title },
        ]}
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
        {/* Left Column: Images, Description, Scope, FAQs */}
        <div className="flex flex-col gap-6">
          {/* Header Title */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{t(`cat.${service.category}`)}</Badge>
              {seller && (
                <span className="text-xs text-muted">
                  Mutaxassis:{" "}
                  <Link
                    href={`/xaridor/bozor/mutaxassis/${seller.user.id}`}
                    className="font-medium text-ink hover:text-primary hover:underline"
                  >
                    {seller.user.fullName}
                  </Link>
                </span>
              )}
            </div>
            <h1 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">
              {service.title}
            </h1>
          </div>

          {/* Image Gallery with Thumbnails */}
          {service.images.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={service.images[selectedImageIdx] || service.images[0]}
                  alt={service.title}
                  className="aspect-[16/10] w-full object-cover sm:aspect-[16/9]"
                />
              </div>
              {service.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {service.images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={t("a11y.image").replace("{n}", String(i + 1))}
                      onClick={() => setSelectedImageIdx(i)}
                      className={`relative aspect-[16/10] w-20 shrink-0 overflow-hidden rounded-btn border-2 transition-all ${
                        selectedImageIdx === i
                          ? "border-primary shadow-xs ring-2 ring-primary/20"
                          : "border-line opacity-70 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description & Technical Fields */}
          <Card padding="lg" className="flex flex-col gap-5">
            <div>
              <h2 className="font-heading text-base font-bold text-ink">
                {t("svc.about")}
              </h2>
              <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-muted">
                {service.description}
              </p>
            </div>

            {Object.keys(service.fields).length > 0 && (
              <div className="border-t border-line pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-faint">
                  {t("svc.details")}
                </h3>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(service.fields).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-input border border-line bg-surface p-2.5 text-xs"
                    >
                      <dt className="text-2xs font-medium text-muted">
                        {t(`field.${key}`)}
                      </dt>
                      <dd className="mt-0.5 font-bold text-ink">{fieldValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Card>

          {/* Scope of Work & Inclusions Checklist */}
          <Card padding="lg" className="flex flex-col gap-4 border-primary/20 bg-primary/5">
            <h2 className="font-heading text-base font-bold text-ink">
              {t("svc.includedTitle")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-success font-bold">✓</span>
                <div>
                  <p className="font-medium text-ink">{t("svc.revisionsIncluded")}</p>
                  <p className="text-2xs text-muted">
                    {service?.revisionsIncluded !== undefined
                      ? t("svc.revisionsCount").replace(
                          "{count}",
                          String(service.revisionsIncluded)
                        )
                      : t("svc.revisionsByAgreement")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-success font-bold">✓</span>
                <div>
                  <p className="font-medium text-ink">{t("svc.deliveryGuarantee")}</p>
                  <p className="text-2xs text-muted">{service.deliveryDays} {t("common.days")}</p>
                </div>
              </div>
              {(service.included ?? []).map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-success font-bold">✓</span>
                  <p className="font-medium text-ink">{item}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Buyer Requirements */}
          <Card padding="lg" className="flex flex-col gap-3">
            <h2 className="font-heading text-base font-bold text-ink">
              {t("svc.requirementsTitle")}
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              {t("svc.requirementsDesc")}
            </p>
            {service.requirements && service.requirements.length > 0 ? (
              <ul className="flex flex-col gap-2 rounded-input border border-line bg-surface p-3.5 text-xs text-muted">
                {service.requirements.map((req, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-primary font-bold">{i + 1}.</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-input border border-line bg-surface p-3.5 text-xs text-faint">
                {t("svc.requirementsEmpty")}
              </p>
            )}
          </Card>

          {/* Service FAQs */}
          <Card padding="lg" className="flex flex-col gap-4">
            <h2 className="font-heading text-base font-bold text-ink">
              {t("svc.faqTitle")}
            </h2>
            <div className="flex flex-col divide-y divide-line">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-3">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-3 text-left font-heading text-xs font-bold text-ink hover:text-primary transition-colors"
                    >
                      <span>{faq.q}</span>
                      <span className="text-primary font-bold">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <p className="mt-2 text-xs text-muted leading-relaxed">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Seller's Other Services */}
          {otherServices.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="font-heading text-lg font-bold text-ink">
                {t("svc.otherServices")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {otherServices.map((other) => (
                  <Link
                    key={other.id}
                    href={`/xaridor/bozor/xizmat/${other.id}`}
                    className="group block"
                  >
                    <Card hoverable className="flex h-full flex-col justify-between gap-3 p-4">
                      <div className="flex flex-col gap-1.5">
                        <Badge tone="primary" className="self-start">
                          {t(`cat.${other.category}`)}
                        </Badge>
                        <h3 className="font-heading text-xs font-bold text-ink group-hover:text-primary transition-colors">
                          {other.title}
                        </h3>
                        <p className="line-clamp-2 text-2xs text-muted">
                          {other.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-line pt-2.5 text-xs">
                        <span className="font-heading font-bold text-primary">
                          {formatMoney(other.price, lang)}
                        </span>
                        <span className="text-2xs text-muted">
                          {other.deliveryDays} {t("common.days")}
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Sticky Pricing & Seller Column */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
          {/* Main Pricing & Order Card */}
          <Card padding="lg" className="flex flex-col gap-4 border-2 border-primary/20 shadow-card">
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-muted">
                {t("svc.price")}
              </p>
              <p className="mt-1 font-heading text-2xl font-black text-primary">
                {formatMoney(service.price, lang)}
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-input border border-line bg-surface p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">{t("svc.delivery")}</span>
                <span className="font-bold text-ink">
                  {service.deliveryDays} {t("common.days")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">{t("svc.revisionsIncluded")}</span>
                <span className="font-bold text-success">
                  {service.revisionsIncluded !== undefined
                    ? t("svc.revisionsCount").replace("{count}", String(service.revisionsIncluded))
                    : t("svc.revisionsByAgreement")}
                </span>
              </div>
            </div>

            {extras.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-line pt-3">
                <p className="text-2xs font-bold uppercase tracking-wider text-muted">
                  {t("svc.extrasTitle")}
                </p>
                {extras.map((extra, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-input border border-line p-2.5 text-xs transition-colors duration-150 hover:border-primary"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedExtras.has(i)}
                        onChange={() => toggleExtra(i)}
                        className="h-4 w-4 rounded border-field text-primary focus:ring-primary"
                      />
                      <span className="text-ink">{extra.label}</span>
                    </span>
                    <span className="shrink-0 font-bold text-ink">
                      +{formatMoney(extra.price, lang)}
                    </span>
                  </label>
                ))}
                {selectedExtras.size > 0 && (
                  <div className="flex items-center justify-between border-t border-line pt-2 text-sm">
                    <span className="font-medium text-ink">{t("svc.orderTotal")}</span>
                    <span className="font-heading font-black text-primary">
                      {formatMoney(orderTotal, lang)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Button
              size="lg"
              className="w-full justify-center shadow-btn"
              onClick={() => setOfferOpen(true)}
            >
              {t("svc.orderCta")} →
            </Button>

            <p className="rounded-input border border-primary/15 bg-primary/5 p-3 text-2xs text-muted leading-relaxed">
              {t("offer.budgetHint")}
            </p>
          </Card>

          {/* Seller Card */}
          {seller && (
            <Card padding="md" className="flex flex-col gap-3.5">
              <h3 className="text-2xs font-bold uppercase tracking-wider text-faint">
                {t("svc.aboutSeller")}
              </h3>
              <div className="flex items-center gap-3">
                <Avatar name={seller.user.fullName} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-bold text-ink">
                      {seller.user.fullName}
                    </p>
                    <TrustBadge badge={seller.profile.badge} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <RatingStars value={seller.profile.rating} showValue />
                  </div>
                </div>
              </div>

              {seller.profile.headline && (
                <p className="text-2xs text-muted font-medium">
                  {seller.profile.headline}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-line pt-3 text-2xs text-muted">
                <span>Bajarilgan: {seller.profile.completedContracts}</span>
                <Badge tone={seller.profile.available ? "success" : "neutral"}>
                  {t(seller.profile.available ? "avail.on" : "avail.off")}
                </Badge>
              </div>

              <Link
                href={`/xaridor/bozor/mutaxassis/${seller.user.id}`}
                className="mt-1 text-center text-xs font-semibold text-primary hover:underline"
              >
                {t("market.viewProfile")} →
              </Link>
            </Card>
          )}

          {/* 100% Escrow Guarantee Badge */}
          <Card padding="md" className="border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="rounded-btn bg-primary/10 p-2 text-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <h4 className="font-heading text-xs font-bold text-ink">
                  {t("svc.escrowBadgeTitle")}
                </h4>
                <p className="mt-1 text-2xs text-muted leading-relaxed">
                  {t("svc.escrowBadgeDesc")}
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      {/* Taklif yuborish modali */}
      <OfferModal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        sellerId={service.sellerId}
        service={service}
        initialBudget={orderTotal}
        selectedExtras={extras.filter((_, i) => selectedExtras.has(i))}
      />
    </div>
  );
}
