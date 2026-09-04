"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { RatingStars } from "@/components/ui/RatingStars";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { ProposalChat } from "@/components/shared/ProposalChat";
import { ProposalStatusBadge } from "@/components/shared/StatusBadge";
import { catalogService, jobsService, proposalsService } from "@/lib/api";
import type { Job, Proposal, Specialist } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

/* Xaridor tomonidagi taklif suhbati. Ilgari "Suhbatga taklif qilish" faqat
   holatni o'zgartirar va bildirishnoma yuborardi — gaplashish uchun hech
   qanday joy yo'q edi. */
const OPEN_STATUSES = ["yuborilgan", "korib_chiqilmoqda", "suhbat"];

export default function TaklifSuhbatiPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string; proposalId: string }>();

  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [proposal, setProposal] = useState<Proposal | null | undefined>(undefined);
  const [spec, setSpec] = useState<Specialist | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      jobsService.listMine(),
      proposalsService.get(params.proposalId),
    ])
      .then(async ([jobs, found]) => {
        setJob(jobs.find((item) => item.id === params.id) ?? null);
        setProposal(found);
        if (found) setSpec(await catalogService.getSpecialist(found.sellerId));
      })
      /* Yuklash xatosi "topilmadi" EMAS */
      .catch(setLoadError);
  }, [params.id, params.proposalId]);

  useEffect(load, [load]);

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;
  if (job === undefined || proposal === undefined) return <SkeletonCard />;
  if (job === null || proposal === null) {
    return <EmptyState title={t("common.notFound")} />;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Breadcrumb
        items={[
          { label: t("nav.myJobs"), href: "/xaridor/elonlarim" },
          { label: job.title, href: `/xaridor/elonlarim/${job.id}` },
          { label: t("pchat.title") },
        ]}
      />

      <Card padding="lg" className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/xaridor/bozor/mutaxassis/${proposal.sellerId}`}
          className="group flex items-center gap-3"
        >
          <Avatar name={spec?.user.fullName ?? "?"} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-ink transition-colors duration-150 group-hover:text-primary">
                {spec?.user.fullName ?? "—"}
              </span>
              {spec && <TrustBadge badge={spec.profile.badge} />}
            </div>
            {spec && <RatingStars value={spec.profile.rating} showValue />}
          </div>
        </Link>
        <div className="text-right">
          <p className="text-2xs font-medium uppercase tracking-wide text-faint">
            {t("props.bid")}
          </p>
          <p className="mt-0.5 font-heading text-base font-bold text-ink">
            {formatMoney(proposal.bidAmount, lang)}
          </p>
          <div className="mt-1 flex justify-end">
            <ProposalStatusBadge status={proposal.status} />
          </div>
        </div>
      </Card>

      <ProposalChat
        proposalId={proposal.id}
        counterpartName={spec?.user.fullName ?? ""}
        open={job.status === "ochiq" && OPEN_STATUSES.includes(proposal.status)}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={`/xaridor/elonlarim/${job.id}`}>
          <Button variant="ghost">{t("common.back")}</Button>
        </Link>
        {job.status === "ochiq" && OPEN_STATUSES.includes(proposal.status) && (
          <Link href={`/xaridor/elonlarim/${job.id}/yollash/${proposal.id}`}>
            <Button>{t("bprop.hire")}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
