"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { JobStatusBadge } from "@/components/shared/StatusBadge";
import { jobsService, proposalsService } from "@/lib/api";
import type { Job, JobStatus, Proposal } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

type Filter = "all" | JobStatus;

export default function ElonlarimPage() {
  const { t, lang } = useT();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [filter, setFilter] = useState<Filter>("all");
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    jobsService
      .listMine()
      .then(async (list) => {
        setJobs(list);
        /* Har bir e'lon uchun haqiqiy kelgan takliflar soni */
        const results = await Promise.all(
          list.map((j) => proposalsService.listForJob(j.id))
        );
        const map = new Map<string, number>();
        list.forEach((job, i) => {
          map.set(
            job.id,
            results[i].filter((p: Proposal) => p.status !== "qaytarib_olingan")
              .length
          );
        });
        setCounts(map);
      })
      /* Yuklash xatosi bo'sh ro'yxat EMAS — alohida holat ko'rsatiladi */
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  const filtered =
    jobs?.filter((j) => filter === "all" || j.status === filter) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("bjobs.title")}
        </h1>
        <Link href="/xaridor/elonlarim/yangi">
          <Button>{t("bjobs.post")}</Button>
        </Link>
      </div>

      <Tabs
        value={filter}
        onChange={(value) => setFilter(value as Filter)}
        items={[
          { value: "all", label: t("jobs.tabAll"), count: jobs?.length },
          {
            value: "ochiq",
            label: t("jobs.open"),
            count: jobs?.filter((j) => j.status === "ochiq").length,
          },
          {
            value: "yopilgan",
            label: t("jobs.closed"),
            count: jobs?.filter((j) => j.status === "yopilgan").length,
          },
        ]}
      />

      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : !jobs ? (
        <SkeletonCard />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={jobs.length === 0 ? t("bjobs.empty") : t("bjobs.emptyFiltered")}
          action={
            jobs.length === 0 ? (
              <Link href="/xaridor/elonlarim/yangi">
                <Button>{t("bjobs.emptyCta")}</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((job) => (
            <Link
              key={job.id}
              href={`/xaridor/elonlarim/${job.id}`}
              className="block"
            >
              <Card hoverable className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{t(`cat.${job.category}`)}</Badge>
                  <JobStatusBadge status={job.status} />
                  <span className="ml-auto text-2xs text-faint">
                    {formatDate(job.postedAt, lang)}
                  </span>
                </div>
                <h3 className="font-heading text-sm font-bold text-ink">
                  {job.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs">
                  <span className="font-medium text-ink">
                    {formatMoney(job.budgetMin, lang)} –{" "}
                    {formatMoney(job.budgetMax, lang)}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5 text-muted">
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-bold ${
                        (counts.get(job.id) ?? 0) > 0
                          ? "bg-primary/10 text-primary-deep"
                          : "bg-card-hover text-faint"
                      }`}
                    >
                      {counts.get(job.id) ?? 0}
                    </span>
                    {t("jobs.proposalsCount")}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
