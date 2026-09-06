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
import { WithdrawalRequests } from "@/components/shared/WithdrawalRequests";
import { ApiError, contractsService, milestonesService, paymentsService } from "@/lib/api";
import type { Contract, Milestone, PaymentCard, WithdrawalRequest } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { getPlatformSettings } from "@/lib/platform-settings";
import { useT } from "@/lib/i18n";

const ESCROW_STATUSES = ["mablaglangan", "topshirildi", "ozgartirish_soraldi"];

export default function XarajatlarPage() {
  const { t, lang } = useT();
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [balance, setBalance] = useState(0);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);
  /* Eng kam yechish summasi admin sozlamasidan */
  const [minPayout, setMinPayout] = useState(0);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
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
      paymentsService.getBalance(),
      paymentsService.getCards(),
      paymentsService.getPendingWithdrawalTotal(),
      paymentsService.listMyWithdrawalRequests(),
    ])
      .then(([milestoneList, contractList, balanceValue, cardList, pending, requestList]) => {
        setPendingWithdrawal(pending);
        setMinPayout(getPlatformSettings().minPayoutAmount);
        setRequests(requestList);
        setMilestones(milestoneList);
        setContracts(contractList);
        setBalance(balanceValue);
        setCards(cardList);
        if (cardList[0]) setCardId(cardList[0].id);
      })
      /* Yuklash xatosi bo'sh ro'yxat EMAS — alohida holat ko'rsatiladi */
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  async function handleWithdraw() {
    if (!cardId) return;
    setWithdrawing(true);
    try {
      await paymentsService.withdrawBalance(cardId);
      /* Pul darhol yechilmaydi — admin tasdig'iga so'rov ketadi. Balans
         joyida qoladi, lekin so'ralgan summa "band" bo'ladi. */
      setPendingWithdrawal(await paymentsService.getPendingWithdrawalTotal());
      setRequests(await paymentsService.listMyWithdrawalRequests());
      toast(t("wd.requested"));
      setWithdrawOpen(false);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      toast(
        code === "BELOW_MINIMUM" ? t("wd.belowMin") : t("common.error"),
        "error"
      );
    } finally {
      setWithdrawing(false);
    }
  }

  const contractById = new Map(contracts.map((c) => [c.id, c]));

  const paid = (milestones ?? []).filter((m) => m.status === "qabul_qilindi");
  const totalPaid = paid.reduce((sum, m) => sum + m.amount, 0);
  /* `nizo` ham hisobga olinadi: nizo ochilganda pul escrow'da turaveradi.
     Faqat "faol" bilan filtrlansa, aynan pul haqida xavotir eng yuqori paytda
     summa ekrandan yo'qolib qolardi. */
  const totalEscrow = (milestones ?? [])
    .filter((m) => {
      const status = contractById.get(m.contractId)?.status;
      return (
        ESCROW_STATUSES.includes(m.status) &&
        (status === "faol" || status === "nizo")
      );
    })
    .reduce((sum, m) => sum + m.amount, 0);

  const payments = [...paid].sort((a, b) =>
    (b.approvedAt ?? "").localeCompare(a.approvedAt ?? "")
  );

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-extrabold text-ink">
        {t("spend.title")}
      </h1>

      {/* Statistika */}
      <div className="grid gap-4 sm:grid-cols-2">
        {!milestones ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-6 w-32" />
            </Card>
          ))
        ) : (
          <>
            <Card>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("spend.total")}
              </p>
              <p className="mt-2 font-heading text-xl font-bold text-ink">
                {formatMoney(totalPaid, lang)}
              </p>
            </Card>
            <Card>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("spend.inEscrow")}
              </p>
              <p className="mt-2 font-heading text-xl font-bold text-accent">
                {formatMoney(totalEscrow, lang)}
              </p>
              <p className="mt-1 text-2xs text-faint">{t("spend.escrowHint")}</p>
            </Card>
          </>
        )}
      </div>

      {/* Bobo&Doda hisobi — qaytarilgan mablag' (balans bo'lsa ko'rinadi) */}
      {balance > 0 && (
        <Card padding="lg" className="border-success/25 bg-success/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("spend.balance")}
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-success">
                {formatMoney(balance, lang)}
              </p>
              <p className="mt-1 text-2xs text-muted">{t("spend.balanceHint")}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={() => setWithdrawOpen(true)}
                disabled={balance - pendingWithdrawal < Math.max(1, minPayout)}
              >
                {t("spend.withdraw")}
              </Button>
              {pendingWithdrawal > 0 && (
                <span className="text-2xs text-warning-deep">
                  {t("wd.pending")}: {formatMoney(pendingWithdrawal, lang)}
                </span>
              )}
              {minPayout > 0 && balance - pendingWithdrawal > 0 &&
                balance - pendingWithdrawal < minPayout && (
                  <span className="text-2xs text-warning-deep">
                    {t("wd.minPayout")}: {formatMoney(minPayout, lang)}
                  </span>
                )}
            </div>
          </div>
        </Card>
      )}

      {/* Yechish so'rovlari — admin tasdig'i kutilayotganlar ham shu yerda */}
      {(requests.length > 0 || balance > 0) && (
        <WithdrawalRequests requests={requests} />
      )}

      {/* So'nggi to'lovlar */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">
          {t("spend.recent")}
        </h2>
        {!milestones ? (
          <SkeletonCard />
        ) : payments.length === 0 ? (
          <EmptyState title={t("spend.empty")} />
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
                key: "seller",
                header: t("contracts.colSeller"),
                render: (m) => (
                  <span className="font-medium">
                    {contractById.get(m.contractId)?.sellerName ?? "—"}
                  </span>
                ),
              },
              {
                key: "contract",
                header: t("earn.colContract"),
                render: (m) => (
                  <span className="block max-w-56 truncate text-muted">
                    {contractById.get(m.contractId)?.title ?? "—"}
                  </span>
                ),
              },
              {
                key: "milestone",
                header: t("earn.colMilestone"),
                render: (m) => (
                  <span className="block max-w-48 truncate text-muted">
                    {m.title}
                  </span>
                ),
              },
              {
                key: "amount",
                header: t("earn.colAmount"),
                render: (m) => (
                  <span className="font-medium text-ink">
                    {formatMoney(m.amount, lang)}
                  </span>
                ),
              },
            ]}
            renderMobileCard={(m) => (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink">
                    {formatMoney(m.amount, lang)}
                  </span>
                  <span className="text-2xs text-faint">
                    {m.approvedAt ? formatDate(m.approvedAt, lang) : "—"}
                  </span>
                </div>
                <p className="truncate text-xs text-ink">
                  {contractById.get(m.contractId)?.title ?? "—"}
                </p>
                <p className="truncate text-2xs text-muted">
                  {contractById.get(m.contractId)?.sellerName} · {m.title}
                </p>
              </div>
            )}
          />
        )}
      </section>

      {/* Kartaga yechish modali (mock) */}
      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title={t("spend.withdrawTitle")}
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
              {t("spend.withdraw")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-input border border-line bg-surface p-3">
            <span className="text-xs text-muted">{t("spend.balance")}</span>
            <span className="font-heading text-base font-bold text-success">
              {formatMoney(Math.max(0, balance - pendingWithdrawal), lang)}
            </span>
          </div>
          <p className="text-xs text-muted">{t("spend.withdrawDesc")}</p>
          <p className="text-2xs text-faint">{t("wd.pendingHint")}</p>
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
