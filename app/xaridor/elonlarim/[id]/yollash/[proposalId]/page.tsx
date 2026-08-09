"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { RatingStars } from "@/components/ui/RatingStars";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { useToast } from "@/components/ui/Toast";
import { catalogService, jobsService, proposalsService } from "@/lib/api";
import type { Job, Proposal, Specialist } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

interface MilestoneRow {
  title: string;
  amount: string;
  dueDate: string;
}

function defaultDue(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export default function YollashPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string; proposalId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [proposal, setProposal] = useState<Proposal | null | undefined>(undefined);
  const [spec, setSpec] = useState<Specialist | null>(null);
  const [rows, setRows] = useState<MilestoneRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hiring, setHiring] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      jobsService.listMine(),
      proposalsService.get(params.proposalId),
    ])
      .then(async ([jobs, found]) => {
        setJob(jobs.find((j) => j.id === params.id) ?? null);
        setProposal(found);
        if (found) {
          setSpec(await catalogService.getSpecialist(found.sellerId));
          /* Boshlang'ich: butun taklif bitta bosqich sifatida */
          setRows([
            {
              title: "",
              amount: String(found.bidAmount),
              dueDate: defaultDue(14),
            },
          ]);
        }
      })
      .catch(setLoadError);
  }, [params.id, params.proposalId]);

  useEffect(load, [load]);

  function setRow(i: number, patch: Partial<MilestoneRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setErrors({});
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { title: "", amount: "", dueDate: defaultDue(14 + prev.length * 7) },
    ]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  function validate(): boolean {
    const today = defaultDue(0);
    const next: Record<string, string> = {};
    rows.forEach((r, i) => {
      if (!r.title.trim()) next[`title${i}`] = t("hire.errTitle");
      if (!r.amount || Number(r.amount) <= 0)
        next[`amount${i}`] = t("wizard.errPrice");
      if (!r.dueDate) next[`due${i}`] = t("hire.errDue");
      else if (r.dueDate < today) next[`due${i}`] = t("hire.errDuePast");
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleHire() {
    if (!proposal || !validate()) return;
    setHiring(true);
    try {
      const contract = await proposalsService.hire(
        proposal.id,
        rows.map((r) => ({
          title: r.title.trim(),
          description: "",
          amount: Number(r.amount),
          dueDate: new Date(r.dueDate).toISOString(),
        }))
      );
      toast(t("hire.done"));
      router.push(`/xaridor/shartnomalar/${contract.id}`);
    } catch {
      toast(t("common.error"), "error");
      setHiring(false);
    }
  }

  if (job === undefined || proposal === undefined) {
    return loadError ? (
      <ErrorState error={loadError} onRetry={load} />
    ) : (
      <SkeletonCard />
    );
  }
  if (job === null || proposal === null || job.status !== "ochiq") {
    return <EmptyState title={t("common.notFound")} />;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-xs text-muted">{job.title}</p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold text-ink">
          {t("hire.title")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("hire.subtitle")}</p>
      </div>

      {/* Mutaxassis */}
      {spec && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={spec.user.fullName} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink">
                  {spec.user.fullName}
                </span>
                <TrustBadge badge={spec.profile.badge} />
              </div>
              <RatingStars value={spec.profile.rating} showValue />
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xs font-medium uppercase tracking-wide text-faint">
              {t("hire.bidRef")}
            </p>
            <p className="mt-0.5 font-heading text-base font-bold text-ink">
              {formatMoney(proposal.bidAmount, lang)}
            </p>
          </div>
        </Card>
      )}

      {/* Bosqichlar */}
      <Card padding="lg" className="flex flex-col gap-4">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("hire.milestones")}
        </h2>

        {rows.map((row, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-2xs font-bold text-primary-deep">
                {i + 1}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label={t("common.delete")}
                  className="text-faint transition-colors duration-150 hover:text-danger"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
            <Input
              label={t("hire.msTitle")}
              value={row.title}
              onChange={(e) => setRow(i, { title: e.target.value })}
              placeholder={t("hire.defaultMilestone")}
              error={errors[`title${i}`]}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="number"
                min={0}
                label={t("hire.msAmount")}
                value={row.amount}
                onChange={(e) => setRow(i, { amount: e.target.value })}
                error={errors[`amount${i}`]}
              />
              <Input
                type="date"
                min={defaultDue(0)}
                label={t("hire.msDue")}
                value={row.dueDate}
                onChange={(e) => setRow(i, { dueDate: e.target.value })}
                error={errors[`due${i}`]}
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={addRow}
        >
          + {t("hire.addMilestone")}
        </Button>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm text-muted">{t("hire.total")}</span>
          <span className="font-heading text-lg font-bold text-ink">
            {formatMoney(total, lang)}
          </span>
        </div>

        <p className="rounded-input border border-accent/25 bg-accent/5 p-3 text-2xs text-muted">
          {t("hire.fundNote")}
        </p>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={hiring}
        >
          {t("common.cancel")}
        </Button>
        <Button onClick={handleHire} loading={hiring}>
          {t("hire.confirm")}
        </Button>
      </div>
    </div>
  );
}
