"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { TagInput } from "@/components/ui/TagInput";
import { FileUpload } from "@/components/ui/FileUpload";
import { Stepper } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toast";
import { CATEGORIES, categoryFields, type CategoryField } from "@/lib/category-fields";
import { servicesService } from "@/lib/api";
import type { Service, ServiceCategory } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useFormDraft } from "@/lib/hooks/useFormDraft";

interface ServiceWizardProps {
  initial?: Service;
}

export function ServiceWizard({ initial }: ServiceWizardProps) {
  const { t, lang } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!initial;

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<ServiceCategory | "">(
    initial?.category ?? ""
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [fields, setFields] = useState<Record<string, string | string[]>>(
    initial?.fields ?? {}
  );
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [days, setDays] = useState(initial ? String(initial.deliveryDays) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"publish" | "draft" | null>(null);
  const draftValue = useMemo(
    () => ({ step, category, title, description, fields, images, price, days }),
    [step, category, title, description, fields, images, price, days]
  );
  const clearDraft = useFormDraft(
    `draft:seller:service:${initial?.id ?? "new"}`,
    draftValue,
    (draft) => {
      setStep(draft.step);
      setCategory(draft.category);
      setTitle(draft.title);
      setDescription(draft.description);
      setFields(draft.fields);
      setImages(draft.images);
      setPrice(draft.price);
      setDays(draft.days);
    },
    Boolean(category || title || description || Object.keys(fields).length || images.length || price || days)
  );

  const steps = [
    t("wizard.step1"),
    t("wizard.step2"),
    t("wizard.step3"),
    t("wizard.step4"),
    t("wizard.step5"),
  ];

  const activeFields: CategoryField[] = category ? categoryFields[category] : [];

  /* Variant qiymatini ko'rsatish: i18n kaliti bo'lsa tarjima, bo'lmasa o'zi */
  function optLabel(value: string): string {
    return value.startsWith("opt.") ? t(value) : value;
  }

  function setField(key: string, value: string | string[]) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validateStep(current: number): boolean {
    const next: Record<string, string> = {};
    if (current === 0 && !category) next.category = t("wizard.errCategory");
    if (current === 1) {
      if (title.trim().length < 10) next.title = t("wizard.errTitle");
      if (description.trim().length < 30) next.description = t("wizard.errDesc");
    }
    if (current === 2) {
      for (const field of activeFields) {
        if (field.type === "images") continue;
        const value = fields[field.key];
        if (field.type === "number") {
          if (!value || Number(value) <= 0) next[field.key] = t("common.required");
        } else if (
          !value ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === "string" && !value.trim())
        ) {
          next[field.key] = t("common.required");
        }
      }
    }
    if (current === 3) {
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

  async function save(status: Service["status"], kind: "publish" | "draft") {
    if (!category) return;
    setSaving(kind);
    try {
      const data = {
        category,
        title: title.trim(),
        description: description.trim(),
        fields,
        images,
        price: Number(price),
        deliveryDays: Number(days),
        status,
      };
      if (isEdit) {
        await servicesService.update(initial.id, data);
        toast(t("wizard.changesSaved"));
      } else {
        await servicesService.create(data);
        toast(kind === "publish" ? t("wizard.published") : t("wizard.draftSaved"));
      }
      clearDraft();
      router.push("/mutaxassis/xizmatlarim");
    } catch {
      toast(t("common.error"), "error");
      setSaving(null);
    }
  }

  function renderField(field: CategoryField) {
    const value = fields[field.key];
    switch (field.type) {
      case "images":
        return (
          <FileUpload
            key={field.key}
            label={t(field.labelKey)}
            value={images}
            onChange={setImages}
            max={field.max ?? 5}
          />
        );
      case "select":
        return (
          <Select
            key={field.key}
            label={t(field.labelKey)}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setField(field.key, e.target.value)}
            placeholder={t("field.select")}
            options={(field.optionKeys ?? []).map((key) => ({
              value: key,
              label: t(key),
            }))}
            error={errors[field.key]}
          />
        );
      case "multiselect": {
        const selected = Array.isArray(value) ? value : [];
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">
              {t(field.labelKey)}
            </span>
            <div className="flex flex-col gap-2">
              {(field.optionKeys ?? []).map((key) => (
                <Checkbox
                  key={key}
                  label={t(key)}
                  checked={selected.includes(key)}
                  onChange={(e) =>
                    setField(
                      field.key,
                      e.target.checked
                        ? [...selected, key]
                        : selected.filter((v) => v !== key)
                    )
                  }
                />
              ))}
            </div>
            {errors[field.key] && (
              <p className="text-2xs text-danger" role="alert">
                {errors[field.key]}
              </p>
            )}
          </div>
        );
      }
      case "tags":
        return (
          <TagInput
            key={field.key}
            label={t(field.labelKey)}
            value={Array.isArray(value) ? value : []}
            onChange={(tags) => setField(field.key, tags)}
            placeholder={field.placeholderKey ? t(field.placeholderKey) : ""}
            error={errors[field.key]}
          />
        );
      case "number":
        return (
          <Input
            key={field.key}
            type="number"
            min={1}
            label={t(field.labelKey)}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setField(field.key, e.target.value)}
            error={errors[field.key]}
          />
        );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-extrabold text-ink">
        {isEdit ? t("wizard.editTitle") : t("wizard.newTitle")}
      </h1>

      <Stepper steps={steps} current={step} />

      <Card padding="lg">
        {/* 1-qadam: kategoriya */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">{t("wizard.categoryHint")}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setErrors((prev) => ({ ...prev, category: "" }));
                    if (cat !== category) setFields({});
                  }}
                  aria-pressed={category === cat}
                  className={`rounded-card border p-4 text-center text-sm transition-colors duration-150 ${
                    category === cat
                      ? "border-primary bg-primary/10 font-medium text-ink"
                      : "border-field bg-card text-muted hover:border-primary hover:bg-card-hover hover:text-ink"
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

        {/* 2-qadam: sarlavha va tavsif */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Input
              label={t("wizard.titleLabel")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("wizard.titlePh")}
              error={errors.title}
            />
            <Textarea
              label={t("wizard.descLabel")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("wizard.descPh")}
              rows={6}
              error={errors.description}
            />
          </div>
        )}

        {/* 3-qadam: kategoriyaga xos maydonlar */}
        {step === 2 && (
          <div className="flex flex-col gap-4">{activeFields.map(renderField)}</div>
        )}

        {/* 4-qadam: narx va muddat */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <Input
              type="number"
              min={0}
              label={t("wizard.priceLabel")}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="500000"
              error={errors.price}
            />
            <Input
              type="number"
              min={1}
              label={t("wizard.daysLabel")}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="3"
              error={errors.days}
            />
            <p className="rounded-input border border-accent/25 bg-accent/5 p-3 text-2xs text-muted">
              {t("wizard.escrowHint")}
            </p>
          </div>
        )}

        {/* 5-qadam: ko'rib chiqish */}
        {step === 4 && category && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">{t("wizard.reviewHint")}</p>
            <dl className="flex flex-col divide-y divide-line">
              <ReviewRow label={t("wizard.step1")} value={t(`cat.${category}`)} />
              <ReviewRow label={t("wizard.titleLabel")} value={title} />
              <ReviewRow label={t("wizard.descLabel")} value={description} />
              {activeFields
                .filter((f) => f.type !== "images")
                .map((field) => {
                  const value = fields[field.key];
                  const text = Array.isArray(value)
                    ? value.map(optLabel).join(", ")
                    : optLabel(String(value ?? ""));
                  return (
                    <ReviewRow key={field.key} label={t(field.labelKey)} value={text} />
                  );
                })}
              <ReviewRow
                label={t("wizard.priceLabel")}
                value={formatMoney(Number(price) || 0, lang)}
              />
              <ReviewRow
                label={t("wizard.daysLabel")}
                value={`${days} ${t("common.days")}`}
              />
            </dl>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`${i + 1}-rasm`}
                    className="h-16 w-16 rounded-input border border-line object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Boshqaruv tugmalari */}
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
          ) : isEdit ? (
            <Button
              onClick={() => save(initial.status, "publish")}
              loading={saving === "publish"}
            >
              {t("wizard.saveChanges")}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => save("draft", "draft")}
                loading={saving === "draft"}
                disabled={saving === "publish"}
              >
                {t("wizard.saveDraft")}
              </Button>
              <Button
                onClick={() => save("active", "publish")}
                loading={saving === "publish"}
                disabled={saving === "draft"}
              >
                {t("wizard.publish")}
              </Button>
            </>
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
