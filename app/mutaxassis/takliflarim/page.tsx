"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import {
  OfferStatusBadge,
  ProposalStatusBadge,
} from "@/components/shared/StatusBadge";
import { getIncomingOffers, getJobs, getProposals } from "@/lib/mock-api";
import type { Job, Offer, Proposal, ProposalStatus } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

const STATUSES: ProposalStatus[] = [
  "yuborilgan",
  "korib_chiqilmoqda",
  "suhbat",
  "yollandi",
  "rad_etildi",
  "qaytarib_olingan",
];

type Filter = "all" | ProposalStatus;

export default function TakliflarimPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    getProposals().then(setProposals);
    getJobs().then(setJobs);
    getIncomingOffers().then(setOffers);
  }, []);

  const jobById = new Map(jobs.map((j) => [j.id, j]));

  const filtered =
    proposals?.filter((p) => filter === "all" || p.status === filter) ?? [];

  function openProposal(proposal: Proposal) {
    router.push(`/mutaxassis/takliflarim/${proposal.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-extrabold text-ink">
        {t("props.title")}
      </h1>

      {/* Buyurtmachilardan kelgan to'g'ridan-to'g'ri takliflar */}
      {offers.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-ink">
              {t("soffers.title")}{" "}
              <span className="text-muted">({offers.length})</span>
            </h2>
            <p className="mt-0.5 text-xs text-muted">{t("soffers.hint")}</p>
          </div>
          <div className="flex flex-col gap-3">
            {offers.map((offer) => (
              <Link
                key={offer.id}
                href={`/mutaxassis/takliflarim/kelgan/${offer.id}`}
                className="block"
              >
                <Card hoverable className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={offer.buyerName} size="sm" />
                      <span className="text-sm font-medium text-ink">
                        {offer.buyerName}
                      </span>
                    </span>
                    <OfferStatusBadge status={offer.status} />
                  </div>
                  <p className="text-sm font-medium text-ink">{offer.title}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="font-medium text-ink">
                      {formatMoney(offer.budget, lang)}
                    </span>
                    <span className="text-faint">
                      {formatDate(offer.createdAt, lang)}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Tabs
        value={filter}
        onChange={(value) => setFilter(value as Filter)}
        items={[
          { value: "all", label: t("props.filterAll"), count: proposals?.length },
          ...STATUSES.map((status) => ({
            value: status,
            label: t(`pstatus.${status}`),
            count: proposals?.filter((p) => p.status === status).length,
          })),
        ]}
      />

      {!proposals ? (
        <SkeletonCard />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={proposals.length === 0 ? t("props.empty") : t("props.emptyFiltered")}
          action={
            proposals.length === 0 ? (
              <Link href="/mutaxassis/ish-elonlari">
                <Button>{t("props.emptyCta")}</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((proposal) => {
            const job = jobById.get(proposal.jobId);
            const hired = proposal.status === "yollandi";
            return (
              <button
                key={proposal.id}
                type="button"
                onClick={() => openProposal(proposal)}
                className="text-left"
              >
                <Card hoverable className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-heading text-sm font-bold text-ink">
                      {job?.title ?? "—"}
                    </h3>
                    <ProposalStatusBadge status={proposal.status} />
                  </div>
                  <p className="line-clamp-2 text-xs text-muted">
                    {proposal.coverLetter}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs">
                    <span className="text-muted">
                      {t("props.bid")}:{" "}
                      <span className="font-medium text-ink">
                        {formatMoney(proposal.bidAmount, lang)}
                      </span>
                    </span>
                    <span className="text-faint">
                      {formatDate(proposal.createdAt, lang)}
                    </span>
                    {hired && (
                      <span className="ml-auto font-medium text-primary">
                        {t("props.openContract")} →
                      </span>
                    )}
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
