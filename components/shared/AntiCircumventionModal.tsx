"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import type { CircumventionCheckResult } from "@/lib/chat-filter";

interface AntiCircumventionModalProps {
  open: boolean;
  onClose: () => void;
  result: CircumventionCheckResult | null;
}

export function AntiCircumventionModal({
  open,
  onClose,
  result,
}: AntiCircumventionModalProps) {
  const { lang } = useT();

  if (!result) return null;

  const isRu = lang === "ru";
  const title = isRu ? result.titleRu : result.titleUz;
  const description = isRu ? result.descriptionRu : result.descriptionUz;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isRu ? "Предупреждение безопасности" : "Xavfsizlik ogohlantirishi"}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button onClick={onClose} className="font-bold">
            {isRu ? "Понятно, изменить текст" : "Tushundim, matnni o'zgartirish"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white text-lg shadow-sm font-black">
            🛡️
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="font-heading text-sm font-bold text-ink">
              {title}
            </h4>
            <p className="mt-1 text-xs text-ink/90 leading-relaxed font-medium">
              {description}
            </p>
          </div>
        </div>

        {result.matchedText && (
          <div className="rounded-xl border border-line bg-surface p-3 text-xs">
            <span className="font-semibold text-muted">
              {isRu ? "Обнаруженный фрагмент:" : "Aniqlangan qism:"}
            </span>
            <div className="mt-1 font-mono text-xs font-bold text-danger bg-danger/10 px-2.5 py-1 rounded-md inline-block">
              {result.matchedText}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted leading-relaxed space-y-2">
          <div className="font-bold text-ink flex items-center gap-1.5">
            <span>💡</span>
            <span>
              {isRu
                ? "Почему это важно?"
                : "Nima uchun barcha muloqot va to'lovlar platformada bo'lishi kerak?"}
            </span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-2xs sm:text-xs">
            <li>
              <strong>Escrow kafolati:</strong> Ish topshirilib, siz tasdiqlamaguningizcha pul mutaxassisga o&apos;tkazilmaydi.
            </li>
            <li>
              <strong>Firibgarlikdan himoya:</strong> Platformadan tashqarida yuborilgan to&apos;lovlar qaytarilmaydi.
            </li>
            <li>
              <strong>Nizolarni hal qilish:</strong> Bahsli vaziyatlarda Bobo-Doda arbitraji platformadagi chat va topshirilgan ishlarga tayanadi.
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
