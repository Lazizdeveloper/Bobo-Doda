"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { disputesService } from "@/lib/api";
import type { Dispute } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

export function DisputeSummary({
  contractId,
  onWithdrawn,
}: {
  contractId: string;
  /** Nizo qaytarib olingach shartnomani qayta yuklash uchun */
  onWithdrawn?: () => void;
}) {
  const { t, lang } = useT();
  const { toast } = useToast();
  const [dispute, setDispute] = useState<Dispute | null | undefined>();
  const [loadError, setLoadError] = useState<unknown>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    disputesService
      .getForContract(contractId)
      .then(setDispute)
      /* Yuklash xatosi "nizo yo'q" EMAS — alohida holat ko'rsatiladi */
      .catch(setLoadError);
  }, [contractId]);

  useEffect(load, [load]);

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      await disputesService.withdraw(contractId);
      toast(t("dispute.withdrawn"));
      setWithdrawOpen(false);
      onWithdrawn?.();
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      toast(
        code === "FORBIDDEN"
          ? t("dispute.withdrawOnlyOpener")
          : t("common.error"),
        "error"
      );
    } finally {
      setWithdrawing(false);
    }
  }

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;
  if (dispute === undefined) return <Skeleton className="h-28 w-full" />;
  if (!dispute) {
    return (
      <p className="rounded-card border border-danger/25 bg-danger/5 p-4 text-xs text-muted">
        {t("contract.disputeNote")}
      </p>
    );
  }

  /* Real backend ishtirokchi javobida "kim ochdi"ni qaytarmaydi — tugma
     har doim ko'rsatiladi, huquqi bo'lmasa server FORBIDDEN qaytaradi
     (pastda maxsus xabar bilan ushlangan). */
  const isOpener = true;

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

      {/* Keyingi qadam va chiqish yo'li — ilgari nizo ochilgach shartnoma
          hech qanday izohsiz abadiy muzlab qolardi. */}
      <p className="mt-4 border-t border-danger/20 pt-3 text-xs text-muted">
        {t("dispute.nextSteps")}
      </p>
      {isOpener && dispute.status === "ochiq" && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWithdrawOpen(true)}
          >
            {t("dispute.withdraw")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={withdrawOpen}
        title={t("dispute.withdrawTitle")}
        description={t("dispute.withdrawDesc")}
        confirmLabel={t("dispute.withdraw")}
        cancelLabel={t("common.cancel")}
        loading={withdrawing}
        onConfirm={handleWithdraw}
        onCancel={() => setWithdrawOpen(false)}
      />
    </Card>
  );
}
