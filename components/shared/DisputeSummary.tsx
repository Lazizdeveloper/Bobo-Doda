"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { disputesService } from "@/lib/api";
import type { Dispute } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

export function DisputeSummary({ contractId }: { contractId: string }) {
  const { t, lang } = useT();
  const [dispute, setDispute] = useState<Dispute | null | undefined>();
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    disputesService
      .getForContract(contractId)
      .then(setDispute)
      /* Yuklash xatosi "nizo yo'q" EMAS — alohida holat ko'rsatiladi */
      .catch(setLoadError);
  }, [contractId]);

  useEffect(load, [load]);

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;
  if (dispute === undefined) return <Skeleton className="h-28 w-full" />;
  if (!dispute) {
    return (
      <p className="rounded-card border border-danger/25 bg-danger/5 p-4 text-xs text-muted">
        {t("contract.disputeNote")}
      </p>
    );
  }

  return (
    <Card className="border-danger/30 bg-danger/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{t("dispute.caseTitle")}</p>
          <p className="mt-1 text-2xs text-faint">
            #{dispute.id.slice(-8)} · {formatDate(dispute.createdAt, lang)}
          </p>
        </div>
        <Badge tone="danger">{t(`dispute.status_${dispute.status}`)}</Badge>
      </div>
      <p className="mt-3 text-xs font-medium text-warning">
        {t(`dispute.reason_${dispute.reason}`)}
      </p>
      <p className="mt-1 whitespace-pre-line text-sm text-muted">
        {dispute.description}
      </p>
      {dispute.evidence.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {dispute.evidence.map((image, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={image}
              alt={`${t("dispute.evidence")} ${index + 1}`}
              className="h-16 w-16 rounded-input border border-line object-cover"
            />
          ))}
        </div>
      )}
    </Card>
  );
}
