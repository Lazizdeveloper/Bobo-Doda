"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { RatingStars } from "@/components/ui/RatingStars";
import { JobStatusBadge } from "@/components/shared/StatusBadge";
import type { Job } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export interface JobCardProps {
  job: Job;
  saved?: boolean;
  onToggleSave?: (jobId: string) => void;
}

export function JobCard({ job, saved = false, onToggleSave }: JobCardProps) {
  const { t, lang } = useT();

  return (
    <Link href={`/mutaxassis/ish-elonlari/${job.id}`} className="block">
      <Card hoverable className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{t(`cat.${job.category}`)}</Badge>
          {job.status === "yopilgan" && <JobStatusBadge status={job.status} />}
          <span className="ml-auto text-2xs text-faint">
            {formatDate(job.postedAt, lang)}
          </span>
          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave(job.id);
              }}
              aria-label={saved ? t("jobs.unsave") : t("jobs.save")}
              aria-pressed={saved}
              className={`rounded p-1 transition-colors duration-150 ${
                saved ? "text-primary" : "text-faint hover:text-ink"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill={saved ? "currentColor" : "none"}
                aria-hidden="true"
              >
                <path
                  d="M5.5 3h9a.5.5 0 0 1 .5.5V17l-5-3.5L5 17V3.5a.5.5 0 0 1 .5-.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        <div>
          <h3 className="font-heading text-sm font-bold text-ink">{job.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted">{job.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.skillsRequired.slice(0, 4).map((skill) => (
            <Badge key={skill}>{skill}</Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs">
          <span className="font-medium text-ink">
            {formatMoney(job.budgetMin, lang)} – {formatMoney(job.budgetMax, lang)}
          </span>
          <span className="text-muted">
            {job.proposalsCount} {t("jobs.proposalsCount")}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-muted">
            {job.buyerName}
            {job.buyerRating > 0 ? (
              <RatingStars value={job.buyerRating} showValue />
            ) : (
              <Badge>{t("jobs.newBuyer")}</Badge>
            )}
          </span>
        </div>
      </Card>
    </Link>
  );
}
