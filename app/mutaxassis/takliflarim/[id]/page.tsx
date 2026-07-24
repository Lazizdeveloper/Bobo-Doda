"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ProposalStatusBadge } from "@/components/shared/StatusBadge";
import {
  getContracts,
  getJob,
  getProposal,
  withdrawProposal,
} from "@/lib/mock-api";
import type { Contract, Job, Proposal } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

const WITHDRAWABLE = ["yuborilgan", "korib_chiqilmoqda", "suhbat"];

export default function TaklifTafsilotiPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const [proposal, setProposal] = useState<Proposal | null | undefined>(undefined);
  const [job, setJob] = useState<Job | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    getProposal(params.id).then((found) => {
      setProposal(found);
      if (found) {
        getJob(found.jobId).then(setJob);
        getContracts().then((all) =>
          setContract(all.find((c) => c.jobId === found.jobId) ?? null)
        );
      }
    });
  }, [params.id]);

  async function handleWithdraw() {
    if (!proposal) return;
    setWithdrawing(true);
    try {
      const updated = await withdrawProposal(proposal.id);
      setProposal(updated);
      toast(t("prop.withdrawn"));
      setWithdrawOpen(false);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setWithdrawing(false);
    }
  }

  if (proposal === undefined) return <SkeletonCard />;
  if (proposal === null) return <EmptyState title={t("common.notFound")} />;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ProposalStatusBadge status={proposal.status} />
          <span className="text-2xs text-faint">
            {formatDate(proposal.createdAt, lang)}
          </span>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("prop.detailTitle")}
        </h1>
        {job && (
          <Link
            href={`/mutaxassis/ish-elonlari/${job.id}`}
            className="text-sm font-medium text-primary transition-colors duration-150 hover:text-ink"
          >
            {job.title} →
          </Link>
        )}
      </div>

      <Card padding="lg" className="flex flex-col gap-4">
        <div>
          <p className="text-2xs font-medium uppercase tracking-wide text-faint">
            {t("props.bid")}
          </p>
          <p className="mt-1 font-heading text-lg font-bold text-ink">
            {formatMoney(proposal.bidAmount, lang)}
          </p>
        </div>

        <div className="border-t border-line pt-4">
          <p className="text-2xs font-medium uppercase tracking-wide text-faint">
            {t("prop.cover")}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
            {proposal.coverLetter}
          </p>
        </div>

        {proposal.screeningAnswers.length > 0 && (
          <div className="border-t border-line pt-4">
            <p className="text-2xs font-medium uppercase tracking-wide text-faint">
              {t("prop.answers")}
            </p>
            <div className="mt-2 flex flex-col gap-3">
              {proposal.screeningAnswers.map((qa, i) => (
                <div key={i}>
                  <p className="text-xs font-medium text-ink">
                    {i + 1}. {qa.question}
                  </p>
                  <p className="mt-1 text-xs text-muted">{qa.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {proposal.attachedImages.length > 0 && (
          <div className="border-t border-line pt-4">
            <p className="text-2xs font-medium uppercase tracking-wide text-faint">
              {t("prop.attachedTitle")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {proposal.attachedImages.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`Portfolio ${i + 1}`}
                  className="h-16 w-24 rounded-input border border-line object-cover"
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {WITHDRAWABLE.includes(proposal.status) ? (
          <Button variant="danger" onClick={() => setWithdrawOpen(true)}>
            {t("prop.withdraw")}
          </Button>
        ) : (
          <span />
        )}
        {proposal.status === "yollandi" && contract && (
          <Link href={`/mutaxassis/shartnomalar/${contract.id}`}>
            <Button>{t("props.openContract")}</Button>
          </Link>
        )}
      </div>

      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title={t("prop.withdrawTitle")}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setWithdrawOpen(false)}
              disabled={withdrawing}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={withdrawing} onClick={handleWithdraw}>
              {t("prop.withdraw")}
            </Button>
          </>
        }
      >
        <p>{t("prop.withdrawDesc")}</p>
      </Modal>
    </div>
  );
}
