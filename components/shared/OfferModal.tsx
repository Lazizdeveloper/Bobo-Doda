"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { offersService } from "@/lib/api";
import type { Service } from "@/lib/types";
import { useT } from "@/lib/i18n";

export interface OfferModalProps {
  open: boolean;
  onClose: () => void;
  sellerId: string;
  /** xizmat sahifasidan ochilsa — mavzu va byudjet oldindan to'ladi */
  service?: Service;
  /** Tanlangan ixtiyoriy qo'shimchalar bilan hisoblangan boshlang'ich byudjet
      (service.price o'rniga) — masalan bazaviy narx + tanlangan extras */
  initialBudget?: number;
  /** Tanlangan qo'shimchalar ro'yxati */
  selectedExtras?: { label: string; price: number }[];
  /** "offer" (default) yoki "message" (to'g'ridan-to'g'ri xabar/suhbat boshlash) */
  mode?: "offer" | "message";
}

/** To'lovsiz taklif yoki xabar yuborish modali (xizmat yoki mutaxassis profili sahifasidan) */
export function OfferModal({
  open,
  onClose,
  sellerId,
  service,
  initialBudget,
  selectedExtras,
  mode = "offer",
}: OfferModalProps) {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();

  const [subject, setSubject] = useState(service?.title ?? "");
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState(
    initialBudget !== undefined
      ? String(initialBudget)
      : service
      ? String(service.price)
      : mode === "message"
      ? ""
      : ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  /* Modal har safar ochilganda joriy narxni (masalan tanlangan extras bilan)
     qayta o'qiydi — komponent doim mount holida turgani uchun oddiy useState
     boshlang'ich qiymati faqat birinchi ochilishda ishlaydi. */
  useEffect(() => {
    if (!open) return;
    setBudget(
      initialBudget !== undefined
        ? String(initialBudget)
        : service
        ? String(service.price)
        : ""
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSend() {
    const next: Record<string, string> = {};
    if (!service && mode === "offer" && !subject.trim()) {
      next.subject = t("offer.errSubject");
    }
    if (!message.trim()) {
      next.message = t("offer.errMessage");
    }
    if (mode === "offer" && (!budget || Number(budget) <= 0)) {
      next.budget = t("wizard.errPrice");
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    try {
      let finalMessage = message.trim();
      if (selectedExtras && selectedExtras.length > 0) {
        finalMessage +=
          `\n\n📌 Tanlangan qo'shimcha xizmatlar:\n` +
          selectedExtras.map((e) => `• ${e.label}`).join("\n");
      }
      const finalSubject =
        service?.title ||
        subject.trim() ||
        (mode === "message" ? "Loyiha bo'yicha muloqot" : "Yangi taklif");
      const finalBudget = Number(budget) > 0 ? Number(budget) : 50_000;

      const offer = await offersService.create({
        sellerId,
        serviceId: service?.id,
        title: finalSubject,
        message: finalMessage,
        budget: finalBudget,
      });
      toast(mode === "message" ? "Xabaringiz mutaxassisga yuborildi!" : t("offer.sent"));
      onClose();
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
      title={mode === "message" ? t("market.sendMessageBtn") : t("offer.modalTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            {t("common.cancel")}
          </Button>
          <Button loading={sending} onClick={handleSend}>
            {mode === "message" ? t("market.sendMessageBtn") : t("offer.send")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {service ? (
          <div className="flex flex-col gap-2 rounded-input border border-line bg-surface p-3 text-xs">
            <span className="font-semibold text-ink">{service.title}</span>
            {selectedExtras && selectedExtras.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-line/60">
                {selectedExtras.map((ex, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-2xs font-medium text-primary"
                  >
                    + {ex.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Input
            label={t("offer.subject")}
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setErrors((prev) => ({ ...prev, subject: "" }));
            }}
            placeholder={
              mode === "message"
                ? "Loyiha yoki mavzu nomi (ixtiyoriy)"
                : t("offer.subjectPh")
            }
            error={errors.subject}
            maxLength={200}
          />
        )}
        <Textarea
          label={mode === "message" ? "Xabar matni" : t("offer.message")}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setErrors((prev) => ({ ...prev, message: "" }));
          }}
          placeholder={
            mode === "message"
              ? "Mutaxassisga savolingiz yoki loyiha tafsilotlarini yozing..."
              : t("offer.messagePh")
          }
          rows={5}
          error={errors.message}
          maxLength={5000}
        />
        <Input
          type="number"
          min={0}
          label={
            mode === "message"
              ? "Mo'ljallangan byudjet (so'm, ixtiyoriy)"
              : t("offer.budget")
          }
          value={budget}
          onChange={(e) => {
            setBudget(e.target.value);
            setErrors((prev) => ({ ...prev, budget: "" }));
          }}
          placeholder={mode === "message" ? "Masalan: 500000 (ixtiyoriy)" : undefined}
          error={errors.budget}
        />
        <p className="rounded-input border border-accent/25 bg-accent/5 p-3 text-2xs text-muted">
          {mode === "message"
            ? "Xabar yuborilgach, mutaxassis bilan to'g'ridan-to'g'ri suhbat xonasi ochiladi."
            : t("offer.budgetHint")}
        </p>
      </div>
    </Modal>
  );
}
