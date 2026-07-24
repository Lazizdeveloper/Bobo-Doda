"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { createOffer } from "@/lib/mock-api";
import type { Service } from "@/lib/types";
import { useT } from "@/lib/i18n";

export interface OfferModalProps {
  open: boolean;
  onClose: () => void;
  sellerId: string;
  /** xizmat sahifasidan ochilsa — mavzu va byudjet oldindan to'ladi */
  service?: Service;
}

/** To'lovsiz taklif yuborish modali (xizmat yoki mutaxassis profili sahifasidan) */
export function OfferModal({ open, onClose, sellerId, service }: OfferModalProps) {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();

  const [subject, setSubject] = useState(service?.title ?? "");
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState(service ? String(service.price) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const next: Record<string, string> = {};
    if (!service && !subject.trim()) next.subject = t("offer.errSubject");
    if (!message.trim()) next.message = t("offer.errMessage");
    if (!budget || Number(budget) <= 0) next.budget = t("wizard.errPrice");
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    try {
      const offer = await createOffer({
        sellerId,
        serviceId: service?.id,
        title: service?.title ?? subject,
        message,
        budget: Number(budget),
      });
      toast(t("offer.sent"));
      router.push(`/xaridor/takliflarim/${offer.id}`);
    } catch (err) {
      if (err instanceof Error && err.message === "DUPLICATE_OFFER") {
        toast(t("offer.duplicate"), "error");
      } else {
        toast(t("common.error"), "error");
      }
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("offer.modalTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            {t("common.cancel")}
          </Button>
          <Button loading={sending} onClick={handleSend}>
            {t("offer.send")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {service ? (
          <p className="rounded-input border border-line bg-bg p-3 text-xs">
            <span className="font-medium text-ink">{service.title}</span>
          </p>
        ) : (
          <Input
            label={t("offer.subject")}
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setErrors((prev) => ({ ...prev, subject: "" }));
            }}
            placeholder={t("offer.subjectPh")}
            error={errors.subject}
            maxLength={200}
          />
        )}
        <Textarea
          label={t("offer.message")}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setErrors((prev) => ({ ...prev, message: "" }));
          }}
          placeholder={t("offer.messagePh")}
          rows={5}
          error={errors.message}
          maxLength={5000}
        />
        <Input
          type="number"
          min={0}
          label={t("offer.budget")}
          value={budget}
          onChange={(e) => {
            setBudget(e.target.value);
            setErrors((prev) => ({ ...prev, budget: "" }));
          }}
          error={errors.budget}
        />
        <p className="rounded-input border border-accent/25 bg-accent/5 p-3 text-2xs text-muted">
          {t("offer.budgetHint")}
        </p>
      </div>
    </Modal>
  );
}
