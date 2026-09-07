"use client";

import { useCallback, useEffect, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { CardPicker } from "@/components/shared/cards";
import { WithdrawalRequests } from "@/components/shared/WithdrawalRequests";
import { ReceiptModal } from "@/components/shared/ReceiptModal";
import { ApiError, contractsService, milestonesService, paymentsService } from "@/lib/api";
import type { Contract, Milestone, PaymentCard, WithdrawalRequest } from "@/lib/types";
import { formatAmount, formatDate, formatMoney } from "@/lib/format";
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
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [receiptMilestone, setReceiptMilestone] = useState<Milestone | null>(null);
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

  const withdrawableBalance = Math.max(0, balance - pendingWithdrawal);

  function openWithdrawModal() {
    setWithdrawAmount(String(withdrawableBalance));
    setAmountError("");
    setWithdrawOpen(true);
  }

  function handleSelectPercent(pct: number) {
    const calculated = Math.floor(withdrawableBalance * (pct / 100));
    setWithdrawAmount(String(calculated));
    setAmountError("");
  }

  async function handleWithdraw() {
    if (!cardId) return;
    const num = Number(withdrawAmount.replace(/\s/g, ""));
    if (isNaN(num) || num <= 0) {
      setAmountError(t("wd.amountLabel"));
      return;
    }
    if (num > withdrawableBalance) {
      setAmountError(t("wd.errExceeds"));
      return;
    }
    if (minPayout > 0 && num < minPayout) {
      setAmountError(t("wd.errBelowMin").replace("{min}", formatAmount(minPayout)));
      return;
    }

    setWithdrawing(true);
    try {
      await paymentsService.withdrawBalance(cardId, num);
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
      <div className="flex items-center justify-between">
        <BackButton href="/xaridor" label={t("nav.dashboard")} />
      </div>
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
                onClick={openWithdrawModal}
                disabled={withdrawableBalance < Math.max(1, minPayout)}
              >
                {t("spend.withdraw")}
              </Button>
              {pendingWithdrawal > 0 && (
                <span className="text-2xs text-warning-deep">
                  {t("wd.pending")}: {formatMoney(pendingWithdrawal, lang)}
                </span>
              )}
              {minPayout > 0 && withdrawableBalance > 0 &&
                withdrawableBalance < minPayout && (
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
              {
                key: "receipt",
                header: "",
                render: (m) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReceiptMilestone(m)}
                    className="gap-1 text-2xs text-muted hover:text-ink px-2 py-1"
                    title={t("receipt.download")}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    {t("receipt.download")}
                  </Button>
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
                <div className="flex items-center justify-between pt-1">
                  <p className="truncate text-2xs text-muted">
                    {contractById.get(m.contractId)?.sellerName} · {m.title}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReceiptMilestone(m)}
                    className="text-2xs text-primary hover:underline p-0 h-auto"
                  >
                    {t("receipt.download")}
                  </Button>
                </div>
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
              {formatMoney(withdrawableBalance, lang)}
            </span>
          </div>

          {/* Summa kiritish va foiz tugmalari */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted">{t("wd.amountLabel")}</label>
            <div className="relative">
              <Input
                value={withdrawAmount}
                onChange={(e) => {
                  setWithdrawAmount(e.target.value.replace(/[^\d]/g, ""));
                  setAmountError("");
                }}
                placeholder={t("wd.amountPh")}
                error={amountError}
                inputMode="numeric"
                className="font-mono text-base font-bold pr-14"
              />
              <span className="absolute right-3 top-2.5 text-xs font-semibold text-muted">
                so&apos;m
              </span>
            </div>

            {/* Foiz tugmalari: 25%, 50%, 75%, 100% */}
            <div className="flex items-center gap-2 pt-1">
              {[25, 50, 75].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleSelectPercent(pct)}
                  className="rounded-btn border border-line bg-surface hover:bg-card-hover px-2.5 py-1 text-xs font-medium text-ink transition"
                >
                  {pct}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleSelectPercent(100)}
                className="rounded-btn border border-line bg-surface hover:bg-card-hover px-2.5 py-1 text-xs font-medium text-primary transition"
              >
                {t("wd.all")}
              </button>
            </div>

            {/* Qoladigan balans ko'rsatkichi */}
            <div className="mt-1 flex items-center justify-between rounded-input border border-line/60 bg-surface/50 p-2 text-2xs">
              <span className="text-muted">{t("wd.remainingBalance")}:</span>
              <span className="font-mono font-semibold text-ink">
                {formatMoney(
                  Math.max(0, withdrawableBalance - (Number(withdrawAmount.replace(/\s/g, "")) || 0)),
                  lang
                )}
              </span>
            </div>
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

      {/* Rasmiy to'lov kvitansiyasi modali */}
      <ReceiptModal
        open={!!receiptMilestone}
        onClose={() => setReceiptMilestone(null)}
        milestone={receiptMilestone}
        contractTitle={receiptMilestone ? contractById.get(receiptMilestone.contractId)?.title : undefined}
        contractId={receiptMilestone?.contractId}
        buyerName={receiptMilestone ? contractById.get(receiptMilestone.contractId)?.buyerName : undefined}
        sellerName={receiptMilestone ? contractById.get(receiptMilestone.contractId)?.sellerName : undefined}
      />
    </div>
  );
}
