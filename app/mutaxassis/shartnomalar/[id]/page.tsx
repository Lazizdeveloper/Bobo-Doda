"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
import { MilestoneItem } from "@/components/shared/MilestoneItem";
import { MilestoneProgress } from "@/components/shared/MilestoneProgress";
import { DisputeControl } from "@/components/shared/DisputeControl";
import { DisputeSummary } from "@/components/shared/DisputeSummary";
import { ContractStatusBadge } from "@/components/shared/StatusBadge";
import { ReceiptModal } from "@/components/shared/ReceiptModal";
import { ContractDocumentModal } from "@/components/shared/ContractDocumentModal";
import { AntiCircumventionModal } from "@/components/shared/AntiCircumventionModal";
import { checkCircumvention, reportCircumventionViolation, type CircumventionCheckResult } from "@/lib/chat-filter";
import { authService, contractsService, filesService, messagesService, milestonesService, reviewsService, servicesService, DATA_CHANGED_EVENT } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENTS } from "@/lib/attachments";
import type { Contract, DeliverableFile, Message, Milestone, Review, Service } from "@/lib/types";
import { formatDate, formatFileSize, formatMoney, formatTime, triggerFileDownload } from "@/lib/format";
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
  const [deliverableFiles, setDeliverableFiles] = useState<DeliverableFile[]>([]);
  const [filesUploading, setFilesUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [isAgreed, setIsAgreed] = useState(true);
  const [linkError, setLinkError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receiptMilestone, setReceiptMilestone] = useState<Milestone | null>(null);

  /* Bekor qilish */
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  /* Ishni yopish */
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [closingContract, setClosingContract] = useState(false);

  /* Rasmiy shartnoma hujjati va imzolash */
  const [documentOpen, setDocumentOpen] = useState(false);
  const [signingContract, setSigningContract] = useState(false);
  const [circumventionResult, setCircumventionResult] = useState<CircumventionCheckResult | null>(null);
  const [circumventionModalOpen, setCircumventionModalOpen] = useState(false);

  /* Chat */
  const [draft, setDraft] = useState("");
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [draftFiles, setDraftFiles] = useState<DeliverableFile[]>([]);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const loadVersionRef = useRef(0);
  const [loadError, setLoadError] = useState<unknown>(null);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function reload() {
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
      /* Yuklash xatosi "topilmadi" EMAS — aks holda tarmoq uzilishi yoki
         sessiya tugashi ham "Shartnoma topilmadi" bo'lib ko'rinardi va
         foydalanuvchi ma'lumot o'chgan deb o'ylardi. */
      if (version === loadVersionRef.current) setLoadError(error);
    }
  }

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

  function openSubmitModal(milestone: Milestone) {
    setSubmitTarget(milestone);
    setWorkLink(milestone.deliverableLink || "");
    setWorkNote(milestone.deliverableNote || "");
    setDeliverableFiles(milestone.deliverableFiles ? [...milestone.deliverableFiles] : []);
    setIsAgreed(true);
    setLinkError("");
    setFileError("");
  }

  /* Fayl API chegarasidan o'tadi (`filesService.upload`) — u turni va
     hajmni tekshiradi hamda SAQLANADIGAN havola qaytaradi. */
  async function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;

    const room = MAX_ATTACHMENTS - deliverableFiles.length;
    const accepted = picked.slice(0, Math.max(0, room));
    setFileError(picked.length > accepted.length ? t("upload.tooMany") : "");
    if (accepted.length === 0) return;

    setFilesUploading(true);
    const uploaded: DeliverableFile[] = [];
    let problem = "";
    for (const file of accepted) {
      try {
        uploaded.push(await filesService.upload(file));
      } catch (error) {
        const code = error instanceof ApiError ? error.message : "";
        problem =
          code === "FILE_TOO_LARGE" ? t("upload.tooLarge") : t("upload.rejected");
      }
    }
    if (uploaded.length > 0) {
      setDeliverableFiles((prev) => [...prev, ...uploaded].slice(0, MAX_ATTACHMENTS));
      setLinkError("");
    }
    if (problem) setFileError(problem);
    setFilesUploading(false);
  }

  function handleRemoveFile(index: number) {
    setDeliverableFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitWork(e: FormEvent) {
    e.preventDefault();
    if (!submitTarget || !contract) return;
    if (!workLink.trim() && deliverableFiles.length === 0) {
      setLinkError(t("sm.errLink"));
      return;
    }
    setSubmitting(true);
    try {
      /* Topshirish — asosiy amal. U muvaffaqiyatli bo'lsa, modal yopiladi va
         holat yangilanadi. Deliverable link, izoh va biriktirilgan fayllar saqlanadi. */
      await milestonesService.submit(submitTarget.id, {
        link: workLink.trim(),
        note: workNote.trim(),
        files: deliverableFiles,
      });
      setMilestones(await milestonesService.list(contract.id));
      toast(t("sm.done"));
      setSubmitTarget(null);
    } catch (err) {
      const isFull =
        err instanceof Error &&
        (err.message === "STORAGE_FULL" || err.message.includes("quota"));
      toast(isFull ? t("err.storageFull") : t("common.error"), "error");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);

    /* Havola/izoh chatga yozilishi va fayllar biriktirilishi */
    try {
      const chatText = `📦 ${t("sm.chatSubmitted")}: "${submitTarget.title}"\n${workNote.trim() ? `${workNote.trim()}\n` : ""}${workLink.trim() ? `${workLink.trim()}` : ""}`.trim();
      const message = await messagesService.send(
        contract.id,
        chatText,
        undefined,
        deliverableFiles.length > 0 ? { files: deliverableFiles } : undefined
      );
      setMessages((prev) => [...prev, message]);
    } catch (err) {
      const isFull =
        err instanceof Error &&
        (err.message === "STORAGE_FULL" || err.message.includes("quota"));
      toast(isFull ? t("err.storageFull") : t("sm.chatFailed"), "error");
    }
  }

  async function handleRequestCloseContract() {
    if (!contract) return;
    setClosingContract(true);
    try {
      await contractsService.requestClose(contract.id, closeNote);
      toast(t("contract.closeRequested"));
      setCloseModalOpen(false);
      setCloseNote("");
      reload();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setClosingContract(false);
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
    const hasAttachments = draftImages.length > 0 || draftFiles.length > 0;
    if ((!text && !hasAttachments) || !contract) return;

    // To'lov amalga oshirilmagan bo'lsa platformadan tashqi kontaktlar taqiqlanadi
    if (contract.status !== "faol" && contract.status !== "yakunlangan") {
      const check = checkCircumvention(text);
      if (check.hasViolation) {
        setCircumventionResult(check);
        setCircumventionModalOpen(true);
        reportCircumventionViolation({
          senderId: contract.sellerId,
          senderName: contract.sellerName,
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
  /* Imzolangan yoki faol shartnomani bekor qilish mumkin; tekshiruvdagi ish
     bo'lsa bloklanadi */
  const canCancel =
    (contract.status === "faol" || contract.status === "imzolangan") &&
    milestones.every(
      (m) => m.status !== "topshirildi" && m.status !== "ozgartirish_soraldi"
    );

  const canSubmitActiveMilestone =
    contract.status === "faol"
      ? milestones.find(
          (m) => m.status === "mablaglangan" || m.status === "ozgartirish_soraldi"
        ) || null
      : null;

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
                {contract.contractNumber && (
                  <Badge tone="neutral" className="font-mono">
                    {contract.contractNumber}
                  </Badge>
                )}
                {contract.sellerAcceptedAt && (
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
            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDocumentOpen(true)}
                className="gap-1.5 font-medium"
              >
                📄 {t("contract.viewDocument")}
              </Button>
              {contract.status === "faol" && !contract.closeRequested && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCloseModalOpen(true)}
                  className="shadow-sm font-bold border-primary/40 text-primary hover:bg-primary/10 min-h-[38px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label="Shartnomani yakunlash va ishni yopish so'rovi"
                >
                  🏁 {t("contract.closeAction")}
                </Button>
              )}
              {contract.status === "faol" && contract.closeRequested && (
                <Badge tone="warning" className="py-1 px-2.5 text-xs font-semibold">
                  ⏳ {t("contract.closeRequested")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Shartnomani elektron imzolash banneri (agar mutaxassis hali imzolamagan bo'lsa va faol bo'lmasa) */}
        {!contract.sellerAcceptedAt && contract.status !== "faol" && contract.status !== "yakunlangan" && contract.status !== "bekor_qilingan" && (
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

        {/* ESCROW TO'LOV KAFOLATI BLOKI — Mutaxassis uchun shaffof ko'rinish */}
        {contract.status === "faol" && (
          <div className="mt-4 rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-xs border-l-4 border-l-emerald-500">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 text-lg shadow-2xs">
                🛡️
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <h3 className="font-heading text-xs sm:text-base font-black text-ink tracking-tight break-words">
                      TO&apos;LOV KAFOLATLANGAN (BOBO-DODA ESCROW)
                    </h3>
                    <span className="inline-flex items-center gap-1 text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                      ✓ Muzlatilgan
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface border border-line shadow-2xs">
                    <span className="text-3xs uppercase font-bold text-muted">Kafolatlangan:</span>
                    <span className="font-mono text-xs sm:text-sm font-black text-ink">
                      {formatMoney(contract.totalAmount, lang)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-ink/90 leading-relaxed font-normal">
                  Xaridor (<strong className="font-bold text-ink underline decoration-line decoration-2">{contract.buyerName}</strong>) ushbu ish uchun mablag&apos;ni Bobo-Doda kafolat hisob raqamiga to&apos;liq o&apos;tkazgan va summa xavfsiz muzlatilgan. Ishni bexavotir va xotirjam topshirishingiz mumkin. Ish tasdiqlangach, mablag&apos; avtomatik balansingizga o&apos;tadi.
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
                      <span className="text-2xs font-semibold">Depozit vaqti:</span>
                      <strong className="text-2xs font-bold text-ink">{formatDate(contract.fundedAt, lang)}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bank to'lovi holati (Mutaxassis uchun) */}
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
                      XARIDORNING BANK TO&apos;LOVI TEKSHIRILMOQDA (PENDING VERIFICATION)
                    </h3>
                    <span className="inline-flex items-center gap-1 text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      ⏳ Tekshiruvda
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface border border-line shadow-2xs">
                    <span className="text-3xs uppercase font-bold text-muted">Kutilmoqda:</span>
                    <span className="font-mono text-xs sm:text-sm font-black text-ink">
                      {formatMoney(contract.totalAmount, lang)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-ink/90 leading-relaxed font-normal">
                  Xaridor (<strong className="font-bold text-ink underline decoration-line decoration-2">{contract.buyerName}</strong>) bank o&apos;tkazmasi orqali to&apos;lov topshirig&apos;ini yuborgan. Operatorlarimiz bank hisob raqamimizga mablag&apos; tushishini tekshirmoqda (odatda 15-60 daqiqa). Pul hisobga kelib tushib, tasdiqlangach shartnoma faollashadi va sizga darhol xabarnoma yuboriladi.
                </p>
                {(contract.paymentReceiptName || contract.b2bReceiptName) && (
                  <div className="mt-3.5 pt-3 border-t border-line flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-line text-muted">
                      <span>📎</span>
                      <span className="text-2xs font-semibold">Yuklangan kvitansiya:</span>
                      <strong className="font-mono text-2xs font-bold text-ink">{contract.paymentReceiptName || contract.b2bReceiptName}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {contract.paymentStatus === "payment_rejected" && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger text-white font-bold text-sm shadow-sm">
                ⚠️
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-heading text-sm font-bold text-danger">
                    XARIDORNING TO&apos;LOVI RAD ETILDI (PAYMENT REJECTED)
                  </h3>
                  <Badge tone="danger" className="text-xs font-bold">
                    Rad etildi
                  </Badge>
                </div>
                <p className="mt-1 text-danger-deep leading-relaxed">
                  Xaridor yuborgan to&apos;lov bank hisobiga tushmagan yoki rad etilgan. Xaridorga qayta to&apos;lash so&apos;rovi yuborilgan. To&apos;lov tasdiqlanmaguncha ishni boshlamang.
                </p>
              </div>
            </div>
          </div>
        )}

        {contract.status === "imzolangan" && !contract.b2bPending && contract.paymentStatus !== "pending_verification" && contract.paymentStatus !== "payment_rejected" && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-sm shadow-sm">
                ⚠️
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-heading text-sm font-bold text-amber-950 dark:text-amber-300">
                    DIQQAT: XARIDOR HALI TO&apos;LOVNI AMALGA OSHIRMAGAN (AWAITING PAYMENT)
                  </h3>
                  <Badge tone="warning" className="text-xs font-bold">
                    To&apos;lov kutilmoqda
                  </Badge>
                </div>
                <p className="mt-1 text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  Ushbu shartnoma tomonlar o&apos;rtasida tuzilgan, ammo xaridor hali Bobo-Doda bank kafolat hisobiga to&apos;lovni o&apos;tkazmagan. Qoidalarimizga ko&apos;ra, to&apos;lov platforma kafolat hisobida muzlatilmaguncha ishni topshirmang va ehtiyot bo&apos;ling. Xaridor to&apos;lovni amalga oshirgach, sizga bildirishnoma yuboriladi.
                </p>
              </div>
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-heading text-sm font-bold text-danger">
                    NIZO HOLATI (ARBITRAJ KO&apos;RIB CHIQMOQDA)
                  </h3>
                  <Badge tone="danger" className="text-xs font-bold">
                    Arbitrajda
                  </Badge>
                </div>
                <p className="mt-1 text-muted leading-relaxed">
                  Ushbu shartnoma bo&apos;yicha nizo ochilgan. Muzlatilgan Escrow mablag&apos;i platforma ma&apos;muriyati tomonidan taqdim etilgan dalillar va ish natijasi asosida adolatli ko&apos;rib chiqilmoqda. Qaror qabul qilinishi bilan ikkala tarafga ham xabar beriladi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Faol shartnomani topshirish yoki kutish holati tushuntirishi */}
        {contract.status === "faol" && (
          <div className="mt-4 rounded-card border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">💡</span>
              <span>
                {contract.closeRequested
                  ? t("contract.closeRequested")
                  : canSubmitActiveMilestone
                  ? `Hozir topshirish mumkin bo'lgan bosqich: "${canSubmitActiveMilestone.title}". Ishni topshirish uchun quyidagi bosqich kartochkasidagi 'Ishni topshirish' tugmasidan foydalaning.`
                  : "Barcha ishlar topshirildi. Ishni to'liq yakunlash uchun yuqoridagi 'Ishni yopish' tugmasini bosing."}
              </span>
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
        <DisputeSummary contractId={contract.id} onWithdrawn={reload} />
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
              onViewReceipt={(m) => setReceiptMilestone(m)}
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
                    {mine ? t("chat.you") : contract.buyerName.split(" ")[0]} ·{" "}
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
                ? "Безопасная сделка: передача контактов до оплаты контракта запрещена правилами платформы."
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
              disabled={
                (!workLink.trim() && deliverableFiles.length === 0) ||
                !isAgreed ||
                filesUploading
              }
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

          {/* Fayllar yuklash (Upwork-style drag & drop / picker) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted">
                {t("sm.files")}
              </label>
              <span className="text-[11px] text-faint">{t("sm.filesHint")}</span>
            </div>

            <label
              htmlFor="deliverable-file-input"
              className="flex flex-col items-center justify-center gap-2 rounded-input border-2 border-dashed border-line p-4 text-center cursor-pointer transition hover:border-primary/50 hover:bg-surface"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-xs font-semibold text-primary">
                {t("sm.filesUpload")}
              </span>
              <span className="text-[11px] text-faint">
                {t("sm.filesTypes")}
              </span>
              <input
                id="deliverable-file-input"
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                className="sr-only"
                onChange={handleAddFiles}
                disabled={
                  submitting ||
                  filesUploading ||
                  deliverableFiles.length >= MAX_ATTACHMENTS
                }
              />
            </label>

            {filesUploading && (
              <p className="text-[11px] text-muted">{t("sm.filesUploading")}</p>
            )}
            {fileError && (
              <p className="text-[11px] font-medium text-danger" role="alert">
                {fileError}
              </p>
            )}

            {/* Yuklangan fayllar ro'yxati */}
            {deliverableFiles.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {deliverableFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-input border border-line bg-surface p-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-muted shrink-0" aria-hidden="true">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                        <polyline points="13 2 13 9 20 9" />
                      </svg>
                      <span className="truncate font-medium text-ink">{file.name}</span>
                      <span className="shrink-0 text-2xs text-faint">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      disabled={submitting}
                      className="text-faint hover:text-danger ml-2 p-1"
                      aria-label="Faylni o'chirish"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasdiqlovchi checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer pt-1 text-xs text-muted select-none">
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="mt-0.5 rounded border-line text-primary focus:ring-primary h-4 w-4"
            />
            <span>{t("sm.confirmComplete")}</span>
          </label>
        </form>
      </Modal>

      {/* Ishni yopish (shartnomani yakunlash) modali */}
      <Modal
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title={t("contract.closeTitle")}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCloseModalOpen(false)}
              disabled={closingContract}
            >
              {t("common.cancel")}
            </Button>
            <Button
              loading={closingContract}
              onClick={handleRequestCloseContract}
            >
              {t("contract.closeAction")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-input border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted">
            <p className="font-semibold text-ink mb-1.5 flex items-center gap-1.5">
              <span>🏁</span> {t("contract.closeTitle")}
            </p>
            <p className="mb-2.5">{t("contract.closeDesc")}</p>
            <div className="space-y-1.5 text-2xs text-ink/85 border-t border-primary/15 pt-2">
              <p className="flex items-center gap-2">
                <span className="text-success font-bold text-xs">✓</span> Barcha bosqichlar to'liq topshirilgan deb belgilanadi
              </p>
              <p className="flex items-center gap-2">
                <span className="text-success font-bold text-xs">✓</span> Escrow'dagi to'lov balansingizga o'tkaziladi
              </p>
              <p className="flex items-center gap-2">
                <span className="text-success font-bold text-xs">✓</span> Shartnoma rasman yopiladi va tomonlar sharh qoldiradi
              </p>
            </div>
          </div>

          <Textarea
            label={t("contract.closeNote")}
            value={closeNote}
            onChange={(e) => setCloseNote(e.target.value)}
            placeholder="Masalan: Barcha ishlar to'liq va sifatli bajarildi, barcha natijalar taqdim etildi."
            rows={3}
          />

          <p className="text-2xs text-faint">
            * Ishni yopish so'rovi yuborilgach, buyurtmachi tasdiqlashi bilan shartnoma yakunlanadi va to'lov balansingizga o'tadi.
          </p>
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

      {/* Platformadan tashqariga chaqirishni ogohlantirish modali */}
      <AntiCircumventionModal
        open={circumventionModalOpen}
        onClose={() => setCircumventionModalOpen(false)}
        result={circumventionResult}
      />
    </div>
  );
}
