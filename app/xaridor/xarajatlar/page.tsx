"use client";

import { useCallback, useEffect, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { ReceiptModal } from "@/components/shared/ReceiptModal";
import { contractsService, milestonesService } from "@/lib/api";
import type { Contract, Milestone } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

const ESCROW_STATUSES = ["mablaglangan", "topshirildi", "ozgartirish_soraldi"];

export default function XarajatlarPage() {
  const { t, lang } = useT();
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  /* Bosqich 18 — YAGONA haqiqiy balans manbasi: `GET /seller/balance`
     (faqat sotuvchi uchun, xaridorda doim 0 — `lib/api/client.ts`
     `getBalance()`). Pul yechish (karta/bank hisob-raqami) real payout
     rail hali tanlanmagani uchun XAVFSIZ o'chirilgan — shuning uchun bu
     sahifada "yechish" tugmasi UMUMAN yo'q (avval bor edi, lekin bosishi
     doim xato bilan tugardi — chiqarib tashlandi). Muhim tuzatish: bu
     sahifaning `load()`i avval `getCards`/`getPendingWithdrawalTotal`/
     `listMyWithdrawalRequests` (uchalasi ham o'chirilgan) bilan bitta
     `Promise.all`da edi — ya'ni ULAR har doim rad etilib, HAQIQIY
     ma'lumot (jami to'lov, escrow, to'lovlar tarixi) HECH QACHON
     ko'rinmasdi, sahifa doim `<ErrorState>` ko'rsatardi. */
  const [receiptMilestone, setReceiptMilestone] = useState<Milestone | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([milestonesService.listMine(), contractsService.list()])
      .then(([milestoneList, contractList]) => {
        setMilestones(milestoneList);
        setContracts(contractList);
      })
      /* Yuklash xatosi bo'sh ro'yxat EMAS — alohida holat ko'rsatiladi */
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

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

      {/* Platformada To'lov & Escrow mexanizmi tushuntirishi */}
      <Card padding="md" className="border-accent/25 bg-accent/5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-ink font-heading font-bold text-sm">
            <span className="text-lg">🛡️</span>
            <span>Kafolatlangan To&apos;lov (Escrow) va Mablag&apos; qaytarish tartibi</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted mt-1">
            <div className="rounded-input border border-line/60 bg-card p-3">
              <p className="font-semibold text-ink mb-1 flex items-center gap-1.5">
                <span>1️⃣</span> Shartnoma to&apos;lovi (Escrow)
              </p>
              <p>Har bir loyiha uchun to&apos;lov Payme orqali amalga oshiriladi va platforma hisobida muzlatiladi.</p>
            </div>
            <div className="rounded-input border border-line/60 bg-card p-3">
              <p className="font-semibold text-ink mb-1 flex items-center gap-1.5">
                <span>2️⃣</span> Qaytarilgan mablag&apos; (Refund)
              </p>
              <p>Agar shartnoma bekor qilinsa yoki nizo xaridor foydasiga yechilsa, mablag&apos; sizga qaytariladi.</p>
            </div>
          </div>
        </div>
      </Card>

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
