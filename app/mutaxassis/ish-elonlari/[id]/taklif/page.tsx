"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FileUpload } from "@/components/ui/FileUpload";
import { Input } from "@/components/ui/Input";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { jobsService, proposalsService, servicesService } from "@/lib/api";
import type { Job } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function TaklifYuborishPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [alreadySent, setAlreadySent] = useState(false);
  const [serviceImages, setServiceImages] = useState<string[]>([]);

  const [bid, setBid] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [cover, setCover] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      jobsService.get(params.id),
      proposalsService.listMine(),
      servicesService.listMine(),
    ])
      .then(([found, proposals, services]) => {
        setJob(found);
        if (found) setAnswers(found.screeningQuestions.map(() => ""));
        setAlreadySent(
          proposals.some(
            (p) => p.jobId === params.id && p.status !== "qaytarib_olingan"
          )
        );
        setServiceImages(services.flatMap((s) => s.images));
      })
      .catch(setLoadError);
  }, [params.id]);

  useEffect(load, [load]);

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;
  if (job === undefined) return <SkeletonCard />;
  if (job === null || job.status !== "ochiq") {
    return <EmptyState title={job === null ? t("job.notFound") : t("job.closedNote")} />;
  }
  if (alreadySent) {
    return <EmptyState title={t("job.alreadySent")} />;
  }

  function toggleImage(src: string) {
    setSelectedImages((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!job) return;
    const next: Record<string, string> = {};
    if (!bid || Number(bid) <= 0) next.bid = t("prop.errBid");
    if (!deliveryDays || Number(deliveryDays) < 1) next.deliveryDays = t("prop.errDelivery");
    if (cover.trim().length < 50) next.cover = t("prop.errCover");
    job.screeningQuestions.forEach((_, i) => {
      if (!answers[i]?.trim()) next[`answer${i}`] = t("prop.errAnswer");
    });
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    try {
      await proposalsService.create({
        jobId: job.id,
        bidAmount: Number(bid),
        coverLetter: cover.trim(),
        screeningAnswers: job.screeningQuestions.map((question, i) => ({
          question,
          answer: answers[i].trim(),
        })),
        attachedImages: [...selectedImages, ...uploadedImages],
        estimatedDeliveryDays: Number(deliveryDays),
      });
      toast(t("prop.sent"));
      router.push("/mutaxassis/takliflarim");
    } catch (err) {
      if (err instanceof Error && err.message === "DUPLICATE_PROPOSAL") {
        setAlreadySent(true);
        toast(t("job.alreadySent"), "error");
      } else {
        toast(t("common.error"), "error");
      }
      setSending(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Breadcrumb
        items={[
          { label: t("nav.jobs"), href: "/mutaxassis/ish-elonlari" },
          { label: job.title, href: `/mutaxassis/ish-elonlari/${job.id}` },
          { label: t("prop.formTitle") },
        ]}
      />
      <div>
        <p className="text-xs text-muted">{job.title}</p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold text-ink">
          {t("prop.formTitle")}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <Card padding="lg" className="flex flex-col gap-4">
          <Input
            type="number"
            min={0}
            label={t("prop.bid")}
            value={bid}
            onChange={(e) => setBid(e.target.value)}
            error={errors.bid}
            hint={`${t("prop.bidHint")}: ${formatMoney(job.budgetMin, lang)} – ${formatMoney(job.budgetMax, lang)}`}
          />
          <Input
            type="number"
            min={1}
            label={t("prop.deliveryDays")}
            value={deliveryDays}
            onChange={(e) => setDeliveryDays(e.target.value)}
            placeholder="7"
            hint={t("prop.deliveryDaysHint")}
            error={errors.deliveryDays}
          />
          <Textarea
            label={t("prop.cover")}
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            rows={7}
            placeholder={t("prop.coverHint")}
            error={errors.cover}
          />
        </Card>

        {job.screeningQuestions.length > 0 && (
          <Card padding="lg" className="flex flex-col gap-4">
            <h2 className="font-heading text-base font-bold text-ink">
              {t("prop.answers")}
            </h2>
            {job.screeningQuestions.map((question, i) => (
              <Textarea
                key={question}
                label={`${i + 1}. ${question}`}
                value={answers[i] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) =>
                    prev.map((a, idx) => (idx === i ? e.target.value : a))
                  )
                }
                rows={3}
                error={errors[`answer${i}`]}
              />
            ))}
          </Card>
        )}

        <Card padding="lg" className="flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-base font-bold text-ink">
              {t("prop.portfolio")}
            </h2>
            <p className="mt-1 text-xs text-muted">{t("prop.portfolioHint")}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">
              {t("prop.fromServices")}
            </span>
            {serviceImages.length === 0 ? (
              <p className="text-2xs text-faint">{t("prop.noServiceImages")}</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {serviceImages.map((src, i) => {
                  const selected = selectedImages.includes(src);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleImage(src)}
                      aria-pressed={selected}
                      aria-label={`${t("prop.fromServices")} ${i + 1}`}
                      className={`relative overflow-hidden rounded-input border-2 transition-colors duration-150 ${
                        selected ? "border-primary" : "border-line hover:border-faint"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={t("a11y.portfolioImage").replace("{n}", String(i + 1))}
                        className="h-20 w-28 object-cover"
                      />
                      {selected && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <FileUpload value={uploadedImages} onChange={setUploadedImages} max={5} acceptDocs />
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={sending}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={sending}>
            {t("prop.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
