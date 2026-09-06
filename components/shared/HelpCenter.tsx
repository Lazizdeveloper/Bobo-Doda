"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { supportService } from "@/lib/api";
import type { SupportReply, SupportTicket, SupportTopic } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

export function HelpCenter() {
  const { t, lang } = useT();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [topic, setTopic] = useState<SupportTopic>("tolov");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  /* Ochilgan chipta va uning support javoblari. Javoblar chipta ochilganda
     yuklanadi — hammasini oldindan olish keraksiz so'rov bo'lardi. */
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [replies, setReplies] = useState<SupportReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    supportService
      .listMine()
      .then(setTickets)
      /* Yuklash xatosi bo'sh ro'yxat EMAS — alohida holat ko'rsatiladi */
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  function toggleTicket(ticketId: string) {
    if (openTicketId === ticketId) {
      setOpenTicketId(null);
      setReplies([]);
      return;
    }
    setOpenTicketId(ticketId);
    setReplies([]);
    setRepliesLoading(true);
    supportService
      .listReplies(ticketId)
      .then(setReplies)
      /* Javoblar yuklanmasa chipta matni baribir ko'rinadi — bu yerda
         alohida xato ekrani ko'rsatish suhbatni butunlay yopib qo'yardi. */
      .catch(() => setReplies([]))
      .finally(() => setRepliesLoading(false));
  }

  async function submit() {
    if (!subject.trim() || message.trim().length < 20) {
      setError(t("help.required"));
      return;
    }
    setSaving(true);
    try {
      const ticket = await supportService.create({ topic, subject, message });
      setTickets((items) => [ticket, ...items]);
      setSubject("");
      setMessage("");
      toast(t("help.sent"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("help.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("help.subtitle")}</p>
      </div>

      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("help.newTicket")}
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          <Select
            label={t("help.topic")}
            value={topic}
            onChange={(event) => setTopic(event.target.value as SupportTopic)}
            options={["tolov", "shartnoma", "nizo", "hisob", "texnik", "boshqa"].map(
              (value) => ({ value, label: t(`help.topic_${value}`) })
            )}
          />
          <Input
            label={t("help.subject")}
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setError("");
            }}
            maxLength={160}
          />
          <Textarea
            label={t("help.message")}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setError("");
            }}
            rows={5}
            maxLength={5000}
            error={error}
          />
          <Button className="self-start" loading={saving} onClick={submit}>
            {t("help.send")}
          </Button>
        </div>
      </Card>

      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : (
        tickets.length > 0 && (
          <section>
            <h2 className="mb-3 font-heading text-base font-bold text-ink">
              {t("help.myTickets")}
            </h2>
            <div className="flex flex-col gap-3">
              {tickets.map((ticket) => {
                const open = openTicketId === ticket.id;
                return (
                  <Card key={ticket.id} className="flex flex-col gap-3">
                    {/* Butun sarlavha bosiladigan — javobni ochish uchun */}
                    <button
                      type="button"
                      onClick={() => toggleTicket(ticket.id)}
                      aria-expanded={open}
                      aria-controls={`ticket-${ticket.id}`}
                      className="flex items-start justify-between gap-4 text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{ticket.subject}</p>
                        <p className="mt-1 text-2xs text-faint">
                          #{ticket.id.slice(-8)} · {formatDate(ticket.createdAt, lang)}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge tone={ticket.status === "yopilgan" ? "neutral" : "primary"}>
                          {t(`help.status_${ticket.status}`)}
                        </Badge>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden="true"
                          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
                        >
                          <path
                            d="m5 8 5 5 5-5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>

                    {open && (
                      <div id={`ticket-${ticket.id}`} className="flex flex-col gap-3">
                        <div className="rounded-input border border-line bg-surface p-3">
                          <p className="text-2xs font-semibold uppercase tracking-wide text-faint">
                            {t("help.yourMessage")}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink">
                            {ticket.message}
                          </p>
                        </div>

                        {repliesLoading ? (
                          <p className="text-2xs text-muted">{t("common.loading")}</p>
                        ) : replies.length === 0 ? (
                          <p className="text-2xs text-muted">{t("help.noReplyYet")}</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <p className="text-2xs font-semibold uppercase tracking-wide text-faint">
                              {t("help.supportReply")}
                            </p>
                            {replies.map((reply, i) => (
                              <div
                                key={`${reply.at}-${i}`}
                                className="rounded-input border border-primary/25 bg-primary/5 p-3"
                              >
                                <div className="flex items-baseline justify-between gap-3">
                                  <span className="text-2xs font-semibold text-primary-deep">
                                    {reply.sender}
                                  </span>
                                  <span className="text-3xs text-faint">
                                    {formatDate(reply.at, lang)}
                                  </span>
                                </div>
                                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink">
                                  {reply.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        )
      )}
    </div>
  );
}
