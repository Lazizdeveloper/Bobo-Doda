"use client";

import { useCallback, useEffect, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { CardPicker } from "@/components/shared/cards";
import { WithdrawalRequests } from "@/components/shared/WithdrawalRequests";
import { ReceiptModal } from "@/components/shared/ReceiptModal";
import { ApiError, contractsService, milestonesService, paymentsService } from "@/lib/api";
import type { Contract, Milestone, PaymentCard, WithdrawalRequest } from "@/lib/types";
import { formatAmount, formatDate, formatMonth, formatMoney } from "@/lib/format";
import { PLATFORM_FEE_PERCENT, sellerNet } from "@/lib/fees";
import { getPlatformSettings } from "@/lib/platform-settings";
import { useT } from "@/lib/i18n";

const PENDING_STATUSES = ["mablaglangan", "topshirildi", "ozgartirish_soraldi"];

export default function DaromadPage() {
  const { t, lang } = useT();
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [withdrawn, setWithdrawn] = useState(0);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);
  /* Eng kam yechish summasi admin sozlamasidan. Tugma undan pastda o'chiq
     bo'ladi — aks holda foydalanuvchi bosib, faqat xato toast'ini olardi. */
  const [minPayout, setMinPayout] = useState(0);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [cardId, setCardId] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"card" | "bank_account">("card");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankMfo, setBankMfo] = useState("");
  const [bankInnPinfl, setBankInnPinfl] = useState("");
  const [bankRecipient, setBankRecipient] = useState("");
  const [bankError, setBankError] = useState("");
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
      paymentsService.getWithdrawnTotal(),
      paymentsService.getCards(),
      paymentsService.getPendingWithdrawalTotal(),
      paymentsService.listMyWithdrawalRequests(),
    ])
      .then(([milestoneList, contractList, withdrawnTotal, cardList, pending, requestList]) => {
        setPendingWithdrawal(pending);
        setMinPayout(getPlatformSettings().minPayoutAmount);
        setRequests(requestList);
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
  /* Yechish mumkin bo'lgan qism — ishlangan (sof) minus allaqachon yechilgan
     minus admin tasdig'ini kutayotgan (band) summa. */
  const withdrawable = Math.max(0, totalPaid - withdrawn - pendingWithdrawal);
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

  function openWithdrawModal() {
    setWithdrawAmount(String(withdrawable));
    setAmountError("");
    setBankError("");
    setWithdrawOpen(true);
  }

  function handleSelectPercent(pct: number) {
    const calculated = Math.floor(withdrawable * (pct / 100));
    setWithdrawAmount(String(calculated));
    setAmountError("");
  }

  async function handleWithdraw() {
    const num = Number(withdrawAmount.replace(/\s/g, ""));
    if (isNaN(num) || num <= 0) {
      setAmountError(t("wd.amountLabel"));
      return;
    }
    if (num > withdrawable) {
      setAmountError(t("wd.errExceeds"));
      return;
    }
    if (minPayout > 0 && num < minPayout) {
      setAmountError(t("wd.errBelowMin").replace("{min}", formatAmount(minPayout)));
      return;
    }

    if (payoutMethod === "card") {
      if (!cardId) {
        setAmountError(t("pay.pickCard"));
        return;
      }
    } else {
      const cleanAcc = bankAccountNumber.replace(/\s/g, "");
      if (!cleanAcc || cleanAcc.length < 20) {
        setBankError("20 xonali to'liq bank hisob-raqamini kiriting (masalan: 20208000...)");
        return;
      }
      if (!bankMfo.trim() || bankMfo.length !== 5) {
        setBankError("5 xonali bank MFO kodini kiriting (masalan: 01088)");
        return;
      }
      if (!bankRecipient.trim()) {
        setBankError("Qabul qiluvchi shaxs/korxona nomini kiriting");
        return;
      }
      setBankError("");
    }

    setWithdrawing(true);
    try {
      if (payoutMethod === "card") {
        await paymentsService.withdrawEarnings({ type: "card", cardId }, num);
      } else {
        await paymentsService.withdrawEarnings(
          {
            type: "bank_account",
            bankAccount: {
              accountNumber: bankAccountNumber.replace(/\s/g, ""),
              bankName: bankName.trim() || "ATB Kapitalbank",
              mfo: bankMfo.trim(),
              innOrPinfl: bankInnPinfl.trim(),
              recipientName: bankRecipient.trim(),
            },
          },
          num
        );
      }
      /* Admin tasdig'iga so'rov — pul darhol yechilmaydi */
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <BackButton href="/mutaxassis" label={t("nav.dashboard")} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("earn.title")}
        </h1>
        <Button
          onClick={openWithdrawModal}
          disabled={!milestones || withdrawable < Math.max(1, minPayout)}
        >
          {t("earn.withdraw")}
        </Button>
      </div>

      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : (
        <>
      {/* Platformada To'lov & Escrow mexanizmi tushuntirishi */}
      <Card padding="md" className="border-accent/25 bg-accent/5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-ink font-heading font-bold text-sm">
            <span className="text-lg">🛡️</span>
            <span>Bobo & Doda Kafolatlangan To&apos;lov (Escrow) qanday ishlaydi?</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted mt-1">
            <div className="rounded-input border border-line/60 bg-card p-3">
              <p className="font-semibold text-ink mb-1 flex items-center gap-1.5">
                <span>1️⃣</span> Xaridor mablag&apos;ni kiritadi
              </p>
              <p>Xaridor karta (Internet-Ekvayring) yoki bank to&apos;lov topshirig&apos;i (B2B wire) orqali to&apos;laydi. Mablag&apos; platformaning bank hisobida shartnoma uchun xavfsiz muzlatiladi.</p>
            </div>
            <div className="rounded-input border border-line/60 bg-card p-3">
              <p className="font-semibold text-ink mb-1 flex items-center gap-1.5">
                <span>2️⃣</span> To&apos;lov kafolatlanadi
              </p>
              <p>Mablag&apos; bank hisobiga o&apos;tirgach, shartnomangizda &quot;To&apos;lov kafolatlangan (Escrow)&quot; yorlig&apos;i chiqadi. Shundan so&apos;ng xotirjam ishni topshirasiz.</p>
            </div>
            <div className="rounded-input border border-line/60 bg-card p-3">
              <p className="font-semibold text-ink mb-1 flex items-center gap-1.5">
                <span>3️⃣</span> Yechib olish (Karta yoki Bank)
              </p>
              <p>Ish qabul qilingach, daromadingizni Uzcard/Humo kartangizga (B2C instant payout) yoki rasmiy bank hisob-raqamingizga (YaTT/o&apos;z-o&apos;zini band qilgan) yechib olasiz.</p>
            </div>
          </div>
        </div>
      </Card>

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
              {minPayout > 0 && withdrawable > 0 && withdrawable < minPayout && (
                <p className="mt-1 text-2xs text-warning-deep">
                  {t("wd.minPayout")}: {formatMoney(minPayout, lang)}
                </p>
              )}
              {pendingWithdrawal > 0 && (
                <p className="mt-1 text-2xs text-warning-deep">
                  {t("wd.pending")}: {formatMoney(pendingWithdrawal, lang)}
                </p>
              )}
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

      {/* Yechish so'rovlari — admin tasdig'i kutilayotganlar ham shu yerda */}
      {requests.length > 0 && <WithdrawalRequests requests={requests} />}

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
                <div className="flex items-center justify-between pt-1">
                  <p className="truncate text-2xs text-muted">{m.title}</p>
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
              disabled={payoutMethod === "card" ? !cardId : !bankAccountNumber || !bankRecipient}
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
                  Math.max(0, withdrawable - (Number(withdrawAmount.replace(/\s/g, "")) || 0)),
                  lang
                )}
              </span>
            </div>
          </div>

          {/* Usul tanlash: Karta yoki Bank hisob-raqami */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Mablag&apos;ni qabul qilish usuli</p>
            <RadioGroup
              options={[
                {
                  value: "card",
                  label: "Plastik karta (Uzcard / Humo / Visa)",
                  description: "Tezkor B2C Payout — admin tasdiqlagach kartangizga o'tkaziladi",
                },
                {
                  value: "bank_account",
                  label: "Bank hisob-raqami (B2B Wire / YaTT / O'z-o'zini band qilgan)",
                  description: "Rasmiy 20-xonali bank hisob-raqamingizga to'lov topshirig'i (B2B wire) bilan o'tkaziladi",
                },
              ]}
              value={payoutMethod}
              onChange={(val) => {
                setPayoutMethod(val as "card" | "bank_account");
                setBankError("");
              }}
            />
          </div>

          <p className="text-2xs text-faint">{t("wd.pendingHint")}</p>

          {payoutMethod === "card" ? (
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
          ) : (
            <div className="flex flex-col gap-3 rounded-input border border-line bg-surface/60 p-3 text-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <span>🏦</span> Bank hisob-raqami rekvizitlari
              </div>
              <div>
                <label className="text-2xs font-medium text-muted mb-1 block">Hisob-raqam (20 xonali H/r)</label>
                <Input
                  value={bankAccountNumber}
                  onChange={(e) => {
                    setBankAccountNumber(e.target.value.replace(/[^\d]/g, "").slice(0, 20));
                    setBankError("");
                  }}
                  placeholder="2020 8000 ... yoki 2021 6000 ..."
                  className="font-mono text-sm"
                  maxLength={20}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-2xs font-medium text-muted mb-1 block">Bank MFO (5 xona)</label>
                  <Input
                    value={bankMfo}
                    onChange={(e) => {
                      setBankMfo(e.target.value.replace(/[^\d]/g, "").slice(0, 5));
                      setBankError("");
                    }}
                    placeholder="01088"
                    className="font-mono text-sm"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="text-2xs font-medium text-muted mb-1 block">STIR (INN) yoki JShShIR</label>
                  <Input
                    value={bankInnPinfl}
                    onChange={(e) => {
                      setBankInnPinfl(e.target.value.replace(/[^\d]/g, "").slice(0, 14));
                      setBankError("");
                    }}
                    placeholder="309876543"
                    className="font-mono text-sm"
                    maxLength={14}
                  />
                </div>
              </div>
              <div>
                <label className="text-2xs font-medium text-muted mb-1 block">Bank filiali nomi</label>
                <Input
                  value={bankName}
                  onChange={(e) => {
                    setBankName(e.target.value);
                    setBankError("");
                  }}
                  placeholder='ATB "Kapitalbank" Toshkent sh.'
                />
              </div>
              <div>
                <label className="text-2xs font-medium text-muted mb-1 block">Qabul qiluvchi (F.I.O. yoki YaTT/MChJ)</label>
                <Input
                  value={bankRecipient}
                  onChange={(e) => {
                    setBankRecipient(e.target.value);
                    setBankError("");
                  }}
                  placeholder="Alisher Aliyev (O'z-o'zini band qilgan)"
                />
              </div>
              {bankError && (
                <p className="text-2xs text-danger font-medium">{bankError}</p>
              )}
            </div>
          )}
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
