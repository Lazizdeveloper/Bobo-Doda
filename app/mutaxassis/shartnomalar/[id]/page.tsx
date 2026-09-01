"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ChatImageAttach } from "@/components/ui/ChatImageAttach";
import { RatingStars } from "@/components/ui/RatingStars";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { MilestoneItem } from "@/components/shared/MilestoneItem";
import { MilestoneProgress } from "@/components/shared/MilestoneProgress";
import { DisputeControl } from "@/components/shared/DisputeControl";
import { DisputeSummary } from "@/components/shared/DisputeSummary";
import { ContractStatusBadge } from "@/components/shared/StatusBadge";
import { authService, contractsService, messagesService, milestonesService, reviewsService, servicesService } from "@/lib/api";
import type { Contract, Message, Milestone, Review, Service } from "@/lib/types";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function ShartnomaWorkroomPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const [contract, setContract] = useState<Contract | null | undefined>(undefined);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [service, setService] = useState<Service | null>(null);

  /* Topshirish modali */
  const [submitTarget, setSubmitTarget] = useState<Milestone | null>(null);
  const [workLink, setWorkLink] = useState("");
  const [workNote, setWorkNote] = useState("");
  const [linkError, setLinkError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Bekor qilish */
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  /* Chat */
  const [draft, setDraft] = useState("");
  const [draftImage, setDraftImage] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const loadVersionRef = useRef(0);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function reload() {
    const version = ++loadVersionRef.current;
    setContract(undefined);
    try {
      const found = await contractsService.get(params.id);
      if (version !== loadVersionRef.current) return;
      if (!found) {
        setContract(null);
        return;
      }
      const [nextMilestones, nextMessages, nextReview, nextService] = await Promise.all([
        milestonesService.list(found.id),
        messagesService.list(found.id),
        reviewsService.getForContract(found.id),
        found.serviceId ? servicesService.get(found.serviceId) : Promise.resolve(null),
      ]);
      if (version !== loadVersionRef.current) return;
      setContract(found);
      setMilestones(nextMilestones);
      setMessages(nextMessages);
      setReview(nextReview);
      setService(nextService);
      void messagesService.markRead(found.id);
    } catch {
      if (version === loadVersionRef.current) setContract(null);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function openSubmitModal(milestone: Milestone) {
    setSubmitTarget(milestone);
    setWorkLink("");
    setWorkNote("");
    setLinkError("");
  }

  async function handleSubmitWork(e: FormEvent) {
    e.preventDefault();
    if (!submitTarget || !contract) return;
    if (!workLink.trim()) {
      setLinkError(t("sm.errLink"));
      return;
    }
    setSubmitting(true);
    try {
      await milestonesService.submit(submitTarget.id);
      const chatText = workNote.trim()
        ? `${workNote.trim()}\n${workLink.trim()}`
        : workLink.trim();
      const message = await messagesService.send(contract.id, chatText);
      setMessages((prev) => [...prev, message]);
      setMilestones(await milestonesService.list(contract.id));
      toast(t("sm.done"));
      setSubmitTarget(null);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!contract) return;
    setCancelling(true);
    try {
      await contractsService.cancel(contract.id);
      toast(t("contract.cancelled"));
      setCancelOpen(false);
      reload();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setCancelling(false);
    }
  }

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if ((!text && !draftImage) || !contract) return;
    setSending(true);
    try {
      const message = await messagesService.send(contract.id, text, draftImage);
      setMessages((prev) => [...prev, message]);
      setDraft("");
      setDraftImage(undefined);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSending(false);
    }
  }

  if (contract === undefined) return <SkeletonCard />;
  if (contract === null) return <EmptyState title={t("contract.notFound")} />;

  const myId = authService.getSession()?.userId ?? null;
  /* Imzolangan yoki faol shartnomani bekor qilish mumkin; tekshiruvdagi ish
     bo'lsa bloklanadi */
  const canCancel =
    (contract.status === "faol" || contract.status === "imzolangan") &&
    milestones.every(
      (m) => m.status !== "topshirildi" && m.status !== "ozgartirish_soraldi"
    );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: t("nav.contracts"), href: "/mutaxassis/shartnomalar" },
          { label: contract.title },
        ]}
      />
      {/* Sarlavha */}
      <Card padding="lg" stitch>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Avatar name={contract.buyerName} />
            <div>
              <p className="text-xs text-muted">{contract.buyerName}</p>
              <h1 className="mt-0.5 font-heading text-xl font-bold text-ink">
                {contract.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ContractStatusBadge status={contract.status} />
                <Badge>
                  {t(`contract.source_${contract.sourceType}`)}
                </Badge>
                <span className="text-2xs text-faint">
                  {formatDate(contract.createdAt, lang)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xs font-medium uppercase tracking-wide text-faint">
              {t("contract.total")}
            </p>
            <p className="mt-1 font-heading text-lg font-bold text-ink">
              {formatMoney(contract.totalAmount, lang)}
            </p>
          </div>
        </div>

        {milestones.length > 1 && (
          <div className="mt-6 border-t border-line pt-4">
            <MilestoneProgress milestones={milestones} />
          </div>
        )}
      </Card>

      {/* Contract Lifecycle Stage Pipeline */}
      <Card padding="md" className="border-line bg-card">
        <p className="text-2xs font-bold uppercase tracking-wider text-muted mb-3">
          {t("pipeline.title")}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div
            className={`flex items-center gap-2 rounded-input border p-2.5 text-xs font-semibold ${
              contract.status === "bekor_qilingan"
                ? "border-line bg-surface text-muted"
                : "border-primary/30 bg-primary/10 text-primary"
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-2xs text-on-primary">
              1
            </span>
            <span className="truncate">{t("pipeline.stageFund")}</span>
          </div>

          <div
            className={`flex items-center gap-2 rounded-input border p-2.5 text-xs font-semibold ${
              contract.status === "faol" ||
              milestones.some((m) => m.status === "topshirildi" || m.status === "qabul_qilindi") ||
              contract.status === "yakunlangan"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-line bg-surface text-muted"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs ${
                contract.status === "faol" ||
                milestones.some((m) => m.status === "topshirildi" || m.status === "qabul_qilindi") ||
                contract.status === "yakunlangan"
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-faint"
              }`}
            >
              2
            </span>
            <span className="truncate">{t("pipeline.stageWork")}</span>
          </div>

          <div
            className={`flex items-center gap-2 rounded-input border p-2.5 text-xs font-semibold ${
              milestones.some((m) => m.status === "topshirildi" || m.status === "ozgartirish_soraldi") ||
              contract.status === "yakunlangan"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-line bg-surface text-muted"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs ${
                milestones.some((m) => m.status === "topshirildi" || m.status === "ozgartirish_soraldi") ||
                contract.status === "yakunlangan"
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-faint"
              }`}
            >
              3
            </span>
            <span className="truncate">{t("pipeline.stageReview")}</span>
          </div>

          <div
            className={`flex items-center gap-2 rounded-input border p-2.5 text-xs font-semibold ${
              contract.status === "yakunlangan"
                ? "border-primary/30 bg-primary/10 text-primary font-bold"
                : "border-line bg-surface text-muted"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs ${
                contract.status === "yakunlangan"
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-faint"
              }`}
            >
              4
            </span>
            <span className="truncate">{t("pipeline.stageDone")}</span>
          </div>
        </div>
      </Card>

      {/* Imzolangan — buyurtmachi to'lovi kutilmoqda, ish boshlanmasin */}
      {contract.status === "imzolangan" && (
        <div className="flex items-start gap-3 rounded-card border border-warning/30 bg-warning/5 p-4">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-warning">
            <path d="M10 2 3 5v4.5c0 4 3 7 7 8 4-1 7-4 7-8V5l-7-3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M10 7v3.5M10 13v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <p className="text-xs text-muted">{t("cfund.awaitingSeller")}</p>
        </div>
      )}
      {contract.status === "nizo" && (
        <DisputeSummary contractId={contract.id} />
      )}
      {contract.status === "bekor_qilingan" && (
        <p className="rounded-card border border-line bg-card p-4 text-xs text-muted">
          {t("contract.cancelledNote")}
        </p>
      )}

      {/* Bosqichlar */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">
          {t("contract.milestones")}
        </h2>
        <div className="flex flex-col gap-3">
          {milestones.map((milestone, i) => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              index={i}
              contractStatus={contract.status}
              onSubmit={openSubmitModal}
              revisionsIncluded={service?.revisionsIncluded}
            />
          ))}
        </div>
      </section>

      {/* Buyurtmachi sharhi */}
      {contract.status === "yakunlangan" && review && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-bold text-ink">
            {t("contract.reviewTitle")}
          </h2>
          <Card className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <RatingStars value={review.rating} showValue />
              <span className="text-2xs text-faint">
                {formatDate(review.createdAt, lang)}
              </span>
            </div>
            <p className="text-sm text-muted">{review.comment}</p>
          </Card>
        </section>
      )}

      {/* Chat */}
      <Card padding="none" className="flex flex-col">
        <h2 className="border-b border-line px-4 py-3 font-heading text-sm font-bold text-ink">
          {t("chat.title")}
        </h2>

        <div className="flex max-h-96 min-h-56 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="m-auto max-w-60 text-center text-xs text-faint">
              {t("chat.empty")}
            </p>
          ) : (
            messages.map((msg) => {
              const mine = msg.senderId === myId;
              return (
                <div
                  key={msg.id}
                  className={`flex max-w-[85%] flex-col gap-1 ${
                    mine ? "items-end self-end" : "items-start self-start"
                  }`}
                >
                  <div
                    className={`flex flex-col gap-1.5 rounded-card px-3 py-2 text-sm ${
                      mine
                        ? "rounded-br-[4px] bg-primary text-on-primary"
                        : "rounded-bl-[4px] bg-card-hover text-ink"
                    }`}
                  >
                    {msg.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={msg.image}
                        alt={t("chat.attachedImage")}
                        className="max-h-48 rounded-input object-cover"
                      />
                    )}
                    {msg.text && (
                      <span className="whitespace-pre-line break-words">{msg.text}</span>
                    )}
                  </div>
                  <span className="text-2xs text-faint">
                    {mine ? t("chat.you") : contract.buyerName.split(" ")[0]} ·{" "}
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className="flex items-end gap-2 border-t border-line p-3"
        >
          <ChatImageAttach value={draftImage} onChange={setDraftImage} />
          <div className="flex-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("chat.placeholder")}
                aria-label={t("chat.placeholder")}
                maxLength={5000}
            />
          </div>
          <Button type="submit" loading={sending} disabled={!draft.trim() && !draftImage}>
            {t("chat.send")}
          </Button>
        </form>
      </Card>

      {/* Shartnomani bekor qilish */}
      {(canCancel || contract.status === "faol") && (
        <div className="flex justify-end gap-2">
          {contract.status === "faol" && (
            <DisputeControl contractId={contract.id} onOpened={reload} />
          )}
          {canCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCancelOpen(true)}
            className="text-danger hover:text-danger"
          >
            {t("contract.cancel")}
          </Button>
          )}
        </div>
      )}

      {/* Bekor qilish modali */}
      <ConfirmDialog
        open={cancelOpen}
        title={t("contract.cancelTitle")}
        description={t("contract.cancelDesc")}
        confirmLabel={t("contract.cancel")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />

      {/* Ishni topshirish modali */}
      <Modal
        open={!!submitTarget}
        onClose={() => setSubmitTarget(null)}
        title={t("sm.title")}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setSubmitTarget(null)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              loading={submitting}
              onClick={(e) => handleSubmitWork(e as unknown as FormEvent)}
            >
              {t("sm.title")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitWork} className="flex flex-col gap-4">
          <p className="text-xs text-muted">{t("sm.desc")}</p>
          {submitTarget && (
            <p className="rounded-input border border-line bg-surface p-3 text-xs">
              <span className="font-medium text-ink">{submitTarget.title}</span>
              <span className="ml-2 text-muted">
                {formatMoney(submitTarget.amount, lang)}
              </span>
            </p>
          )}
          <Input
            label={t("sm.link")}
            value={workLink}
            onChange={(e) => {
              setWorkLink(e.target.value);
              setLinkError("");
            }}
            placeholder={t("sm.linkPh")}
            error={linkError}
          />
          <Textarea
            label={t("sm.note")}
            value={workNote}
            onChange={(e) => setWorkNote(e.target.value)}
            placeholder={t("sm.notePh")}
            rows={3}
          />
        </form>
      </Modal>
    </div>
  );
}
