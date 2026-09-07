"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
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
import { getSelectableCategories } from "@/lib/categories";
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

  /* Admin o'chirgan kategoriyada yangi ish yaratib bo'lmaydi. Ro'yxat mount'dan
     KEYIN toraytiriladi: server render'ida `localStorage` yo'q, shuning uchun
     darhol filtrlansa hidratsiya mos kelmasdi. */
  const [selectableCategories, setSelectableCategories] =
    useState<ServiceCategory[]>(CATEGORIES);
  useEffect(() => setSelectableCategories(getSelectableCategories()), []);

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
  const [revisions, setRevisions] = useState(
    initial ? String(initial.revisionsIncluded ?? 2) : "2"
  );
  const [included, setIncluded] = useState<string[]>(initial?.included ?? []);
  const [requirements, setRequirements] = useState<string[]>(
    initial?.requirements ?? []
  );
  const [extras, setExtras] = useState<{ label: string; price: string }[]>(
    (initial?.extras ?? []).map((e) => ({ label: e.label, price: String(e.price) }))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"publish" | "draft" | null>(null);
  const draftValue = useMemo(
    () => ({
      step,
      category,
      title,
      description,
      fields,
      images,
      price,
      days,
      revisions,
      included,
      requirements,
      extras,
    }),
    [step, category, title, description, fields, images, price, days, revisions, included, requirements, extras]
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
      setExtras(draft.extras ?? []);
      setRevisions(draft.revisions ?? "2");
      setIncluded(draft.included ?? []);
      setRequirements(draft.requirements ?? []);
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
      if (revisions === "" || Number(revisions) < 0) next.revisions = t("common.required");
      extras.forEach((extra, i) => {
        if (!extra.label.trim()) next[`extraLabel${i}`] = t("common.required");
        if (!extra.price || Number(extra.price) <= 0) next[`extraPrice${i}`] = t("wizard.errPrice");
      });
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
        revisionsIncluded: Number(revisions),
        included,
        requirements,
        extras: extras
          .filter((e) => e.label.trim())
          .map((e) => ({ label: e.label.trim(), price: Number(e.price) })),
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
      <div className="flex items-center justify-between">
        <BackButton href="/mutaxassis/xizmatlarim" label={t("nav.services")} />
      </div>

      <h1 className="font-heading text-2xl font-extrabold text-ink">
        {isEdit ? t("wizard.editTitle") : t("wizard.newTitle")}
      </h1>

      <Stepper steps={steps} current={step} onStepClick={isEdit ? setStep : undefined} />

      <Card padding="lg">
        {/* 1-qadam: kategoriya */}
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
            <TagInput
              label={t("wizard.includedLabel")}
              value={included}
              onChange={setIncluded}
              placeholder={t("wizard.includedPh")}
            />
            <p className="-mt-3 text-2xs text-faint">{t("wizard.includedHint")}</p>
            <TagInput
              label={t("wizard.requirementsLabel")}
              value={requirements}
              onChange={setRequirements}
              placeholder={t("wizard.requirementsPh")}
            />
            <p className="-mt-3 text-2xs text-faint">{t("wizard.requirementsHint")}</p>
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
            <Input
              type="number"
              min={0}
              label={t("wizard.revisionsLabel")}
              value={revisions}
              onChange={(e) => setRevisions(e.target.value)}
              placeholder="2"
              hint={t("wizard.revisionsHint")}
              error={errors.revisions}
            />
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-medium text-muted">{t("wizard.extrasLabel")}</p>
                <p className="mt-1 text-2xs text-faint">{t("wizard.extrasHint")}</p>
              </div>
              {extras.map((extra, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      value={extra.label}
                      onChange={(e) =>
                        setExtras((prev) =>
                          prev.map((ex, idx) => (idx === i ? { ...ex, label: e.target.value } : ex))
                        )
                      }
                      placeholder={t("wizard.extraLabelPh")}
                      aria-label={`${i + 1}. ${t("wizard.extrasLabel")}`}
                      error={errors[`extraLabel${i}`]}
                    />
                  </div>
                  <div className="w-36">
                    <Input
                      type="number"
                      min={0}
                      value={extra.price}
                      onChange={(e) =>
                        setExtras((prev) =>
                          prev.map((ex, idx) => (idx === i ? { ...ex, price: e.target.value } : ex))
                        )
                      }
                      placeholder="100000"
                      aria-label={t("wizard.extraPricePh")}
                      error={errors[`extraPrice${i}`]}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setExtras((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={t("common.delete")}
                    className="mt-2.5 text-faint transition-colors duration-150 hover:text-danger"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
              {extras.length < 10 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => setExtras((prev) => [...prev, { label: "", price: "" }])}
                >
                  + {t("wizard.addExtra")}
                </Button>
              )}
            </div>
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
              {included.length > 0 && (
                <ReviewRow label={t("wizard.includedLabel")} value={included.join(", ")} />
              )}
              {requirements.length > 0 && (
                <ReviewRow
                  label={t("wizard.requirementsLabel")}
                  value={requirements.join(", ")}
                />
              )}
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
              <ReviewRow
                label={t("wizard.revisionsLabel")}
                value={String(revisions)}
              />
              {extras.filter((e) => e.label.trim()).length > 0 && (
                <ReviewRow
                  label={t("wizard.extrasLabel")}
                  value={extras
                    .filter((e) => e.label.trim())
                    .map((e) => `${e.label} (+${formatMoney(Number(e.price) || 0, lang)})`)
                    .join(", ")}
                />
              )}
            </dl>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={t("a11y.image").replace("{n}", String(i + 1))}
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
            /* Qoralamani tahrirlashda chop etish tanlovi berilishi SHART —
               aks holda `initial.status` saqlanib, xizmat abadiy qoralama
               bo'lib qoladi va bozorga hech qachon chiqmaydi. */
            initial.status === "draft" ? (
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
            ) : (
              <Button
                onClick={() => save(initial.status, "publish")}
                loading={saving === "publish"}
              >
                {t("wizard.saveChanges")}
              </Button>
            )
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
