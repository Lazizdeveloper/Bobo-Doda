"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RatingStars } from "@/components/ui/RatingStars";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { JobStatusBadge } from "@/components/shared/StatusBadge";
import {
  getJob,
  getJobs,
  getProposals,
  getSavedJobIds,
  toggleSavedJob,
} from "@/lib/api";
import type { Job } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function IshEloniPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [alreadySent, setAlreadySent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [buyerJobsCount, setBuyerJobsCount] = useState(0);

  useEffect(() => {
    getJob(params.id).then((found) => {
      setJob(found);
      if (found) {
        getJobs().then((all) =>
          setBuyerJobsCount(all.filter((j) => j.buyerId === found.buyerId).length)
        );
      }
    });
    getProposals().then((proposals) =>
      setAlreadySent(
        proposals.some(
          (p) => p.jobId === params.id && p.status !== "qaytarib_olingan"
        )
      )
    );
    getSavedJobIds().then((ids) => setSaved(ids.includes(params.id)));
  }, [params.id]);

  async function handleToggleSave() {
    const ids = await toggleSavedJob(params.id);
    setSaved(ids.includes(params.id));
  }

  if (job === undefined) return <SkeletonCard />;
  if (job === null) return <EmptyState title={t("job.notFound")} />;

  const canApply = job.status === "ochiq" && !alreadySent;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: t("nav.jobs"), href: "/mutaxassis/ish-elonlari" },
          { label: job.title },
        ]}
      />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{t(`cat.${job.category}`)}</Badge>
          <JobStatusBadge status={job.status} />
          <span className="text-2xs text-faint">
            {t("jobs.postedAt")}: {formatDate(job.postedAt, lang)}
          </span>
          <button
            type="button"
            onClick={handleToggleSave}
            aria-label={saved ? t("jobs.unsave") : t("jobs.save")}
            aria-pressed={saved}
            className={`ml-auto flex items-center gap-1.5 rounded-btn border border-line px-2.5 py-1.5 text-2xs font-medium transition-colors duration-150 ${
              saved ? "text-primary" : "text-muted hover:text-ink"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill={saved ? "currentColor" : "none"} aria-hidden="true">
              <path d="M5.5 3h9a.5.5 0 0 1 .5.5V17l-5-3.5L5 17V3.5a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            {saved ? t("jobs.tabSaved") : t("jobs.save")}
          </button>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {job.title}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card padding="lg">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
              {job.description}
            </p>

            <div className="mt-6 border-t border-line pt-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-faint">
                {t("job.skills")}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {job.skillsRequired.map((skill) => (
                  <Badge key={skill} tone="primary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {job.screeningQuestions.length > 0 && (
              <div className="mt-6 border-t border-line pt-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-faint">
                  {t("job.screening")}
                </h3>
                <ol className="mt-2 flex list-inside list-decimal flex-col gap-1.5 text-sm text-muted">
                  {job.screeningQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
              </div>
            )}
          </Card>
        </div>

        {/* Yon panel */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <div>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("job.budget")}
              </p>
              <p className="mt-1 font-heading text-lg font-bold text-ink">
                {formatMoney(job.budgetMin, lang)} –{" "}
                {formatMoney(job.budgetMax, lang)}
              </p>
            </div>
            <p className="text-xs text-muted">
              {job.proposalsCount} {t("jobs.proposalsCount")}
            </p>

            {canApply ? (
              <Link href={`/mutaxassis/ish-elonlari/${job.id}/taklif`}>
                <Button className="w-full">{t("job.sendProposal")}</Button>
              </Link>
            ) : (
              <p
                className={`rounded-input border p-3 text-xs ${
                  alreadySent
                    ? "border-success/30 bg-success/5 text-muted"
                    : "border-line bg-bg text-faint"
                }`}
              >
                {alreadySent ? t("job.alreadySent") : t("job.closedNote")}
              </p>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <h3 className="text-2xs font-medium uppercase tracking-wide text-faint">
              {t("job.aboutBuyer")}
            </h3>
            <div className="flex items-center gap-3">
              <Avatar name={job.buyerName} />
              <div>
                <p className="text-sm font-medium text-ink">{job.buyerName}</p>
                {job.buyerRating > 0 ? (
                  <RatingStars value={job.buyerRating} showValue />
                ) : (
                  <Badge>{t("jobs.newBuyer")}</Badge>
                )}
              </div>
            </div>
            <p className="text-2xs text-faint">
              {buyerJobsCount} {t("jobs.buyerJobs")}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
