"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { usersService } from "@/lib/api";
import type { AccountPreferences } from "@/lib/types";
import { useT } from "@/lib/i18n";

const DEFAULTS: AccountPreferences = {
  messages: true,
  contracts: true,
  payments: true,
  marketing: false,
};

export function AccountControls() {
  const { t } = useT();
  const { toast } = useToast();
  const router = useRouter();
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    usersService
      .getPreferences()
      .then(setPreferences)
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  async function savePreferences() {
    setSaving(true);
    try {
      await usersService.savePreferences(preferences);
      toast(t("settings.saved"));
    } finally {
      setSaving(false);
    }
  }

  async function exportData() {
    setExporting(true);
    try {
      const data = await usersService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bobododa-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast(t("privacy.exported"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setExporting(false);
    }
  }

  async function removeAccount() {
    if (deleteText !== t("privacy.deleteWord")) return;
    setDeleting(true);
    try {
      await usersService.deleteAccount();
      router.replace("/kirish");
    } catch (error) {
      toast(
        error instanceof Error && error.message === "ACTIVE_CONTRACTS"
          ? t("privacy.activeContracts")
          : t("common.error"),
        "error"
      );
      setDeleting(false);
    }
  }

  return (
    <>
      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : (
        <Card padding="lg">
          <h2 className="font-heading text-base font-bold text-ink">
            {t("privacy.notifications")}
          </h2>
          <p className="mt-1 text-xs text-muted">{t("privacy.notificationsHint")}</p>
          <div className="mt-4 flex flex-col gap-3">
            {(["messages", "contracts", "payments", "marketing"] as const).map(
              (key) => (
                <Checkbox
                  key={key}
                  label={t(`privacy.${key}`)}
                  checked={preferences[key]}
                  onChange={(event) =>
                    setPreferences((value) => ({
                      ...value,
                      [key]: event.target.checked,
                    }))
                  }
                />
              )
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            loading={saving}
            onClick={savePreferences}
          >
            {t("common.save")}
          </Button>
        </Card>
      )}

      <Card padding="lg">
        <h2 className="font-heading text-base font-bold text-ink">
          {t("privacy.dataTitle")}
        </h2>
        <p className="mt-1 text-xs text-muted">{t("privacy.dataHint")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" loading={exporting} onClick={exportData}>
            {t("privacy.export")}
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            {t("privacy.delete")}
          </Button>
        </div>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("privacy.deleteTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={deleteText !== t("privacy.deleteWord")}
              onClick={removeAccount}
            >
              {t("privacy.delete")}
            </Button>
          </>
        }
      >
        <p className="mb-4">{t("privacy.deleteDesc")}</p>
        <Input
          value={deleteText}
          onChange={(event) => setDeleteText(event.target.value)}
          placeholder={t("privacy.deleteWord")}
        />
      </Modal>
    </>
  );
}
