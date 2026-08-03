"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { createSupportTicket, getSupportTickets } from "@/lib/api";
import type { SupportTicket, SupportTopic } from "@/lib/types";
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

  useEffect(() => {
    getSupportTickets().then(setTickets);
  }, []);

  async function submit() {
    if (!subject.trim() || message.trim().length < 20) {
      setError(t("help.required"));
      return;
    }
    setSaving(true);
    try {
      const ticket = await createSupportTicket({ topic, subject, message });
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

      <div className="grid gap-3 sm:grid-cols-3">
        {["payment", "contract", "security"].map((item) => (
          <Card key={item}>
            <h2 className="text-sm font-semibold text-ink">
              {t(`help.${item}Title`)}
            </h2>
            <p className="mt-1 text-xs text-muted">{t(`help.${item}Desc`)}</p>
          </Card>
        ))}
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

      {tickets.length > 0 && (
        <section>
          <h2 className="mb-3 font-heading text-base font-bold text-ink">
            {t("help.myTickets")}
          </h2>
          <div className="flex flex-col gap-3">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-ink">{ticket.subject}</p>
                  <p className="mt-1 text-2xs text-faint">
                    #{ticket.id.slice(-8)} · {formatDate(ticket.createdAt, lang)}
                  </p>
                </div>
                <Badge tone={ticket.status === "yopilgan" ? "neutral" : "primary"}>
                  {t(`help.status_${ticket.status}`)}
                </Badge>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
