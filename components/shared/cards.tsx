"use client";

import { useState, type ReactNode } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { addCard, removeCard } from "@/lib/api";
import type { CardType, PaymentCard } from "@/lib/types";
import { detectCardType } from "@/lib/validate";
import { useT } from "@/lib/i18n";

/** Karta raqamini "8600 1234 5678 9012" ko'rinishida guruhlaydi */
function groupDigits(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(.{4})/g, "$1 ").trim();
}

const CARD_LABELS: Record<CardType, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  uzcard: "Uzcard",
  humo: "Humo",
};

const CARD_TONES: Record<CardType, BadgeTone> = {
  visa: "primary",
  mastercard: "warning",
  uzcard: "accent",
  humo: "success",
};

function cardTone(type: CardType): ReactNode {
  return <Badge tone={CARD_TONES[type]}>{CARD_LABELS[type]}</Badge>;
}

/** Bog'langan kartani ko'rsatuvchi qatorcha */
export function CardRow({
  card,
  onRemove,
}: {
  card: PaymentCard;
  onRemove?: () => void;
}) {
  const { t } = useT();
  return (
    <div className="flex items-center justify-between gap-3 rounded-input border border-line bg-card px-3 py-2.5">
      <div className="flex items-center gap-3">
        {cardTone(card.type)}
        <span className="font-mono text-sm text-ink">
          •••• {card.last4}
        </span>
        <span className="hidden text-2xs text-faint sm:inline">
          {card.holderName} · {card.expiry}
        </span>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("common.delete")}
          className="text-faint transition-colors duration-150 hover:text-danger"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** Yangi karta bog'lash modali */
export function AddCardModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (card: PaymentCard) => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function reset() {
    setNumber("");
    setHolder("");
    setExpiry("");
    setErrors({});
  }

  const digits = number.replace(/\D/g, "");
  const detected = digits.length >= 4 ? detectCardType(digits) : null;

  async function handleAdd() {
    setSaving(true);
    try {
      const card = await addCard({ number, holderName: holder, expiry });
      toast(t("card.added"));
      onAdded(card);
      reset();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "INVALID_CARD") setErrors({ number: t("card.errNumber") });
      else if (msg === "INVALID_EXPIRY") setErrors({ expiry: t("card.errExpiry") });
      else if (msg === "INVALID_HOLDER") setErrors({ holder: t("card.errHolder") });
      else if (msg === "CARD_EXISTS") toast(t("card.exists"), "error");
      else if (msg === "CARD_LIMIT") toast(t("card.limit"), "error");
      else toast(t("common.error"), "error");
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("card.addTitle")}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button loading={saving} onClick={handleAdd}>
            {t("card.add")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Input
            label={t("card.number")}
            value={groupDigits(number)}
            onChange={(e) => {
              setNumber(e.target.value);
              setErrors((p) => ({ ...p, number: "" }));
            }}
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
            error={errors.number}
            className="font-mono"
          />
          {detected && (
            <span className="absolute right-3 top-8">
              {cardTone(detected)}
            </span>
          )}
        </div>
        <Input
          label={t("card.holder")}
          value={holder}
          onChange={(e) => {
            setHolder(e.target.value.toUpperCase());
            setErrors((p) => ({ ...p, holder: "" }));
          }}
          placeholder={t("card.holderPh")}
          error={errors.holder}
          maxLength={100}
        />
        <Input
          label={t("card.expiry")}
          value={expiry}
          onChange={(e) => {
            /* MM/YY avtomatik formatlash */
            const d = e.target.value.replace(/\D/g, "").slice(0, 4);
            setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
            setErrors((p) => ({ ...p, expiry: "" }));
          }}
          inputMode="numeric"
          placeholder="MM/YY"
          error={errors.expiry}
          className="max-w-32"
        />
      </div>
    </Modal>
  );
}

/** Sozlamalar uchun: kartalar ro'yxati + qo'shish/o'chirish */
export function CardManager({
  cards,
  onChange,
}: {
  cards: PaymentCard[];
  onChange: (cards: PaymentCard[]) => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [toRemove, setToRemove] = useState<PaymentCard | null>(null);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (!toRemove) return;
    setRemoving(true);
    try {
      await removeCard(toRemove.id);
      onChange(cards.filter((c) => c.id !== toRemove.id));
      toast(t("card.removed"));
      setToRemove(null);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {cards.length === 0 ? (
        <p className="rounded-input border border-dashed border-line bg-card/50 px-3 py-4 text-center text-xs text-faint">
          {t("card.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((card) => (
            <CardRow key={card.id} card={card} onRemove={() => setToRemove(card)} />
          ))}
        </div>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => setAddOpen(true)}
      >
        {t("card.add")}
      </Button>

      <AddCardModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(card) => onChange([card, ...cards])}
      />

      <ConfirmDialog
        open={!!toRemove}
        title={t("card.removeTitle")}
        description={t("card.removeDesc")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={removing}
        onConfirm={handleRemove}
        onCancel={() => setToRemove(null)}
      />
    </div>
  );
}

/** To'lov/yechish oqimlarida karta tanlash (radio ro'yxat + yangi qo'shish) */
export function CardPicker({
  cards,
  value,
  onChange,
  onCardAdded,
}: {
  cards: PaymentCard[];
  value: string;
  onChange: (id: string) => void;
  onCardAdded: (card: PaymentCard) => void;
}) {
  const { t } = useT();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {cards.map((card) => (
        <label
          key={card.id}
          className={`flex cursor-pointer items-center gap-3 rounded-input border p-3 transition-colors duration-150 ${
            value === card.id
              ? "border-primary bg-primary/5"
              : "border-line bg-card hover:bg-card-hover"
          }`}
        >
          <input
            type="radio"
            name="card-pick"
            checked={value === card.id}
            onChange={() => onChange(card.id)}
            className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border border-line bg-card checked:border-[5px] checked:border-primary"
          />
          {cardTone(card.type)}
          <span className="font-mono text-sm text-ink">•••• {card.last4}</span>
        </label>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => setAddOpen(true)}
      >
        {t("card.addNew")}
      </Button>
      <AddCardModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(card) => {
          onCardAdded(card);
          onChange(card.id);
        }}
      />
    </div>
  );
}
