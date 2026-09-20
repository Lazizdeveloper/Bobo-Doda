"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { MilestoneItem } from "@/components/shared/MilestoneItem";
import { MilestoneProgress } from "@/components/shared/MilestoneProgress";
import { DisputeSummary } from "@/components/shared/DisputeSummary";
import { ContractStatusBadge } from "@/components/shared/StatusBadge";
import { ReceiptModal } from "@/components/shared/ReceiptModal";
import { contractsService, disputesService, milestonesService } from "@/lib/api";
import type { Contract, Dispute, Milestone } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function ShartnomaWorkroomPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const [contract, setContract] = useState<Contract | null | undefined>(undefined);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const loadVersionRef = useRef(0);

  /* Topshirish modali — real backend faqat havola + izoh qabul qiladi (`SubmitMilestoneDto`) */
  const [submitTarget, setSubmitTarget] = useState<Milestone | null>(null);
  const [workLink, setWorkLink] = useState("");
  const [workNote, setWorkNote] = useState("");
  const [linkError, setLinkError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receiptMilestone, setReceiptMilestone] = useState<Milestone | null>(null);

  const [decisionBusy, setDecisionBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const reload = useCallback(async () => {
    const version = ++loadVersionRef.current;
    setContract(undefined);
    setLoadError(null);
    try {
      const found = await contractsService.get(params.id);
      if (version !== loadVersionRef.current) return;
      if (!found) {
        setContract(null);
        return;
      }
      const nextMilestones = await milestonesService.list(found.id);
      if (version !== loadVersionRef.current) return;
      setContract(found);
      setMilestones(nextMilestones);
      /* Nizo — alohida so'rov, yo'qligi xato EMAS (fon yangilanishida yutiladi) */
      disputesService.getForContract(found.id).then(setDispute).catch(() => setDispute(null));
    } catch (error) {
      if (version === loadVersionRef.current) setLoadError(error);
    }
  }, [params.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  function openSubmitModal(milestone: Milestone) {
    setSubmitTarget(milestone);
    setWorkLink(milestone.deliverableLink || "");
    setWorkNote(milestone.deliverableNote || "");
    setLinkError("");
  }

  async function handleSubmitWork(e: FormEvent) {
    e.preventDefault();
    if (!submitTarget || !contract) return;
    if (!workLink.trim() && !workNote.trim()) {
      setLinkError(t("sm.errLink"));
      return;
    }
    setSubmitting(true);
    try {
      await milestonesService.submit(contract.id, submitTarget.id, {
        link: workLink.trim() || undefined,
        note: workNote.trim() || undefined,
      });
      setMilestones(await milestonesService.list(contract.id));
      toast(t("sm.done"));
      setSubmitTarget(null);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAccept() {
    if (!contract) return;
    setDecisionBusy(true);
    try {
      await contractsService.accept(contract.id);
      toast(t("contract.acceptedToast"));
      reload();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setDecisionBusy(false);
    }
  }

  async function handleReject() {
    if (!contract) return;
    setDecisionBusy(true);
    try {
      await contractsService.reject(contract.id);
      toast(t("contract.rejectedToast"));
      setRejectOpen(false);
      reload();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setDecisionBusy(false);
    }
  }

  if (loadError) return <ErrorState error={loadError} onRetry={reload} />;
  if (contract === undefined) return <SkeletonCard />;
  if (contract === null) return <EmptyState title={t("contract.notFound")} />;

  const pendingDecision = contract.status === "imzolangan";
  const funded = !!contract.fundedAt;
  const disputeOpen = !!dispute && dispute.status !== "hal_qilindi";

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: t("nav.contracts"), href: "/mutaxassis/shartnomalar" },
          { label: contract.title },
        ]}
      />

      <Card padding="lg" stitch>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Avatar name={contract.buyerName} />
            <div>
              <p className="text-xs text-muted">{contract.buyerName}</p>
              <h1 className="mt-0.5 font-heading text-xl font-bold text-ink">{contract.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ContractStatusBadge status={contract.status} />
                <span className="text-2xs text-faint">{formatDate(contract.createdAt, lang)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-1 text-left sm:text-right">
            <p className="text-2xs font-medium uppercase tracking-wide text-faint">{t("contract.total")}</p>
            <p className="font-heading text-lg font-bold text-ink">{formatMoney(contract.totalAmount, lang)}</p>
          </div>
        </div>

        {/* Yangi shartnoma — sotuvchi javobi kutilmoqda */}
        {pendingDecision && (
          <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-sm font-bold text-ink">{t("contract.decisionTitle")}</h3>
                <p className="mt-0.5 text-xs text-muted">{t("contract.decisionDesc")}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" onClick={() => setRejectOpen(true)} disabled={decisionBusy}>
                  {t("contract.rejectAction")}
                </Button>
                <Button onClick={handleAccept} loading={decisionBusy}>
                  {t("contract.acceptAction")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Escrow kafolati — real to'lov tasdiqlangan */}
        {funded && (
          <div className="mt-4 rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-xs border-l-4 border-l-emerald-500">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-lg shadow-2xs">🛡️</span>
              <div className="flex-1">
                <h3 className="font-heading text-sm font-black text-ink tracking-tight">{t("contract.escrowFundedTitle")}</h3>
                <p className="mt-2 text-xs sm:text-sm text-ink/90 leading-relaxed">{t("contract.escrowFundedSellerDesc")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Faol, lekin hali to'lanmagan */}
        {contract.status === "faol" && !funded && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900">
            {t("cfund.awaitingSeller")}
          </div>
        )}

        {milestones.length > 1 && (
          <div className="mt-6 border-t border-line pt-4">
            <MilestoneProgress milestones={milestones} />
          </div>
        )}
      </Card>

      {disputeOpen && dispute && <DisputeSummary contractId={contract.id} onWithdrawn={reload} />}

      {contract.status === "bekor_qilingan" && (
        <p className="rounded-card border border-line bg-card p-4 text-xs text-muted">
          {contract.cancelReason || t("contract.cancelledNote")}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">{t("contract.milestones")}</h2>
        <div className="flex flex-col gap-3">
          {milestones.map((milestone, i) => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              index={i}
              contractStatus={contract.status}
              onSubmit={openSubmitModal}
              onViewReceipt={(m) => setReceiptMilestone(m)}
            />
          ))}
        </div>
      </section>

      {/* Ishni topshirish modali */}
      <Modal
        open={!!submitTarget}
        onClose={() => setSubmitTarget(null)}
        title={t("ms.submitAction")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubmitTarget(null)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button loading={submitting} onClick={handleSubmitWork}>
              {t("sm.done")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitWork} className="flex flex-col gap-4">
          <Input
            label={t("sm.link")}
            value={workLink}
            onChange={(e) => {
              setWorkLink(e.target.value);
              setLinkError("");
            }}
            placeholder="https://drive.google.com/..."
            error={linkError}
          />
          <Textarea
            label={t("sm.note")}
            value={workNote}
            onChange={(e) => setWorkNote(e.target.value)}
            rows={4}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={rejectOpen}
        title={t("contract.rejectAction")}
        description={t("contract.rejectDesc")}
        confirmLabel={t("contract.rejectAction")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={decisionBusy}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
      />

      <ReceiptModal
        open={!!receiptMilestone}
        onClose={() => setReceiptMilestone(null)}
        milestone={receiptMilestone}
        contractTitle={contract?.title}
        contractId={contract?.id}
        buyerName={contract?.buyerName}
        sellerName={contract?.sellerName}
      />
    </div>
  );
}
