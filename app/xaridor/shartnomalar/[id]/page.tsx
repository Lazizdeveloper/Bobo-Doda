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
import { ChatFileAttach } from "@/components/ui/ChatFileAttach";
import { RatingStars } from "@/components/ui/RatingStars";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { MilestoneProgress } from "@/components/shared/MilestoneProgress";
import { DisputeControl } from "@/components/shared/DisputeControl";
import { DisputeSummary } from "@/components/shared/DisputeSummary";
import { ReceiptModal } from "@/components/shared/ReceiptModal";
import { ContractDocumentModal } from "@/components/shared/ContractDocumentModal";
import { BankTransferPaymentModal } from "@/components/shared/BankTransferPaymentModal";
import { B2BInvoiceModal } from "@/components/shared/B2BInvoiceModal";
import { AntiCircumventionModal } from "@/components/shared/AntiCircumventionModal";
import { checkCircumvention, reportCircumventionViolation, type CircumventionCheckResult } from "@/lib/chat-filter";
import {
  ContractStatusBadge,
  MilestoneStatusBadge,
} from "@/components/shared/StatusBadge";
import { authService, contractsService, messagesService, milestonesService, reviewsService, servicesService, DATA_CHANGED_EVENT } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import type { Contract, DeliverableFile, Message, Milestone, Review, Service } from "@/lib/types";
import { formatDate, formatFileSize, formatMoney, formatTime, triggerFileDownload } from "@/lib/format";
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
  const [receiptMilestone, setReceiptMilestone] = useState<Milestone | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<Milestone | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<Milestone | null>(null);
  const [revisionComment, setRevisionComment] = useState("");
  const [revisionError, setRevisionError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [approveCloseOpen, setApproveCloseOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /* Rasmiy shartnoma hujjati, to'lov hisobi va imzolash */
  const [documentOpen, setDocumentOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [signingContract, setSigningContract] = useState(false);
  const [circumventionResult, setCircumventionResult] = useState<CircumventionCheckResult | null>(null);
  const [circumventionModalOpen, setCircumventionModalOpen] = useState(false);

  /* Sharh formasi */
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  /* Chat */
  const [draft, setDraft] = useState("");
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [draftFiles, setDraftFiles] = useState<DeliverableFile[]>([]);
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

  /* Jonli chat yangilanishi: yangi xabar kelganda F5 talab qilinmasin */
  useEffect(() => {
    if (!params.id) return;
    async function checkMessages() {
      try {
        const next = await messagesService.list(params.id);
        setMessages((prev) => {
          if (prev.length !== next.length || next.some((m, idx) => m.id !== prev[idx]?.id)) {
            return next;
          }
          return prev;
        });
        void messagesService.markRead(params.id);
      } catch {
        // ignore background poll error
      }
    }
    const interval = setInterval(checkMessages, 4000);
    const handleEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || detail.key === "sb_messages" || !detail.key) {
        void checkMessages();
      }
    };
    window.addEventListener(DATA_CHANGED_EVENT, handleEvent);
    window.addEventListener("storage", handleEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener(DATA_CHANGED_EVENT, handleEvent);
      window.removeEventListener("storage", handleEvent);
    };
  }, [params.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function openFund() {
    setFundOpen(true);
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

  async function handleSignContract() {
    if (!contract) return;
    setSigningContract(true);
    try {
      const updated = await contractsService.sign(contract.id);
      setContract(updated);
      toast(t("contract.signedSuccess"));
      reload();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSigningContract(false);
    }
  }

  async function handleApproveClose() {
    if (!contract) return;
    setBusy(true);
    try {
      await contractsService.approveClose(contract.id);
      toast(t("contract.closed"));
      setApproveCloseOpen(false);
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
    const hasAttachments = draftImages.length > 0 || draftFiles.length > 0;
    if ((!text && !hasAttachments) || !contract) return;

    // To'lov amalga oshirilmagan bo'lsa platformadan tashqi kontaktlar taqiqlanadi
    if (contract.status !== "faol" && contract.status !== "yakunlangan") {
      const check = checkCircumvention(text);
      if (check.hasViolation) {
        setCircumventionResult(check);
        setCircumventionModalOpen(true);
        reportCircumventionViolation({
          senderId: contract.buyerId,
          senderName: contract.buyerName,
          targetType: "message",
          targetId: contract.id,
          targetTitle: `Shartnoma chati: ${contract.title}`,
          matchedText: check.matchedText,
          violationType: check.type,
          fullContent: text,
        });
        return;
      }
    }

    setSending(true);
    try {
      const message = await messagesService.send(
        contract.id,
        text,
        draftImages[0],
        { images: draftImages, files: draftFiles }
      );
      setMessages((prev) => [...prev, message]);
      setDraft("");
      setDraftImages([]);
      setDraftFiles([]);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSending(false);
    }
  }

  function handleRemoveDraftImage(index: number) {
    setDraftImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleRemoveDraftFile(index: number) {
    setDraftFiles((prev) => prev.filter((_, i) => i !== index));
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
                {contract.contractNumber && (
                  <Badge tone="neutral" className="font-mono">
                    {contract.contractNumber}
                  </Badge>
                )}
                {contract.buyerAcceptedAt && (
                  <Badge tone="success" className="font-semibold text-3xs gap-1">
                    ✓ Elektron imzolangan
                  </Badge>
                )}
                <span className="text-2xs text-faint">
                  {formatDate(contract.createdAt, lang)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-3 text-left sm:text-right">
            <div>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("contract.total")}
              </p>
              <p className="mt-1 font-heading text-lg font-bold text-ink">
                {formatMoney(contract.totalAmount, lang)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInvoiceOpen(true)}
                className="gap-1.5 font-medium"
              >
                📄 To&apos;lov hisobi (Invoice)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDocumentOpen(true)}
                className="gap-1.5 font-medium"
              >
                📄 {t("contract.viewDocument")}
              </Button>
            </div>
          </div>
        </div>

        {/* Shartnomani elektron imzolash banneri (agar buyurtmachi hali tasdiqlamagan bo'lsa va faol bo'lmasa) */}
        {!contract.buyerAcceptedAt && contract.status !== "faol" && contract.status !== "yakunlangan" && (
          <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning text-white font-bold text-sm shadow-sm">
                  ✍️
                </span>
                <div>
                  <h3 className="font-heading text-sm font-bold text-ink">
                    {t("contract.signPromptTitle")}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    {t("contract.signPromptDesc")}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setDocumentOpen(true)}
                className="shrink-0 font-bold shadow-sm"
              >
                ✍️ {t("contract.signAction")}
              </Button>
            </div>
          </div>
        )}

        {/* ESCROW TO'LOV KAFOLATI BLOKI — Xaridor uchun xavfsizlik kafolati */}
        {contract.status === "faol" && (
          <div className="mt-4 rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-xs border-l-4 border-l-emerald-500">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 text-lg shadow-2xs">
                🛡️
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-sm sm:text-base font-black text-ink tracking-tight">
                      XAVFSIZ ESCROW KAFOLATI FAOL
                    </h3>
                    <span className="inline-flex items-center gap-1 text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      ✓ Himoyalangan
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface border border-line shadow-2xs">
                    <span className="text-3xs uppercase font-bold text-muted">Muzlatilgan:</span>
                    <span className="font-mono text-xs sm:text-sm font-black text-ink">
                      {formatMoney(contract.totalAmount, lang)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-ink/90 leading-relaxed font-normal">
                  Pulingiz Bobo-Doda xavfsiz kafolat hisobida muzlatilgan. Mutaxassis (<strong className="font-bold text-ink underline decoration-line decoration-2">{contract.sellerName}</strong>) ishni to&apos;liq bajarib, siz tekshirib tasdiqlamaguningizcha mablag&apos; unga o&apos;tkazilmaydi. Agar ish bajarilmasa yoki sifat talabiga javob bermasa, nizo ochib mablag&apos;ingizni to&apos;liq qaytarib olishingiz kafolatlanadi.
                </p>
                <div className="mt-3.5 pt-3 border-t border-line flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-line text-muted">
                    <span>🔒</span>
                    <span className="text-2xs font-semibold">Kafolat kodi:</span>
                    <strong className="font-mono text-2xs font-bold text-ink">{contract.escrowReference || `ESC-${contract.id.toUpperCase()}`}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-line text-muted">
                    <span>💳</span>
                    <span className="text-2xs font-semibold">To&apos;lov usuli:</span>
                    <strong className="text-2xs font-bold text-ink uppercase">{contract.paymentMethod || "KARTA"}</strong>
                  </div>
                  {contract.fundedAt && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-line text-muted">
                      <span>📅</span>
                      <span className="text-2xs font-semibold">Depozit sanasi:</span>
                      <strong className="text-2xs font-bold text-ink">{formatDate(contract.fundedAt, lang)}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bank to'lovi holat bannerlari */}
        {(contract.paymentStatus === "pending_verification" || contract.b2bPending) && (
          <div className="mt-4 rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-xs border-l-4 border-l-amber-500">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800 text-lg shadow-2xs">
                🏦
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-sm sm:text-base font-black text-ink tracking-tight">
                      BANK TO&apos;LOVI TEKSHIRILMOQDA (PENDING VERIFICATION)
                    </h3>
                    <span className="inline-flex items-center gap-1 text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      ⏳ Tekshiruvda
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface border border-line shadow-2xs">
                    <span className="text-3xs uppercase font-bold text-muted">Summa:</span>
                    <span className="font-mono text-xs sm:text-sm font-black text-ink">
                      {formatMoney(contract.totalAmount, lang)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-ink/90 leading-relaxed font-normal">
                  Bank orqali to&apos;lov topshirig&apos;ingiz qabul qilindi. Operatorlarimiz Kapitalbank hisobimizga mablag&apos; tushishini tasdiqlashi bilan shartnoma faollashadi (odatda 15-60 daqiqa). Shundan so&apos;ng mutaxassis ishga kirishadi.
                </p>
                <div className="mt-3.5 pt-3 border-t border-line flex flex-wrap items-center gap-2 text-xs">
                  {contract.paymentReference && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-line text-muted">
                      <span>🏷️</span>
                      <span className="text-2xs font-semibold">Kod:</span>
                      <strong className="font-mono text-2xs font-bold text-ink">{contract.paymentReference}</strong>
                    </div>
                  )}
                  {(contract.paymentReceiptName || contract.b2bReceiptName) && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-line text-muted">
                      <span>📎</span>
                      <span className="text-2xs font-semibold">Yuklangan chek:</span>
                      <strong className="font-mono text-2xs font-bold text-ink">{contract.paymentReceiptName || contract.b2bReceiptName}</strong>
                    </div>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setFundOpen(true)} className="text-2xs h-7 ml-auto">
                    Rekvizitlar va ma&apos;lumotlar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {contract.paymentStatus === "payment_rejected" && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger text-white font-bold text-sm shadow-sm">
                  ⚠️
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-sm font-bold text-danger">
                      TO&apos;LOV RAD ETILDI (PAYMENT REJECTED)
                    </h3>
                    <Badge tone="danger" className="text-2xs font-bold">Rad etilgan</Badge>
                  </div>
                  <p className="mt-1 text-danger-deep leading-relaxed">
                    Sabab: {contract.paymentRejectReason || "Mablag' bank hisobimizga kelib tushmadi yoki kvitansiya ma'lumotlari mos kelmadi."}
                  </p>
                  <p className="mt-1 text-muted text-2xs">
                    Iltimos, to&apos;lovni qayta tekshirib, to&apos;g&apos;ri chek yoki kvitansiyani qayta yuklang.
                  </p>
                </div>
              </div>
              <Button onClick={() => setFundOpen(true)} className="shrink-0 font-bold bg-danger hover:bg-danger/90 text-white">
                Qayta to&apos;lash / Chek yuklash
              </Button>
            </div>
          </div>
        )}

        {contract.status === "imzolangan" && !contract.b2bPending && contract.paymentStatus !== "pending_verification" && contract.paymentStatus !== "payment_rejected" && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-sm shadow-sm">
                  ⚠️
                </span>
                <div>
                  <h3 className="font-heading text-sm font-bold text-amber-950 dark:text-amber-300">
                    SHARTNOMA KAFOLATLANMAGAN (TO&apos;LOV KUTILMOQDA - AWAITING PAYMENT)
                  </h3>
                  <p className="mt-1 text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                    Mutaxassis ishni boshlashi uchun to&apos;lovni amalga oshiring: O&apos;zbekiston milliy kartalari (Uzcard / Humo) orqali bir zumda avtomatik to&apos;lashingiz yoki xorijdan rasmiy bank hisobimizga o&apos;tkazishingiz mumkin. Mablag&apos; Escrow xavfsizligida saqlanadi.
                  </p>
                </div>
              </div>
              <Button onClick={() => setFundOpen(true)} className="shrink-0 font-bold">
                💳 Shartnomani to&apos;lash
              </Button>
            </div>
          </div>
        )}

        {contract.status === "nizo" && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger text-white font-bold text-sm shadow-sm">
                ⚖️
              </span>
              <div className="flex-1">
                <h3 className="font-heading text-sm font-bold text-danger">
                  NIZO ISHI ARBITRAJDA KO&apos;RIB CHIQILMOQDA
                </h3>
                <p className="mt-1 text-muted leading-relaxed">
                  Ushbu shartnoma bo&apos;yicha nizo ochilgan. Platforma ma&apos;muriyati da&apos;volarni tekshirmoqda. Arbitraj xaridor foydasiga qaror chiqarsa, muzlatilgan Escrow mablag&apos;i to&apos;liq sizning hisob balansingizga qaytariladi va kartangizga yechib olishingiz mumkin bo&apos;ladi.
                </p>
              </div>
            </div>
          </div>
        )}

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
          {/* To'lov qadami FAQAT haqiqatan to'langanda faol ko'rinadi —
              `imzolangan` (hali to'lanmagan) shartnomada ham yashil chizilsa,
              xaridor "to'lov bajarilgan" deb tushunardi. */}
          <div
            className={`flex items-center gap-2 rounded-input border p-2.5 text-xs font-semibold ${
              contract.status === "bekor_qilingan" ||
              contract.status === "imzolangan"
                ? "border-line bg-surface text-muted"
                : "border-primary/30 bg-primary/10 text-primary-deep"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs ${
                contract.status === "bekor_qilingan" ||
                contract.status === "imzolangan"
                  ? "bg-surface text-faint"
                  : "bg-primary text-on-primary"
              }`}
            >
              1
            </span>
            <span className="truncate">{t("pipeline.stageFund")}</span>
          </div>

          <div
            className={`flex items-center gap-2 rounded-input border p-2.5 text-xs font-semibold ${
              contract.status === "faol" ||
              milestones.some((m) => m.status === "topshirildi" || m.status === "qabul_qilindi") ||
              contract.status === "yakunlangan"
                ? "border-primary/30 bg-primary/10 text-primary-deep"
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
                ? "border-primary/30 bg-primary/10 text-primary-deep"
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
                ? "border-primary/30 bg-primary/10 text-primary-deep font-bold"
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
        <DisputeSummary contractId={contract.id} onWithdrawn={reload} />
      )}
      {contract.status === "bekor_qilingan" && (
        <p className="rounded-card border border-line bg-card p-4 text-xs text-muted">
          {t("contract.cancelledNote")}
        </p>
      )}

      {/* Mutaxassis ishni yopishni so'ragan holat */}
      {contract.status === "faol" && contract.closeRequested && (
        <Card padding="md" className="border-2 border-primary/50 bg-primary/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🏁</span>
              <div>
                <h3 className="font-heading text-sm font-bold text-ink">
                  {t("contract.closeBuyerPrompt")}
                </h3>
                {contract.closeRequestNote && (
                  <p className="mt-1.5 text-xs text-muted bg-card/80 p-2.5 rounded-input border border-line">
                    "{contract.closeRequestNote}"
                  </p>
                )}
                <p className="mt-1.5 text-2xs text-muted">
                  Barcha bosqichlar va topshirilgan ishlarni ko'rib chiqing. Tasdiqlasangiz, barcha bosqichlar qabul qilinadi, escrow'dagi to'lov mutaxassisga o'tkaziladi va shartnoma yopiladi.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto">
              <Button
                onClick={() => setApproveCloseOpen(true)}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-bold"
                aria-label="Mutaxassis topshirgan ishlarni qabul qilish va shartnomani yopish"
              >
                ✅ {t("contract.approveClose")}
              </Button>
            </div>
          </div>
        </Card>
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

              {/* Topshirilgan ish natijalari (Havola, fayllar, izoh) */}
              {(milestone.deliverableLink ||
                milestone.deliverableNote ||
                (milestone.deliverableFiles && milestone.deliverableFiles.length > 0)) && (
                <div className="ml-9 flex flex-col gap-2 rounded-input border border-primary/20 bg-surface/80 p-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-ink">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                      aria-hidden="true"
                    >
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    <span>{t("sm.deliverableTitle")}</span>
                  </div>

                  {milestone.deliverableLink && (
                    <div className="flex items-center gap-2">
                      <span className="text-2xs text-muted">{t("sm.link")}:</span>
                      <a
                        href={milestone.deliverableLink.startsWith("http") ? milestone.deliverableLink : `https://${milestone.deliverableLink}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-medium text-primary hover:underline flex items-center gap-1 break-all"
                      >
                        {milestone.deliverableLink}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </div>
                  )}

                  {milestone.deliverableNote && (
                    <p className="text-muted whitespace-pre-line bg-card/60 rounded-btn p-2 border border-line/40">
                      {milestone.deliverableNote}
                    </p>
                  )}

                  {milestone.deliverableFiles && milestone.deliverableFiles.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <span className="text-2xs font-medium text-muted">{t("sm.deliverableFiles")}:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {milestone.deliverableFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 rounded-btn border border-line bg-card p-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-muted shrink-0" aria-hidden="true">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                <polyline points="13 2 13 9 20 9" />
                              </svg>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-ink text-2xs">{file.name}</p>
                                <p className="text-[10px] text-faint">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => triggerFileDownload(file)}
                              className="shrink-0 rounded-btn bg-surface hover:bg-card-hover px-2 py-1 text-[11px] font-medium text-primary border border-line cursor-pointer"
                              title={t("sm.downloadFile")}
                            >
                              {t("sm.downloadFile")}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rasmiy kvitansiya (faqat qabul qilingan bosqichda) */}
              {milestone.status === "qabul_qilindi" && (
                <div className="pl-9">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setReceiptMilestone(milestone)}
                    className="gap-1.5 text-xs text-ink"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    {t("receipt.download")}
                  </Button>
                </div>
              )}

              {/* Holatga mos amallar */}
              {milestone.status === "kutilmoqda" && (
                <p className="pl-9 text-2xs text-faint">
                  {t("cfund.awaitingYourPayment")}
                </p>
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
                    const limit = service?.revisionsIncluded ?? milestone.revisionsIncluded ?? contract.revisionsIncluded ?? 3;
                    const used = milestone.revisionCount ?? 0;
                    const atLimit = used >= limit;
                    return (
                      <>
                        <span className="text-2xs text-faint">
                          {t("bms.revisionsUsed")
                            .replace("{used}", String(used))
                            .replace("{limit}", String(limit))}
                        </span>
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
                          <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning-deep space-y-1.5">
                            <p className="font-bold flex items-center gap-1.5 text-ink">
                              <span>⚠️</span>
                              <span>{t("bms.revisionLimitReached")} ({limit} marta)</span>
                            </p>
                            <p className="text-2xs text-muted leading-relaxed">
                              Mutaxassis ushbu bosqich bo&apos;yicha belgilangan bepul qayta ishlashlar limitini to&apos;liq bajardi. Ishni qabul qiling yoki jiddiy e&apos;tiroz bo&apos;lsa, dalillar bilan Nizo (Arbitraj) qo&apos;mitasiga murojaat qiling.
                            </p>
                            <div className="pt-1">
                              <DisputeControl contractId={contract.id} onOpened={reload} />
                            </div>
                          </div>
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
              const allImages = msg.images && msg.images.length > 0 ? msg.images : (msg.image ? [msg.image] : []);
              const allFiles = msg.files || [];
              return (
                <div
                  key={msg.id}
                  className={`flex max-w-[85%] flex-col gap-1 ${
                    mine ? "items-end self-end" : "items-start self-start"
                  }`}
                >
                  <div
                    className={`flex flex-col gap-2 rounded-card px-3.5 py-2.5 text-sm ${
                      mine
                        ? "rounded-br-[4px] bg-primary text-on-primary"
                        : "rounded-bl-[4px] bg-card-hover text-ink"
                    }`}
                  >
                    {allImages.length > 0 && (
                      <div
                        className={`grid gap-2 ${
                          allImages.length === 1
                            ? "grid-cols-1"
                            : allImages.length === 2
                            ? "grid-cols-2"
                            : "grid-cols-2 sm:grid-cols-3"
                        }`}
                      >
                        {allImages.map((imgUrl, i) => (
                          <a
                            key={i}
                            href={imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative block overflow-hidden rounded-input focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgUrl}
                              alt={t("chat.attachedImage")}
                              className="max-h-48 w-full rounded-input object-cover transition-transform group-hover:scale-105"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {allFiles.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        {allFiles.map((file) => (
                          <button
                            type="button"
                            key={file.id}
                            onClick={() => triggerFileDownload(file)}
                            className={`flex items-center gap-2.5 rounded-input px-3 py-2 text-xs transition-colors text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[40px] ${
                              mine
                                ? "bg-white/15 text-white hover:bg-white/25"
                                : "bg-card border border-line text-ink hover:bg-surface"
                            }`}
                            title={t("sm.downloadFile")}
                            aria-label={`${file.name} (${formatFileSize(file.size)}) — ${t("sm.downloadFile")}`}
                          >
                            <span className="text-base">📎</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium underline">{file.name}</p>
                              <p className={`text-2xs ${mine ? "text-white/80" : "text-muted"}`}>
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <span className="text-xs font-semibold">⬇</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {msg.text && (
                      <span className="whitespace-pre-line break-words">{msg.text}</span>
                    )}
                  </div>
                  <span className="text-2xs text-faint">
                    {mine ? t("chat.you") : contract.sellerName.split(" ")[0]} ·{" "}
                    {formatTime(msg.createdAt, lang)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Biriktirilgan fayllar ko'rinishi (draft preview) */}
        {(draftImages.length > 0 || draftFiles.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface/50 p-2.5">
            {draftImages.map((img, idx) => (
              <div key={idx} className="relative group rounded-md border border-line bg-card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="Preview" className="h-14 w-14 object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveDraftImage(idx)}
                  className="absolute top-0.5 right-0.5 rounded-full bg-black/70 text-white w-4 h-4 flex items-center justify-center text-xs hover:bg-danger transition-colors"
                  aria-label="O'chirish"
                >
                  ×
                </button>
              </div>
            ))}
            {draftFiles.map((file, idx) => (
              <div key={file.id || idx} className="flex items-center gap-2 rounded-md border border-line bg-card px-2.5 py-1.5 text-xs text-ink max-w-xs shadow-xs">
                <span>📎</span>
                <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                <span className="text-2xs text-muted">({formatFileSize(file.size)})</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDraftFile(idx)}
                  className="ml-1 text-muted hover:text-danger font-bold text-sm"
                  aria-label="O'chirish"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {contract.status !== "faol" && contract.status !== "yakunlangan" && (
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-t border-line text-2xs text-muted">
            <span>🛡️</span>
            <span>
              {lang === "ru"
                ? "Безопасная сделка: обмен личными контактами до оплаты контракта ограничен."
                : "Xavfsizlik kafolati: To'lov Escrow hisobiga kiritilgunga qadar shaxsiy kontaktlarni almashish taqiqlanadi."}
            </span>
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="flex items-end gap-2 border-t border-line p-3"
        >
          <ChatFileAttach
            onAddImages={(imgs) => setDraftImages((prev) => [...prev, ...imgs])}
            onAddFiles={(fls) => setDraftFiles((prev) => [...prev, ...fls])}
            attachedCount={draftImages.length + draftFiles.length}
            onError={(message) => toast(message, "error")}
          />
          <div className="flex-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("chat.placeholder")}
              aria-label={t("chat.placeholder")}
              maxLength={5000}
            />
          </div>
          <Button
            type="submit"
            loading={sending}
            disabled={!draft.trim() && draftImages.length === 0 && draftFiles.length === 0}
          >
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

      {/* Ishni qabul qilish va shartnomani yopish modali */}
      <ConfirmDialog
        open={approveCloseOpen}
        title={t("contract.approveClose")}
        description={`Shartnoma bo'yicha topshirilgan barcha ishlarni to'liq qabul qilib, shartnomani yopasizmi? Tasdiqlasangiz, barcha bosqichlar qabul qilinadi, escrow'dagi jami ${contract?.totalAmount.toLocaleString("ru-RU")} so'm mablag' mutaxassisga to'lab beriladi va shartnoma yakunlanadi.`}
        confirmLabel={t("contract.approveClose")}
        cancelLabel={t("common.cancel")}
        variant="primary"
        loading={busy}
        onConfirm={handleApproveClose}
        onCancel={() => setApproveCloseOpen(false)}
      />

      {/* MVP Bank o'tkazmasi orqali to'lov modali */}
      <BankTransferPaymentModal
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        contract={contract}
        onSuccess={reload}
      />

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

      {/* Rasmiy to'lov kvitansiyasi modali */}
      <ReceiptModal
        open={!!receiptMilestone}
        onClose={() => setReceiptMilestone(null)}
        milestone={receiptMilestone}
        contractTitle={contract?.title}
        contractId={contract?.id}
        buyerName={contract?.buyerName}
        sellerName={contract?.sellerName}
      />

      {/* Rasmiy elektron shartnoma hujjati modali */}
      <ContractDocumentModal
        open={documentOpen}
        onClose={() => setDocumentOpen(false)}
        contract={contract}
        milestones={milestones}
        currentUserId={myId}
        onSign={handleSignContract}
        signing={signingContract}
      />

      {/* Rasmiy B2B hisob-faktura (Invoice) modali */}
      <B2BInvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        contract={contract}
        milestones={milestones}
      />

      {/* Platformadan tashqariga chaqirishni ogohlantirish modali */}
      <AntiCircumventionModal
        open={circumventionModalOpen}
        onClose={() => setCircumventionModalOpen(false)}
        result={circumventionResult}
      />
    </div>
  );
}
