"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ChatImageAttach } from "@/components/ui/ChatImageAttach";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { RatingStars } from "@/components/ui/RatingStars";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { MilestoneProgress } from "@/components/shared/MilestoneProgress";
import { DisputeControl } from "@/components/shared/DisputeControl";
import { DisputeSummary } from "@/components/shared/DisputeSummary";
import {
  ContractStatusBadge,
  MilestoneStatusBadge,
} from "@/components/shared/StatusBadge";
import { authService, contractsService, messagesService, milestonesService, paymentsService, reviewsService, servicesService } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import type { Contract, Message, Milestone, Review, Service } from "@/lib/types";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function XaridorWorkroomPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const [contract, setContract] = useState<Contract | null | undefined>(undefined);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  /* Modallar */
  const [fundOpen, setFundOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<"karta" | "click" | "payme">("karta");
  /* To'lov 2 bosqichli: usul tanlash → SMS (3DS) tasdiqlash */
  const [payPhase, setPayPhase] = useState<"method" | "sms">("method");
  const [smsCode, setSmsCode] = useState("");
  const [smsError, setSmsError] = useState("");
  const [acceptTarget, setAcceptTarget] = useState<Milestone | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<Milestone | null>(null);
  const [revisionComment, setRevisionComment] = useState("");
  const [revisionError, setRevisionError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /* Sharh formasi */
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  /* Chat */
  const [draft, setDraft] = useState("");
  const [draftImage, setDraftImage] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const loadVersionRef = useRef(0);

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
    } catch (error) {
      /* Yuklash xatosi "topilmadi" EMAS — alohida holat ko'rsatiladi */
      if (version === loadVersionRef.current) setLoadError(error);
    }
  }, [params.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function openFund() {
    setPayPhase("method");
    setSmsCode("");
    setSmsError("");
    setFundOpen(true);
  }

  /* 1-bosqich: usul tanlab, SMS (3DS) tasdiqlashga o'tish */
  function handlePayNext() {
    setSmsError("");
    setPayPhase("sms");
  }

  /* 2-bosqich: SMS-kod bilan to'lovni yakunlash */
  async function handleFund() {
    if (!contract) return;
    if (payMethod === "karta" && !/^\d{6}$/.test(smsCode)) {
      setSmsError(t("pay.smsError"));
      return;
    }
    setBusy(true);
    try {
      await paymentsService.fundContract(contract.id);
      toast(t("cfund.done"));
      setFundOpen(false);
      reload();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept() {
    if (!acceptTarget) return;
    setBusy(true);
    try {
      await milestonesService.accept(acceptTarget.id);
      toast(t("bms.accepted"));
      setAcceptTarget(null);
      reload();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevision() {
    if (!revisionTarget) return;
    if (!revisionComment.trim()) {
      setRevisionError(t("bms.errComment"));
      return;
    }
    setBusy(true);
    try {
      await milestonesService.requestRevision(revisionTarget.id, revisionComment);
      toast(t("bms.revisionSent"));
      setRevisionTarget(null);
      setRevisionComment("");
      reload();
    } catch (error) {
      if (error instanceof ApiError && error.message === "REVISION_LIMIT_REACHED") {
        toast(t("bms.revisionLimitReached"), "error");
        setRevisionTarget(null);
        reload();
      } else {
        toast(t("common.error"), "error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!contract) return;
    setBusy(true);
    try {
      await contractsService.cancel(contract.id);
      toast(t("contract.cancelled"));
      setCancelOpen(false);
      reload();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewSubmit(e: FormEvent) {
    e.preventDefault();
    if (!contract) return;
    if (!reviewComment.trim()) {
      setReviewError(t("brev.errComment"));
      return;
    }
    setReviewSaving(true);
    try {
      const created = await reviewsService.create(contract.id, rating, reviewComment);
      setReview(created);
      toast(t("brev.done"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setReviewSaving(false);
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

  if (loadError) return <ErrorState error={loadError} onRetry={reload} />;
  if (contract === undefined) return <SkeletonCard />;
  if (contract === null) return <EmptyState title={t("contract.notFound")} />;

  const myId = authService.getSession()?.userId ?? null;
  const actionable = contract.status === "faol";
  /* Imzolangan yoki faol shartnomani bekor qilish mumkin; tekshiruvdagi ish
     bo'lsa bloklanadi (avval uni hal qilish kerak) */
  const canCancel =
    (contract.status === "faol" || contract.status === "imzolangan") &&
    milestones.every(
      (m) => m.status !== "topshirildi" && m.status !== "ozgartirish_soraldi"
    );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: t("nav.contracts"), href: "/xaridor/shartnomalar" },
          { label: contract.title },
        ]}
      />
      {/* Sarlavha */}
      <Card padding="lg" stitch>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Avatar name={contract.sellerName} />
            <div>
              <p className="text-xs text-muted">{contract.sellerName}</p>
              <h1 className="mt-0.5 font-heading text-xl font-bold text-ink">
                {contract.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ContractStatusBadge status={contract.status} />
                <Badge>{t(`contract.source_${contract.sourceType}`)}</Badge>
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

      {/* Imzolangan — to'lov qilib faollashtirish (asosiy escrow qadami) */}
      {contract.status === "imzolangan" && (
        <Card padding="lg" className="border-warning/30 bg-warning/5">
          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-warning">
              <path d="M10 2 3 5v4.5c0 4 3 7 7 8 4-1 7-4 7-8V5l-7-3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M10 7v3.5M10 13v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <div className="flex-1">
              <h3 className="font-heading text-sm font-bold text-ink">
                {t("cfund.awaitingTitle")}
              </h3>
              <p className="mt-1 text-xs text-muted">{t("cfund.awaitingDesc")}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={openFund}>
                  {t("cfund.pay")} · {formatMoney(contract.totalAmount, lang)}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Faol — escrow'da saqlanayotgan summa ko'rsatiladi */}
      {contract.status === "faol" && (
        <div className="flex items-center justify-between rounded-card border border-accent/25 bg-accent/5 p-4">
          <span className="flex items-center gap-2 text-xs text-muted">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-accent">
              <path d="M8 1.5 13.5 4v3.6c0 3.3-2.3 6.1-5.5 6.9-3.2-.8-5.5-3.6-5.5-6.9V4L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M5.8 8l1.6 1.6 2.8-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("bms.escrowHeld")}
          </span>
          <span className="font-heading text-sm font-bold text-accent">
            {formatMoney(
              milestones
                .filter((m) => m.status !== "qabul_qilindi")
                .reduce((s, m) => s + m.amount, 0),
              lang
            )}
          </span>
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

      {/* Bosqichlar — xaridor amallari bilan */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">
          {t("contract.milestones")}
        </h2>
        <div className="flex flex-col gap-3">
          {milestones.map((milestone, i) => (
            <div
              key={milestone.id}
              className={`flex flex-col gap-3 rounded-card border p-4 ${
                milestone.status === "topshirildi"
                  ? "border-warning/30 bg-warning/5"
                  : milestone.status === "qabul_qilindi"
                    ? "border-success/25 bg-success/5"
                    : "border-line bg-card"
              } ${milestone.status === "kutilmoqda" ? "opacity-80" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold ${
                      milestone.status === "qabul_qilindi"
                        ? "bg-success/10 text-success-deep"
                        : milestone.status === "kutilmoqda"
                          ? "bg-card-hover text-faint"
                          : "bg-primary/10 text-primary-deep"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-ink">
                      {milestone.title}
                    </h4>
                    {milestone.description && (
                      <p className="mt-0.5 text-xs text-muted">
                        {milestone.description}
                      </p>
                    )}
                  </div>
                </div>
                <MilestoneStatusBadge status={milestone.status} />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-9 text-xs text-muted">
                <span className="font-medium text-ink">
                  {formatMoney(milestone.amount, lang)}
                </span>
                <span>
                  {t("ms.due")}: {formatDate(milestone.dueDate, lang)}
                </span>
                {milestone.status === "qabul_qilindi" && milestone.approvedAt && (
                  <span className="text-success">
                    {t("ms.paid")} · {formatDate(milestone.approvedAt, lang)}
                  </span>
                )}
              </div>

              {/* Holatga mos amallar */}
              {milestone.status === "kutilmoqda" && (
                <p className="pl-9 text-2xs text-faint">{t("cfund.awaitingSeller")}</p>
              )}

              {milestone.status === "mablaglangan" && (
                <p className="pl-9 text-2xs text-muted">{t("bms.fundedNote")}</p>
              )}

              {milestone.status === "topshirildi" && (
                <div className="flex flex-col gap-3 pl-9">
                  <div className="flex flex-wrap items-center gap-3">
                    {milestone.reviewDeadline && (
                      <CountdownBadge deadline={milestone.reviewDeadline} />
                    )}
                    <span className="text-2xs text-faint">
                      {t("bms.autoAcceptNote")}
                    </span>
                  </div>
                  {(() => {
                    const limit = service?.revisionsIncluded;
                    const used = milestone.revisionCount ?? 0;
                    const atLimit = limit !== undefined && used >= limit;
                    return (
                      <>
                        {limit !== undefined && (
                          <span className="text-2xs text-faint">
                            {t("bms.revisionsUsed")
                              .replace("{used}", String(used))
                              .replace("{limit}", String(limit))}
                          </span>
                        )}
                        {actionable && (
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => setAcceptTarget(milestone)}>
                              {t("bms.accept")}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={atLimit}
                              title={atLimit ? t("bms.revisionLimitReached") : undefined}
                              onClick={() => {
                                setRevisionTarget(milestone);
                                setRevisionComment("");
                                setRevisionError("");
                              }}
                            >
                              {t("bms.requestRevision")}
                            </Button>
                          </div>
                        )}
                        {atLimit && (
                          <p className="text-2xs text-warning-deep">
                            {t("bms.revisionLimitReached")}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {milestone.status === "ozgartirish_soraldi" && (
                <div className="flex flex-col gap-2 pl-9">
                  {milestone.revisionComment && (
                    <div className="rounded-input border border-danger/25 bg-surface p-3">
                      <p className="text-2xs font-medium uppercase tracking-wide text-danger">
                        {t("ms.revisionNote")}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {milestone.revisionComment}
                      </p>
                    </div>
                  )}
                  <p className="text-2xs text-faint">{t("bms.revisionWaiting")}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Sharh — shartnoma yakunlangach */}
      {contract.status === "yakunlangan" && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-bold text-ink">
            {review ? t("contract.yourReview") : t("brev.title")}
          </h2>
          {review ? (
            <Card className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <RatingStars value={review.rating} showValue />
                <span className="text-2xs text-faint">
                  {formatDate(review.createdAt, lang)}
                </span>
              </div>
              <p className="text-sm text-muted">{review.comment}</p>
            </Card>
          ) : (
            <Card padding="lg">
              <p className="text-sm text-muted">{t("brev.prompt")}</p>
              <form
                onSubmit={handleReviewSubmit}
                className="mt-4 flex flex-col gap-4"
              >
                <RatingStars value={rating} onChange={setRating} size="md" />
                <Textarea
                  value={reviewComment}
                  onChange={(e) => {
                    setReviewComment(e.target.value);
                    setReviewError("");
                  }}
                  placeholder={t("brev.commentPh")}
                  rows={4}
                  error={reviewError}
                  aria-label={t("brev.title")}
                />
                <Button
                  type="submit"
                  loading={reviewSaving}
                  className="self-start"
                >
                  {t("brev.submit")}
                </Button>
              </form>
            </Card>
          )}
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
                    {mine ? t("chat.you") : contract.sellerName.split(" ")[0]} ·{" "}
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
        loading={busy}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />

      {/* Shartnomani faollashtirish (to'liq oldindan to'lov) — 2 bosqich */}
      <Modal
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        title={payPhase === "method" ? t("cfund.title") : t("pay.confirmTitle")}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() =>
                payPhase === "sms" ? setPayPhase("method") : setFundOpen(false)
              }
              disabled={busy}
            >
              {payPhase === "sms" ? t("common.back") : t("common.cancel")}
            </Button>
            {payPhase === "method" ? (
              <Button onClick={handlePayNext}>{t("cfund.pay")}</Button>
            ) : (
              <Button loading={busy} onClick={handleFund}>
                {t("common.confirm")}
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-input border border-line bg-surface p-3">
            <span className="text-xs text-muted">{t("cfund.total")}</span>
            <span className="font-heading text-base font-bold text-ink">
              {formatMoney(contract.totalAmount, lang)}
            </span>
          </div>

          {payPhase === "method" ? (
            <>
              <div>
                <p className="mb-2 text-xs font-medium text-muted">{t("pay.method")}</p>
                <RadioGroup
                  options={[
                    { value: "karta", label: t("pay.cardOption"), description: "Visa · Mastercard · Uzcard · Humo · 3D Secure" },
                    { value: "click", label: "Click", description: t("pay.clickHint") },
                    { value: "payme", label: "Payme", description: t("pay.paymeHint") },
                  ]}
                  value={payMethod}
                  onChange={(value) => setPayMethod(value as "karta" | "click" | "payme")}
                />
              </div>
              <p className="rounded-input border border-accent/25 bg-accent/5 p-3 text-2xs text-muted">
                {t("cfund.modalDesc")}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-muted">
                {payMethod === "karta"
                  ? t("pay.smsHint")
                  : t("pay.redirectNote").replace(
                      "{app}",
                      payMethod === "click" ? "Click" : "Payme"
                    )}
              </p>
              {payMethod === "karta" ? (
                <Input
                  value={smsCode}
                  onChange={(e) => {
                    setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setSmsError("");
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  aria-label={t("pay.confirmTitle")}
                  error={smsError}
                  className="text-center text-lg tracking-[0.5em]"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-3 rounded-input border border-primary/25 bg-primary/5 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-btn bg-primary/10 font-heading text-xs font-bold text-primary-deep">
                    {payMethod === "click" ? "CL" : "PM"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {payMethod === "click" ? "Click" : "Payme"}
                    </p>
                    <p className="text-2xs text-muted">{t("pay.secureRedirect")}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Qabul qilish modali */}
      <Modal
        open={!!acceptTarget}
        onClose={() => setAcceptTarget(null)}
        title={t("bms.acceptTitle")}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setAcceptTarget(null)}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button loading={busy} onClick={handleAccept}>
              {t("bms.accept")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {acceptTarget && (
            <div className="flex items-center justify-between rounded-input border border-line bg-surface p-3">
              <span className="text-xs text-muted">{acceptTarget.title}</span>
              <span className="font-heading text-base font-bold text-success">
                {formatMoney(acceptTarget.amount, lang)}
              </span>
            </div>
          )}
          <p>{t("bms.acceptDesc")}</p>
        </div>
      </Modal>

      {/* O'zgartirish so'rash modali */}
      <Modal
        open={!!revisionTarget}
        onClose={() => setRevisionTarget(null)}
        title={t("bms.requestRevision")}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setRevisionTarget(null)}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button loading={busy} onClick={handleRevision}>
              {t("bms.requestRevision")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {revisionTarget && (
            <div className="flex items-center justify-between rounded-input border border-line bg-surface p-3 text-xs">
              <span className="font-medium text-ink">{revisionTarget.title}</span>
              <span className="font-bold text-primary">
                {formatMoney(revisionTarget.amount, lang)}
              </span>
            </div>
          )}
          <div className="rounded-input border border-warning/20 bg-warning/5 p-3 text-xs text-muted">
            <p className="font-medium text-ink">{t("bms.revisionGuidance")}</p>
          </div>
          <Textarea
            label={t("bms.revisionReason")}
            value={revisionComment}
            onChange={(e) => {
              setRevisionComment(e.target.value);
              setRevisionError("");
            }}
            placeholder={t("bms.revisionReasonPh")}
            rows={4}
            error={revisionError}
          />
        </div>
      </Modal>
    </div>
  );
}
