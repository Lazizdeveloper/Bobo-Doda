"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { ErrorState } from "@/components/ui/ErrorState";
import { FileUpload } from "@/components/ui/FileUpload";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { verificationService } from "@/lib/api";
import type { VerificationRecord } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

export function VerificationCenter() {
  const { t, lang } = useT();
  const { toast } = useToast();
  const [record, setRecord] = useState<VerificationRecord | null | undefined>();
  const [country, setCountry] = useState<VerificationRecord["country"]>("UZ");
  const [documentType, setDocumentType] =
    useState<VerificationRecord["documentType"]>("passport");
  const [legalName, setLegalName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [documents, setDocuments] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    verificationService
      .getMine()
      .then(setRecord)
      /* Yuklash xatosi bo'sh holat EMAS — alohida holat ko'rsatiladi */
      .catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  async function submit() {
    const adultCutoff = new Date();
    adultCutoff.setFullYear(adultCutoff.getFullYear() - 18);
    if (
      !legalName.trim() ||
      !birthDate ||
      new Date(birthDate) > adultCutoff ||
      documents.length < 2 ||
      !consent
    ) {
      setError(t("verify.required"));
      return;
    }
    setSaving(true);
    try {
      const created = await verificationService.submit({
        country,
        documentType,
        legalName,
        birthDate,
        documents,
      });
      setRecord(created);
      toast(t("verify.submitted"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  const locked =
    record?.status === "korib_chiqilmoqda" ||
    record?.status === "tasdiqlangan";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("verify.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("verify.subtitle")}</p>
      </div>

      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : record === undefined ? (
        <SkeletonCard />
      ) : (
        <>
          {record && (
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">{t("verify.status")}</p>
                {record.submittedAt && (
                  <p className="mt-1 text-2xs text-faint">
                    {formatDate(record.submittedAt, lang)}
                  </p>
                )}
              </div>
              <Badge
                tone={
                  record.status === "tasdiqlangan"
                    ? "success"
                    : record.status === "rad_etilgan"
                      ? "danger"
                      : "warning"
                }
              >
                {t(`verify.${record.status}`)}
              </Badge>
              {record.rejectionReason && (
                <p className="w-full border-t border-line pt-3 text-xs text-danger">
                  {record.rejectionReason}
                </p>
              )}
            </Card>
          )}

          {!locked && (
            <Card padding="lg">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label={t("verify.country")}
                  value={country}
                  onChange={(event) =>
                    setCountry(event.target.value as VerificationRecord["country"])
                  }
                  options={[
                    { value: "UZ", label: t("country.UZ") },
                    { value: "KZ", label: t("country.KZ") },
                    { value: "KG", label: t("country.KG") },
                    { value: "TJ", label: t("country.TJ") },
                    { value: "TM", label: t("country.TM") },
                  ]}
                />
                <Select
                  label={t("verify.documentType")}
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(
                      event.target.value as VerificationRecord["documentType"]
                    )
                  }
                  options={[
                    { value: "passport", label: t("verify.passport") },
                    { value: "id_card", label: t("verify.idCard") },
                  ]}
                />
                <Input
                  label={t("verify.legalName")}
                  value={legalName}
                  onChange={(event) => {
                    setLegalName(event.target.value);
                    setError("");
                  }}
                />
                <Input
                  type="date"
                  label={t("verify.birthDate")}
                  value={birthDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => {
                    setBirthDate(event.target.value);
                    setError("");
                  }}
                />
              </div>
              <div className="mt-5">
                <FileUpload
                  label={t("verify.documents")}
                  value={documents}
                  onChange={(next) => {
                    setDocuments(next);
                    setError("");
                  }}
                  max={3}
                  maxBytes={750 * 1024}
                  error={error}
                />
                <p className="mt-2 text-2xs text-faint">{t("verify.documentsHint")}</p>
              </div>
              <div className="mt-5 rounded-input border border-accent/25 bg-accent/5 p-3 text-2xs text-muted">
                {t("verify.privacy")}
              </div>
              <div className="mt-4">
                <Checkbox
                  label={t("verify.consent")}
                  checked={consent}
                  onChange={(event) => {
                    setConsent(event.target.checked);
                    setError("");
                  }}
                />
              </div>
              <Button className="mt-5" loading={saving} onClick={submit}>
                {t("verify.submit")}
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
