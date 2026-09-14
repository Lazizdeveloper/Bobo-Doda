"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ServiceCard, type ServiceAction } from "@/components/shared/ServiceCard";
import { servicesService } from "@/lib/api";
import type { Service, ServiceStatus } from "@/lib/types";
import { useT } from "@/lib/i18n";

type Filter = "all" | ServiceStatus;

export default function XizmatlarimPage() {
  const { t } = useT();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [toArchive, setToArchive] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    servicesService.listMine().then(setServices).catch(setLoadError);
  }, []);

  useEffect(load, [load]);

  const filtered = services?.filter((s) => filter === "all" || s.status === filter) ?? [];

  const count = (status: ServiceStatus) => services?.filter((s) => s.status === status).length ?? 0;

  async function handleAction(service: Service, action: ServiceAction) {
    if (action === "archive") {
      setToArchive(service);
      return;
    }
    setBusy(true);
    try {
      if (action === "submit") await servicesService.submit(service.id);
      else if (action === "pause") await servicesService.pause(service.id);
      else if (action === "resume") await servicesService.resume(service.id);
      setServices(await servicesService.listMine());
      toast(
        action === "submit" ? t("services.submittedForReview") : action === "pause" ? t("services.paused") : t("services.activated"),
      );
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!toArchive) return;
    setBusy(true);
    try {
      await servicesService.remove(toArchive.id);
      setServices(await servicesService.listMine());
      toast(t("services.deleted"));
      setToArchive(null);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">{t("services.title")}</h1>
        <Link href="/mutaxassis/xizmatlarim/yangi">
          <Button>{t("services.add")}</Button>
        </Link>
      </div>

      <Tabs
        value={filter}
        onChange={(value) => setFilter(value as Filter)}
        items={[
          { value: "all", label: t("services.filterAll"), count: services?.length },
          { value: "active", label: t("svcStatus.active"), count: count("active") },
          { value: "paused", label: t("svcStatus.paused"), count: count("paused") },
          { value: "draft", label: t("svcStatus.draft"), count: count("draft") },
          { value: "pending_review", label: t("svcStatus.pending_review"), count: count("pending_review") },
          { value: "rejected", label: t("svcStatus.rejected"), count: count("rejected") },
        ]}
      />

      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : !services ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={services.length === 0 ? t("services.empty") : t("services.emptyFiltered")}
          action={
            services.length === 0 ? (
              <Link href="/mutaxassis/xizmatlarim/yangi">
                <Button>{t("services.emptyCta")}</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((service) => (
            <ServiceCard key={service.id} service={service} busy={busy} onAction={handleAction} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toArchive}
        title={t("services.deleteTitle")}
        description={
          <>
            <p>{t("services.deleteDesc")}</p>
            {toArchive && <p className="mt-2 font-medium text-ink">{toArchive.title}</p>}
          </>
        }
        confirmLabel={t("services.archive")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={busy}
        onConfirm={handleArchive}
        onCancel={() => setToArchive(null)}
      />
    </div>
  );
}
