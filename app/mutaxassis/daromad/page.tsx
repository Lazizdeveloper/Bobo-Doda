"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { CardPicker } from "@/components/shared/cards";
import { contractsService, milestonesService, paymentsService } from "@/lib/api";
import type { PaymentCard } from "@/lib/types";
import type { Contract, Milestone } from "@/lib/types";
import { formatDate, formatMonth, formatMoney } from "@/lib/format";
import { PLATFORM_FEE_PERCENT, sellerNet } from "@/lib/fees";
import { useT } from "@/lib/i18n";

const PENDING_STATUSES = ["mablaglangan", "topshirildi", "ozgartirish_soraldi"];

export default function DaromadPage() {
  const { t, lang } = useT();
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [withdrawn, setWithdrawn] = useState(0);
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [cardId, setCardId] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      milestonesService.listMine(),
      contractsService.list(),
      paymentsService.getWithdrawnTotal(),
      paymentsService.getCards(),
    ])
      .then(([milestoneList, contractList, withdrawnTotal, cardList]) => {
        setMilestones(milestoneList);
        setContracts(contractList);
        setWithdrawn(withdrawnTotal);
        setCards(cardList);
        if (cardList[0]) setCardId(cardList[0].id);
      })
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  const contractById = new Map(contracts.map((c) => [c.id, c]));

  const paid = (milestones ?? []).filter((m) => m.status === "qabul_qilindi");
  /* Brutto — shartnomada kelishilgan summa; sof — xizmat haqi ushlangandan
     keyingisi. Ikkalasi ham ko'rsatiladi: mutaxassis nima uchun qancha
     ushlanganini ko'rmasa, escrow'ga ishonch yo'qoladi. */
  const grossPaid = paid.reduce((sum, m) => sum + m.amount, 0);
  const totalPaid = paid.reduce((sum, m) => sum + sellerNet(m.amount), 0);
  const feeWithheld = grossPaid - totalPaid;
  /* Yechish mumkin bo'lgan qism — ishlangan (sof) minus allaqachon yechilgan */
  const withdrawable = Math.max(0, totalPaid - withdrawn);
  /* `nizo` ham hisobga olinadi: nizo ochilganda pul escrow'da turaveradi va
     mutaxassis uni "Kutilmoqda" da ko'rishi kerak — aks holda nizo paytida
     summa ekrandan yo'qolib qolardi. */
  const totalPending = (milestones ?? [])
    .filter((m) => {
      const status = contractById.get(m.contractId)?.status;
      return (
        PENDING_STATUSES.includes(m.status) &&
        (status === "faol" || status === "nizo")
      );
    })
    .reduce((sum, m) => sum + sellerNet(m.amount), 0);

  const payments = [...paid].sort((a, b) =>
    (b.approvedAt ?? "").localeCompare(a.approvedAt ?? "")
  );

  /* Oxirgi 6 oy bo'yicha daromad — approvedAt'ga qarab guruhlangan
     (bo'sh oylar ham ko'rsatiladi, tendensiya ko'rinishi uchun) */
  const monthlyTotals = new Map<string, number>();
  for (const m of paid) {
    if (!m.approvedAt) continue;
    const key = m.approvedAt.slice(0, 7);
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + sellerNet(m.amount));
  }
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { key, amount: monthlyTotals.get(key) ?? 0 };
  });
  const monthlyMax = Math.max(1, ...monthly.map((m) => m.amount));

  async function handleWithdraw() {
    if (!cardId) return;
    setWithdrawing(true);
    try {
      await paymentsService.withdrawEarnings(cardId);
      setWithdrawn(await paymentsService.getWithdrawnTotal());
      toast(t("earn.withdrawn"));
      setWithdrawOpen(false);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("earn.title")}
        </h1>
        <Button
          onClick={() => setWithdrawOpen(true)}
          disabled={!milestones || withdrawable === 0}
        >
          {t("earn.withdraw")}
        </Button>
      </div>

      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : (
        <>
      {/* Statistika */}
      <div className="grid gap-4 sm:grid-cols-3">
        {!milestones ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-6 w-32" />
            </Card>
          ))
        ) : (
          <>
            <Card>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("earn.paid")}
              </p>
              <p className="mt-2 font-heading text-xl font-bold text-success">
                {formatMoney(totalPaid, lang)}
              </p>
              {feeWithheld > 0 && (
                <p className="mt-1 text-2xs text-faint">
                  {formatMoney(grossPaid, lang)} − {PLATFORM_FEE_PERCENT}%{" "}
                  {t("earn.feeLabel")} ({formatMoney(feeWithheld, lang)})
                </p>
              )}
            </Card>
            <Card>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("earn.withdrawable")}
              </p>
              <p className="mt-2 font-heading text-xl font-bold text-ink">
                {formatMoney(withdrawable, lang)}
              </p>
              <p className="mt-1 text-2xs text-faint">{t("earn.withdrawableHint")}</p>
            </Card>
            <Card>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("earn.pending")}
              </p>
              <p className="mt-2 font-heading text-xl font-bold text-ink">
                {formatMoney(totalPending, lang)}
              </p>
              <p className="mt-1 text-2xs text-faint">{t("earn.pendingHint")}</p>
            </Card>
          </>
        )}
      </div>

      {/* So'nggi to'lovlar */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">
          {t("earn.recent")}
        </h2>
        {!milestones ? (
          <SkeletonCard />
        ) : payments.length === 0 ? (
          <EmptyState title={t("earn.empty")} />
        ) : (
          <Table
            rows={payments}
            rowKey={(m) => m.id}
            columns={[
              {
                key: "date",
                header: t("earn.colDate"),
                render: (m) => (
                  <span className="text-muted">
                    {m.approvedAt ? formatDate(m.approvedAt, lang) : "—"}
                  </span>
                ),
              },
              {
                key: "contract",
                header: t("earn.colContract"),
                render: (m) => (
                  <span className="block max-w-64 truncate">
                    {contractById.get(m.contractId)?.title ?? "—"}
                  </span>
                ),
              },
              {
                key: "milestone",
                header: t("earn.colMilestone"),
                render: (m) => (
                  <span className="block max-w-56 truncate text-muted">
                    {m.title}
                  </span>
                ),
              },
              {
                key: "amount",
                header: t("earn.colAmount"),
                render: (m) => (
                  <span className="flex flex-col">
                    <span className="font-medium text-success">
                      {formatMoney(sellerNet(m.amount), lang)}
                    </span>
                    <span className="text-2xs text-faint">
                      {formatMoney(m.amount, lang)} − {PLATFORM_FEE_PERCENT}%
                    </span>
                  </span>
                ),
              },
            ]}
            renderMobileCard={(m) => (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-success">
                    {formatMoney(sellerNet(m.amount), lang)}
                  </span>
                  <span className="text-2xs text-faint">
                    {m.approvedAt ? formatDate(m.approvedAt, lang) : "—"}
                  </span>
                </div>
                <p className="truncate text-xs text-ink">
                  {contractById.get(m.contractId)?.title ?? "—"}
                </p>
                <p className="truncate text-2xs text-muted">{m.title}</p>
              </div>
            )}
          />
        )}
      </section>

      {/* Oylik daromad tendensiyasi */}
      {milestones && paid.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-bold text-ink">
            {t("earn.monthlyBreakdown")}
          </h2>
          <Card>
            <div className="flex items-end justify-between gap-2 sm:gap-4">
              {monthly.map((m) => (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-2xs font-medium text-ink">
                    {m.amount > 0 ? formatMoney(m.amount, lang) : "—"}
                  </span>
                  <div className="flex h-24 w-full items-end rounded-input bg-bg">
                    <div
                      className="w-full rounded-input bg-primary transition-[height] duration-300"
                      style={{
                        height: `${Math.max(4, (m.amount / monthlyMax) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-2xs text-faint">
                    {formatMonth(m.key, lang)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}
        </>
      )}

      {/* Pul yechish modali (mock) */}
      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title={t("earn.methodTitle")}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setWithdrawOpen(false)}
              disabled={withdrawing}
            >
              {t("common.cancel")}
            </Button>
            <Button
              loading={withdrawing}
              onClick={handleWithdraw}
              disabled={!cardId}
            >
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-input border border-line bg-surface p-3">
            <span className="text-xs text-muted">{t("earn.withdrawable")}</span>
            <span className="font-heading text-base font-bold text-success">
              {formatMoney(withdrawable, lang)}
            </span>
          </div>
          <p className="text-xs text-muted">{t("earn.methodDesc")}</p>
          <div>
            <p className="mb-2 text-xs font-medium text-muted">
              {t("card.selectTitle")}
            </p>
            <CardPicker
              cards={cards}
              value={cardId}
              onChange={setCardId}
              onCardAdded={(card) => setCards((prev) => [card, ...prev])}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
