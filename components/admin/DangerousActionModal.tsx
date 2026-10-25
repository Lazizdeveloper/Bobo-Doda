"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { adminErrorText } from "@/lib/admin-error-text";

interface DangerousActionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  impactDetails: string[];
  confirmLabel?: string;
  confirmTone?: "danger" | "warning" | "primary";
  requireReason?: boolean;
  minReasonLength?: number;
  maxReasonLength?: number;
  reasonPlaceholder?: string;
  onConfirm: (reason: string) => Promise<void> | void;
}

export function DangerousActionModal({
  open,
  onClose,
  title,
  description,
  impactDetails,
  confirmLabel = "Tasdiqlash",
  confirmTone = "danger",
  requireReason = true,
  minReasonLength = 5,
  maxReasonLength = 500,
  reasonPlaceholder = "Amaliyot sababini batafsil yozing (5–500 belgi)...",
  onConfirm,
}: DangerousActionModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmedLen = reason.trim().length;
  const isReasonTooShort = requireReason && reason.length > 0 && trimmedLen < minReasonLength;
  const isReasonTooLong = reason.length > maxReasonLength;
  const isReasonValid = !requireReason || (trimmedLen >= minReasonLength && !isReasonTooLong);

  async function handleConfirm() {
    if (requireReason && trimmedLen < minReasonLength) {
      setError(`Sabab kamida ${minReasonLength} ta belgidan iborat bo‘lishi shart.`);
      return;
    }
    if (isReasonTooLong) {
      setError(`Sabab ${maxReasonLength} ta belgidan oshmasligi shart (hozirda ${reason.length} ta belgi).`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (err) {
      /* Xom kod satri ("FORBIDDEN") emas, o'qiladigan matn ko'rsatiladi */
      setError(adminErrorText(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Bekor qilish
          </Button>
          <Button
            type="button"
            tone={confirmTone}
            onClick={handleConfirm}
            loading={loading}
            disabled={!isReasonValid || loading || isReasonTooLong}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 [overflow-wrap:anywhere] [word-break:break-word]">
        <p className="text-sm text-ink">{description}</p>

        {/* Impact Warning Card */}
        {impactDetails.length > 0 && (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-3.5 text-xs text-ink [overflow-wrap:anywhere] [word-break:break-word]">
            <p className="font-bold text-danger flex items-center gap-1.5 mb-1.5">
              <span>⚠️</span> Ushbu amalning oqibatlari:
            </p>
            <ul className="list-disc space-y-1 pl-4 text-ink/80">
              {impactDetails.map((detail, idx) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Reason Textarea */}
        {requireReason && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                Amaliyot sababi va audit izohi <span className="text-danger">*</span>
              </label>
              <span
                className={`text-2xs font-mono font-medium ${
                  isReasonTooLong
                    ? "text-danger font-bold"
                    : trimmedLen >= minReasonLength
                    ? "text-success"
                    : "text-muted"
                }`}
                aria-live="polite"
              >
                {reason.length}/{maxReasonLength}
              </span>
            </div>
            <Textarea
              rows={3}
              maxLength={maxReasonLength}
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              error={
                error ||
                (isReasonTooShort
                  ? `Sabab kamida ${minReasonLength} ta belgidan iborat bo‘lishi shart`
                  : isReasonTooLong
                  ? `Sabab ${maxReasonLength} ta belgidan oshmasligi shart`
                  : undefined)
              }
              className="[overflow-wrap:anywhere] [word-break:break-word]"
            />
            <p className="text-3xs text-muted">
              Sabab {minReasonLength}–{maxReasonLength} belgi oralig‘ida bo‘lishi kerak. Ushbu izoh tizim audit jurnalida saqlanadi.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
