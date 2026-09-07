"use client";

import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { WithdrawalRequest, WithdrawalStatus } from "@/lib/types";

const STATUS: Record<WithdrawalStatus, { key: string; tone: BadgeTone }> = {
  kutilmoqda: { key: "wd.statusPending", tone: "warning" },
  korib_chiqilmoqda: { key: "wd.statusReview", tone: "info" },
  tasdiqlangan: { key: "wd.statusApproved", tone: "success" },
  rad_etilgan: { key: "wd.statusRejected", tone: "danger" },
};

/**
 * Yuborilgan yechish so'rovlari — ikkala rol uchun bir xil.
 *
 * Bu ro'yxatsiz oqim yarim qolardi: foydalanuvchi so'rov yuborardi, pul esa
 * darhol kelmasdi (admin tasdig'i kerak) va u nima bo'layotganini KO'RA
 * olmasdi — "pulim qayerda?" degan eng yomon holat.
 */
export function WithdrawalRequests({ requests }: { requests: WithdrawalRequest[] }) {
  const { t, lang } = useT();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-bold text-ink">{t("wd.requests")}</h2>
      {requests.length === 0 ? (
        <Card>
          <p className="text-xs text-muted">{t("wd.emptyRequests")}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((r) => {
            const status = STATUS[r.status];
            return (
              <li key={r.id}>
                <Card padding="md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-base font-bold text-ink">
                      {formatMoney(r.amount, lang)}
                    </p>
                    <p className="mt-0.5 text-2xs text-faint flex flex-wrap items-center gap-1.5">
                      {r.payoutMethod === "bank_account" && r.bankAccount ? (
                        <span className="font-mono text-ink font-medium">
                          🏦 H/r: {r.bankAccount.accountNumber} ({r.bankAccount.bankName})
                        </span>
                      ) : (
                        <span className="font-mono">{r.cardDetails || "Plastik karta"}</span>
                      )}
                      <span>·</span>
                      <span>{formatDate(r.createdAt, lang)}</span>
                    </p>
                  </div>
                  <Badge tone={status.tone}>{t(status.key)}</Badge>
                </div>
                {r.status === "rad_etilgan" && r.rejectionReason && (
                  <p className="mt-2 rounded-input bg-danger/10 p-2 text-2xs text-danger-deep">
                    {r.rejectionReason}
                  </p>
                )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
