"use client";

import { useCallback, useEffect, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
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
import { COUNTRIES } from "@/lib/geo";

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
    if (!legalName.trim() || legalName.trim().split(/\s+/).length < 2) {
      setError(
        lang === "ru"
          ? "Пожалуйста, укажите полное имя и фамилию (минимум 2 слова)"
          : "Iltimos, to'liq ism va familiyangizni kiriting (kamida 2 ta so'z)"
      );
      return;
    }
    if (
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
      <div className="flex items-center justify-between">
        <BackButton label={t("common.back")} />
      </div>
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
                  onChange={(event) => {
                    const newCountry = event.target.value as VerificationRecord["country"];
                    setCountry(newCountry);
                    const countryMeta = COUNTRIES.find((c) => c.code === newCountry);
                    if (countryMeta?.documentTypes.length) {
                      setDocumentType(countryMeta.documentTypes[0]!.value as VerificationRecord["documentType"]);
                    }
                  }}
                  options={COUNTRIES.map((c) => ({
                    value: c.code,
                    label: `${c.flag} ${lang === "ru" ? c.nameRu : c.nameUz}`,
                  }))}
                />
                <Select
                  label={t("verify.documentType")}
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(
                      event.target.value as VerificationRecord["documentType"]
                    )
                  }
                  options={(
                    COUNTRIES.find((c) => c.code === country)?.documentTypes || [
                      { value: "passport", labelUz: "Pasport", labelRu: "Паспорт", labelEn: "Passport" },
                      { value: "id_card", labelUz: "ID karta", labelRu: "ID-карта", labelEn: "ID Card" },
                    ]
                  ).map((d) => ({
                    value: d.value,
                    label: lang === "ru" ? d.labelRu : d.labelUz,
                  }))}
                />
                <Input
                  label={t("verify.legalName")}
                  value={legalName}
                  placeholder={lang === "ru" ? "Имя и Фамилия" : "Ism va Familiya"}
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
                {(() => {
                  const countryMeta = COUNTRIES.find((c) => c.code === country);
                  const docMeta = countryMeta?.documentTypes.find((d) => d.value === documentType);
                  return (
                    <p className="mt-2 text-2xs text-faint">
                      {docMeta ? (lang === "ru" ? docMeta.hintRu : docMeta.hintUz) : t("verify.documentsHint")}
                    </p>
                  );
                })()}
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
