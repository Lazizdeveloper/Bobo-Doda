"use client";

import { Button } from "@/components/ui/Button";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { MilestoneStatusBadge } from "@/components/shared/StatusBadge";
import type { Contract, Milestone } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export interface MilestoneItemProps {
  milestone: Milestone;
  index: number;
  contractStatus: Contract["status"];
  onSubmit: (milestone: Milestone) => void;
}

export function MilestoneItem({
  milestone,
  index,
  contractStatus,
  onSubmit,
}: MilestoneItemProps) {
  const { t, lang } = useT();
  const actionable = contractStatus === "faol";
  const awaitingPayment = contractStatus === "imzolangan";
  const dimmed = milestone.status === "kutilmoqda";

  return (
    <div
      className={`flex flex-col gap-3 rounded-card border p-4 ${
        milestone.status === "ozgartirish_soraldi"
          ? "border-danger/30 bg-danger/5"
          : milestone.status === "qabul_qilindi"
            ? "border-success/25 bg-success/5"
            : "border-line bg-card"
      } ${dimmed ? "opacity-70" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold ${
              milestone.status === "qabul_qilindi"
                ? "bg-success/20 text-success"
                : dimmed
                  ? "bg-card-hover text-faint"
                  : "bg-primary/15 text-primary"
            }`}
          >
            {index + 1}
          </span>
          <div>
            <h4 className="text-sm font-semibold text-ink">{milestone.title}</h4>
            <p className="mt-0.5 text-xs text-muted">{milestone.description}</p>
          </div>
        </div>
        <MilestoneStatusBadge status={milestone.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-9 text-xs text-muted">
        <span className="font-medium text-ink">
          {formatMoney(milestone.amount, lang)}
        </span>
        <span>
          {t("ms.due")}: {formatDate(milestone.dueDate, lang)}
        </span>
        {milestone.status === "qabul_qilindi" && milestone.approvedAt && (
          <span className="text-success">
            {t("ms.paid")} · {formatDate(milestone.approvedAt, lang)}
          </span>
        )}
      </div>

      {/* Holatga mos qo'shimcha qator */}
      {milestone.status === "kutilmoqda" && (
        <p className="pl-9 text-2xs text-faint">
          {awaitingPayment ? t("cfund.awaitingSeller") : t("ms.notFundedNote")}
        </p>
      )}

      {milestone.status === "mablaglangan" && (
        <div className="flex flex-wrap items-center gap-3 pl-9">
          <p className="text-2xs text-muted">{t("ms.fundedNote")}</p>
          {actionable && (
            <Button size="sm" onClick={() => onSubmit(milestone)}>
              {t("ms.submitAction")}
            </Button>
          )}
        </div>
      )}

      {milestone.status === "topshirildi" && (
        <div className="flex flex-col gap-2 pl-9">
          <div className="flex flex-wrap items-center gap-3">
            {milestone.reviewDeadline && (
              <CountdownBadge deadline={milestone.reviewDeadline} />
            )}
            <span className="text-2xs text-muted">{t("ms.waitingReview")}</span>
          </div>
          <p className="text-2xs text-faint">{t("ms.autoAcceptNote")}</p>
        </div>
      )}

      {milestone.status === "ozgartirish_soraldi" && (
        <div className="flex flex-col gap-3 pl-9">
          {milestone.revisionComment && (
            <div className="rounded-input border border-danger/25 bg-bg p-3">
              <p className="text-2xs font-medium uppercase tracking-wide text-danger">
                {t("ms.revisionNote")}
              </p>
              <p className="mt-1 text-xs text-muted">{milestone.revisionComment}</p>
            </div>
          )}
          {actionable && (
            <Button size="sm" onClick={() => onSubmit(milestone)} className="self-start">
              {t("ms.resubmitAction")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
