"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChatImageAttach } from "@/components/ui/ChatImageAttach";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { OfferStatusBadge } from "@/components/shared/StatusBadge";
import { authService, messagesService, offersService } from "@/lib/api";
import type { Message, Offer } from "@/lib/types";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function TaklifTafsilotiXaridorPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const [offer, setOffer] = useState<Offer | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [draftImage, setDraftImage] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    offersService
      .get(params.id)
      .then(async (found) => {
        setOffer(found);
        if (found) {
          setMessages(await messagesService.list(found.id));
          void messagesService.markRead(found.id);
        }
      })
      .catch(setLoadError);
  }, [params.id]);

  useEffect(load, [load]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleWithdraw() {
    if (!offer) return;
    setWithdrawing(true);
    try {
      const updated = await offersService.withdraw(offer.id);
      setOffer(updated);
      toast(t("offer.withdrawn"));
      setWithdrawOpen(false);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if ((!text && !draftImage) || !offer) return;
    setSending(true);
    try {
      const message = await messagesService.send(offer.id, text, draftImage);
      setMessages((prev) => [...prev, message]);
      setDraft("");
      setDraftImage(undefined);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSending(false);
    }
  }

  if (offer === undefined) {
    return loadError ? (
      <ErrorState error={loadError} onRetry={load} />
    ) : (
      <SkeletonCard />
    );
  }
  if (offer === null) return <EmptyState title={t("offer.notFound")} />;

  const myId = authService.getSession()?.userId ?? null;
  const pending = offer.status === "yuborilgan";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {/* Sarlavha */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <OfferStatusBadge status={offer.status} />
          <span className="text-2xs text-faint">
            {formatDate(offer.createdAt, lang)}
          </span>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {offer.title}
        </h1>
      </div>

      {/* Holat eslatmasi */}
      {pending && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-primary/25 bg-primary/5 p-4">
          <p className="text-xs text-muted">{t("offer.waiting")}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWithdrawOpen(true)}
            className="text-danger hover:text-danger"
          >
            {t("offer.withdraw")}
          </Button>
        </div>
      )}
      {offer.status === "bekor_qilingan" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card p-4">
          <p className="text-xs text-muted">{t("offer.withdrawnNote")}</p>
          <Link href="/xaridor/bozor">
            <Button variant="secondary" size="sm">
              {t("offers.emptyCta")}
            </Button>
          </Link>
        </div>
      )}
      {offer.status === "qabul_qilindi" && offer.contractId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-success/25 bg-success/5 p-4">
          <p className="text-xs text-muted">{t("offer.acceptedNote")}</p>
          <Link href={`/xaridor/shartnomalar/${offer.contractId}`}>
            <Button size="sm">{t("props.openContract")}</Button>
          </Link>
        </div>
      )}
      {offer.status === "rad_etildi" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card p-4">
          <p className="text-xs text-muted">{t("offer.declinedNote")}</p>
          <Link href="/xaridor/bozor">
            <Button variant="secondary" size="sm">
              {t("offers.emptyCta")}
            </Button>
          </Link>
        </div>
      )}

      {/* Taklif ma'lumotlari */}
      <Card padding="lg" className="flex flex-col gap-4">
        <Link
          href={`/xaridor/bozor/mutaxassis/${offer.sellerId}`}
          className="group flex items-center gap-3"
        >
          <Avatar name={offer.sellerName} />
          <div>
            <p className="text-sm font-medium text-ink transition-colors duration-150 group-hover:text-primary">
              {offer.sellerName}
            </p>
            <p className="text-2xs text-faint">{t("market.viewProfile")} →</p>
          </div>
        </Link>
        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-xs text-muted">{t("soffer.budget")}</span>
          <span className="font-heading text-lg font-bold text-ink">
            {formatMoney(offer.budget, lang)}
          </span>
        </div>
      </Card>

      {/* Muloqot — taklif qabul qilingach shartnoma chatiga ko'chadi */}
      {pending && (
        <Card padding="none" className="flex flex-col">
          <h2 className="border-b border-line px-4 py-3 font-heading text-sm font-bold text-ink">
            {t("chat.title")}
          </h2>
          <div className="flex max-h-96 min-h-40 flex-1 flex-col gap-3 overflow-y-auto p-4">
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
                      {mine ? t("chat.you") : offer.sellerName.split(" ")[0]} ·{" "}
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-line p-3">
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
      )}

      {/* Bekor qilish modali */}
      <ConfirmDialog
        open={withdrawOpen}
        title={t("offer.withdrawTitle")}
        description={t("offer.withdrawDesc")}
        confirmLabel={t("offer.withdraw")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={withdrawing}
        onConfirm={handleWithdraw}
        onCancel={() => setWithdrawOpen(false)}
      />
    </div>
  );
}
