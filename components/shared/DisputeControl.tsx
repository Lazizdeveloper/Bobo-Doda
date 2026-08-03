"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { openDispute } from "@/lib/api";
import type { Dispute } from "@/lib/types";
import { useT } from "@/lib/i18n";

export function DisputeControl({
  contractId,
  onOpened,
}: {
  contractId: string;
  onOpened: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Dispute["reason"]>("scope");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (description.trim().length < 30) {
      setError(t("dispute.required"));
      return;
    }
    setSaving(true);
    try {
      await openDispute(contractId, { reason, description, evidence });
      setOpen(false);
      toast(t("dispute.opened"));
      onOpened();
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
        className="text-warning hover:text-warning"
      >
        {t("dispute.open")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("dispute.title")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={saving} onClick={submit}>
              {t("dispute.submit")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">{t("dispute.warning")}</p>
          <Select
            label={t("dispute.reason")}
            value={reason}
            onChange={(event) =>
              setReason(event.target.value as Dispute["reason"])
            }
            options={[
              "scope",
              "quality",
              "deadline",
              "payment",
              "communication",
              "other",
            ].map((value) => ({
              value,
              label: t(`dispute.reason_${value}`),
            }))}
          />
          <Textarea
            label={t("dispute.description")}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setError("");
            }}
            rows={5}
            maxLength={5000}
            error={error}
          />
          <FileUpload
            label={t("dispute.evidence")}
            value={evidence}
            onChange={setEvidence}
            max={5}
          />
        </div>
      </Modal>
    </>
  );
}
