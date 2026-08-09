"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { usersService } from "@/lib/api";
import type { ReportReason } from "@/lib/types";
import { useT } from "@/lib/i18n";

/** Xulq-atvor bo'yicha shikoyat (suiiste'mol/spam/firibgarlik) — DisputeControl'dan
   farqli, faol shartnoma talab qilmaydi va moliyaviy oqibati yo'q, faqat qayd etiladi. */
export function ReportControl({
  targetUserId,
  contractId,
  offerId,
}: {
  targetUserId: string;
  contractId?: string;
  offerId?: string;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (description.trim().length < 10) {
      setError(t("report.required"));
      return;
    }
    setSaving(true);
    try {
      await usersService.reportUser({ targetUserId, contractId, offerId, reason, description });
      setOpen(false);
      setDescription("");
      toast(t("report.submitted"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-faint hover:text-danger"
      >
        {t("report.open")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("report.title")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={saving} onClick={submit}>
              {t("report.submit")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">{t("report.warning")}</p>
          <Select
            label={t("report.reason")}
            value={reason}
            onChange={(event) => setReason(event.target.value as ReportReason)}
            options={["spam", "abuse", "fraud", "harassment", "other"].map(
              (value) => ({ value, label: t(`report.reason_${value}`) })
            )}
          />
          <Textarea
            label={t("report.description")}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setError("");
            }}
            rows={4}
            maxLength={2000}
            error={error}
          />
        </div>
      </Modal>
    </>
  );
}
