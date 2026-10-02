"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Stepper } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toast";
import { CATEGORIES } from "@/lib/category-fields";
import { getSelectableCategories } from "@/lib/categories";
import { servicesService, sellerApplicationService, ApiError } from "@/lib/api";
import type { Service, ServiceCategory, VerificationStatus } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useFormDraft } from "@/lib/hooks/useFormDraft";

interface ServiceWizardProps {
  initial?: Service;
}

/**
 * Bosqich 17 — real backend `CreateServiceDto`/`UpdateServiceDto` faqat
 * `category/title/description/price/deliveryDays` qabul qiladi. Mock'dagi
 * kategoriya-xos maydonlar, rasm galereyasi, qo'shimcha xizmatlar
 * (`extras`), "narxga kiritilgan"/"talablar" ro'yxatlari — HAMMASI real
 * backendda saqlanmaydi, shuning uchun bu sehrgardan OLIB TASHLANGAN
 * (aks holda foydalanuvchi to'ldirib, keyin "yo'qolganini" ko'rardi).
 */
export function ServiceWizard({ initial }: ServiceWizardProps) {
  const { t, lang } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!initial;
  const canPublish = !isEdit || initial.status === "draft" || initial.status === "rejected";

  const [applicationStatus, setApplicationStatus] = useState<VerificationStatus | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(true);
  useEffect(() => {
    sellerApplicationService
      .getCurrent()
      .then((app) => setApplicationStatus(app?.status ?? "boshlanmagan"))
      .catch(() => setApplicationStatus("boshlanmagan"))
      .finally(() => setApplicationLoading(false));
  }, []);

  const [selectableCategories, setSelectableCategories] = useState<ServiceCategory[]>(CATEGORIES);
  useEffect(() => setSelectableCategories(getSelectableCategories()), []);

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<ServiceCategory | "">(initial?.category ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [days, setDays] = useState(initial ? String(initial.deliveryDays) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"publish" | "draft" | null>(null);

  const draftValue = useMemo(() => ({ step, category, title, description, price, days }), [step, category, title, description, price, days]);
  const clearDraft = useFormDraft(
    `draft:seller:service:${initial?.id ?? "new"}`,
    draftValue,
    (draft) => {
      setStep(draft.step);
      setCategory(draft.category);
      setTitle(draft.title);
      setDescription(draft.description);
      setPrice(draft.price);
      setDays(draft.days);
    },
    Boolean(category || title || description || price || days),
  );

  const steps = [t("wizard.step1"), t("wizard.step2"), t("wizard.priceLabel"), t("wizard.step5")];

  function validateStep(current: number): boolean {
    const next: Record<string, string> = {};
    if (current === 0 && !category) next.category = t("wizard.errCategory");
    if (current === 1) {
      if (title.trim().length < 10) next.title = t("wizard.errTitle");
      if (description.trim().length < 30) next.description = t("wizard.errDesc");
    }
    if (current === 2) {
      if (!price || Number(price) <= 0) next.price = t("wizard.errPrice");
      if (!days || Number(days) < 1) next.days = t("wizard.errDays");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function save(kind: "publish" | "draft") {
    if (!category) {
      setErrors((prev) => ({ ...prev, category: t("wizard.errCategory") }));
      setStep(0);
      return;
    }
    if (!validateStep(1) || !validateStep(2)) {
      return;
    }
    if (applicationStatus === "rad_etilgan") {
      toast(t("dash.applicationRejectedDesc"), "error");
      return;
    }
    setSaving(kind);
    try {
      const data = { category, title: title.trim(), description: description.trim(), price: Number(price), deliveryDays: Number(days) };
      let id = initial?.id;
      if (isEdit) {
        await servicesService.update(initial.id, data);
      } else {
        const created = await servicesService.create(data);
        id = created.id;
      }
      if (kind === "publish" && id) {
        await servicesService.submit(id);
        toast(t("wizard.published"));
      } else {
        toast(isEdit ? t("wizard.changesSaved") : t("wizard.draftSaved"));
      }
      clearDraft();
      router.push("/mutaxassis/xizmatlarim");
    } catch (err) {
      console.error("ServiceWizard save error:", err);
      const isApi = err instanceof ApiError;
      const code = isApi ? (err.message || err.code) : "";
      const status = isApi ? err.status : 0;

      if (code === "SELLER_NOT_APPROVED" || status === 403) {
        toast(t("wizard.errNotApproved"), "error");
      } else if (code === "CATEGORY_NOT_FOUND" || code === "CATEGORY_DISABLED") {
        setErrors((prev) => ({ ...prev, category: t("wizard.errCategory") }));
        setStep(0);
        toast(t("wizard.errCategoryInvalid"), "error");
      } else if (isApi && err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        if (err.fieldErrors.category) setStep(0);
        else if (err.fieldErrors.title || err.fieldErrors.description) setStep(1);
        else if (err.fieldErrors.price || err.fieldErrors.deliveryDays) setStep(2);
        toast(t("wizard.errValidation"), "error");
      } else if (isApi && err.message && err.message !== "UNKNOWN" && err.message !== "VALIDATION") {
        toast(err.message, "error");
      } else {
        toast(t("common.error"), "error");
      }
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <BackButton href="/mutaxassis/xizmatlarim" label={t("nav.services")} />
      </div>

      <h1 className="font-heading text-2xl font-extrabold text-ink">{isEdit ? t("wizard.editTitle") : t("wizard.newTitle")}</h1>

      {!applicationLoading && applicationStatus === "rad_etilgan" && (
        <Card className="border-danger/30 bg-danger/5">
          <p className="font-heading text-sm font-bold text-ink">
            {t("dash.applicationRejected")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t("dash.applicationRejectedDesc")}
          </p>
          <div className="mt-2">
            <Link
              href="/mutaxassis/royxat"
              className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
            >
              {t("onboard.reapplyBtn")} →
            </Link>
          </div>
        </Card>
      )}

      <Stepper steps={steps} current={step} onStepClick={isEdit ? setStep : undefined} />

      <Card padding="lg">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">{t("wizard.categoryHint")}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {selectableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setErrors((prev) => ({ ...prev, category: "" }));
                  }}
                  aria-pressed={category === cat}
                  className={`rounded-card border p-4 text-center text-sm transition-colors duration-150 ${
                    category === cat ? "border-primary bg-primary/10 font-medium text-ink" : "border-field bg-card text-muted hover:border-primary hover:bg-card-hover hover:text-ink"
                  }`}
                >
                  {t(`cat.${cat}`)}
                </button>
              ))}
            </div>
            {errors.category && (
              <p className="text-2xs text-danger" role="alert">
                {errors.category}
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Input label={t("wizard.titleLabel")} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("wizard.titlePh")} error={errors.title} />
            <Textarea label={t("wizard.descLabel")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("wizard.descPh")} rows={6} error={errors.description} />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <Input type="number" min={0} label={t("wizard.priceLabel")} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="500000" error={errors.price} />
            <Input type="number" min={1} label={t("wizard.daysLabel")} value={days} onChange={(e) => setDays(e.target.value)} placeholder="3" error={errors.days} />
          </div>
        )}

        {step === 3 && category && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">{t("wizard.reviewHint")}</p>
            <dl className="flex flex-col divide-y divide-line">
              <ReviewRow label={t("wizard.step1")} value={t(`cat.${category}`)} />
              <ReviewRow label={t("wizard.titleLabel")} value={title} />
              <ReviewRow label={t("wizard.descLabel")} value={description} />
              <ReviewRow label={t("wizard.priceLabel")} value={formatMoney(Number(price) || 0, lang)} />
              <ReviewRow label={t("wizard.daysLabel")} value={`${days} ${t("common.days")}`} />
            </dl>
            {!canPublish && <p className="rounded-input border border-line bg-surface p-3 text-2xs text-muted">{t("wizard.editOnlyNote")}</p>}
          </div>
        )}
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {step > 0 && (
            <Button variant="ghost" onClick={goBack} disabled={!!saving}>
              {t("common.back")}
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {step < steps.length - 1 ? (
            <Button onClick={goNext}>{t("common.next")}</Button>
          ) : canPublish ? (
            <>
              <Button variant="secondary" onClick={() => save("draft")} loading={saving === "draft"} disabled={saving === "publish"}>
                {t("wizard.saveDraft")}
              </Button>
              <Button onClick={() => save("publish")} loading={saving === "publish"} disabled={saving === "draft"}>
                {t("wizard.publish")}
              </Button>
            </>
          ) : (
            <Button onClick={() => save("draft")} loading={saving === "draft"}>
              {t("wizard.saveChanges")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-xs text-faint">{label}</dt>
      <dd className="text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}
