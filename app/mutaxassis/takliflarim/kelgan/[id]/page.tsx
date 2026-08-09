"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { OfferStatusBadge } from "@/components/shared/StatusBadge";
import { authService, messagesService, offersService, servicesService } from "@/lib/api";
import type { Message, Offer, Service } from "@/lib/types";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function KelganTaklifPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [offer, setOffer] = useState<Offer | null | undefined>(undefined);
  const [service, setService] = useState<Service | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    offersService
      .get(params.id)
      .then((found) => {
        setOffer(found);
        if (found) {
          return Promise.all([
            messagesService.list(found.id),
            found.serviceId ? servicesService.get(found.serviceId) : Promise.resolve(null),
          ]).then(([msgs, svc]) => {
            setMessages(msgs);
            setService(svc);
          });
        }
      })
      .catch(setLoadError);
  }, [params.id]);

  useEffect(load, [load]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleAccept() {
    if (!offer) return;
    setBusy(true);
    try {
      const contract = await offersService.accept(offer.id);
      toast(t("soffer.accepted"));
      router.push(`/mutaxassis/shartnomalar/${contract.id}`);
    } catch {
      toast(t("common.error"), "error");
      setBusy(false);
    }
  }

  async function handleDecline() {
    if (!offer) return;
    setBusy(true);
    try {
      const updated = await offersService.decline(offer.id);
      setOffer(updated);
      toast(t("bprop.rejected"));
      setDeclineOpen(false);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !offer) return;
    setSending(true);
    try {
      const message = await messagesService.send(offer.id, text);
      setMessages((prev) => [...prev, message]);
      setDraft("");
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSending(false);
    }
  }

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;
  if (offer === undefined) return <SkeletonCard />;
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

      {offer.status === "qabul_qilindi" && offer.contractId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-success/25 bg-success/5 p-4">
          <p className="text-xs text-muted">{t("soffer.accepted")}</p>
          <Link href={`/mutaxassis/shartnomalar/${offer.contractId}`}>
            <Button size="sm">{t("props.openContract")}</Button>
          </Link>
        </div>
      )}

      {/* Taklif ma'lumotlari */}
      <Card padding="lg" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={offer.buyerName} />
            <div>
              <p className="text-2xs font-medium uppercase tracking-wide text-faint">
                {t("soffer.aboutBuyer")}
              </p>
              <p className="mt-0.5 text-sm font-medium text-ink">
                {offer.buyerName}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xs font-medium uppercase tracking-wide text-faint">
              {t("soffer.budget")}
            </p>
            <p className="mt-0.5 font-heading text-lg font-bold text-ink">
              {formatMoney(offer.budget, lang)}
            </p>
          </div>
        </div>

        {service && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Badge tone="primary">{t("soffer.fromService")}</Badge>
            <span className="text-xs text-muted">{service.title}</span>
          </div>
        )}

        <div className="border-t border-line pt-4">
          <p className="text-2xs font-medium uppercase tracking-wide text-faint">
            {t("offer.message")}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
            {offer.message}
          </p>
        </div>

        {pending && (
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setDeclineOpen(true)}
              className="text-danger hover:text-danger"
            >
              {t("bprop.reject")}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => setAcceptOpen(true)}>
              {t("soffer.accept")}
            </Button>
          </div>
        )}
      </Card>

      {/* Muloqot — qabul qilingach shartnoma chatiga ko'chadi */}
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
                      className={`whitespace-pre-line break-words rounded-card px-3 py-2 text-sm ${
                        mine
                          ? "rounded-br-[4px] bg-primary text-on-primary"
                          : "rounded-bl-[4px] bg-card-hover text-ink"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-2xs text-faint">
                      {mine ? t("chat.you") : offer.buyerName.split(" ")[0]} ·{" "}
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2 border-t border-line p-3">
            <div className="flex-1">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("chat.placeholder")}
                aria-label={t("chat.placeholder")}
                maxLength={5000}
              />
            </div>
            <Button type="submit" loading={sending} disabled={!draft.trim()}>
              {t("chat.send")}
            </Button>
          </form>
        </Card>
      )}

      {/* Qabul qilish modali */}
      <ConfirmDialog
        open={acceptOpen}
        title={t("soffer.acceptTitle")}
        description={
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-input border border-line bg-surface p-3">
              <span className="text-xs text-muted">{offer.title}</span>
              <span className="font-heading text-base font-bold text-ink">
                {formatMoney(offer.budget, lang)}
              </span>
            </div>
            <p>{t("soffer.acceptDesc")}</p>
          </div>
        }
        confirmLabel={t("soffer.accept")}
        cancelLabel={t("common.cancel")}
        loading={busy}
        onConfirm={handleAccept}
        onCancel={() => setAcceptOpen(false)}
      />

      {/* Rad etish */}
      <ConfirmDialog
        open={declineOpen}
        title={t("soffer.declineTitle")}
        description={t("soffer.declineDesc")}
        confirmLabel={t("bprop.reject")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={busy}
        onConfirm={handleDecline}
        onCancel={() => setDeclineOpen(false)}
      />
    </div>
  );
}
