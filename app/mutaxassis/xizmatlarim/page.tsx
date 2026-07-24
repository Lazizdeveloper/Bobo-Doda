"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { deleteService, getServices, updateService } from "@/lib/mock-api";
import type { Service, ServiceStatus } from "@/lib/types";
import { useT } from "@/lib/i18n";

type Filter = "all" | ServiceStatus;

export default function XizmatlarimPage() {
  const { t } = useT();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [toDelete, setToDelete] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getServices().then(setServices);
  }, []);

  const filtered =
    services?.filter((s) => filter === "all" || s.status === filter) ?? [];

  const count = (status: ServiceStatus) =>
    services?.filter((s) => s.status === status).length ?? 0;

  async function handleToggle(service: Service) {
    setBusy(true);
    try {
      const nextStatus = service.status === "active" ? "paused" : "active";
      await updateService(service.id, { status: nextStatus });
      setServices(await getServices());
      toast(nextStatus === "active" ? t("services.activated") : t("services.paused"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await deleteService(toDelete.id);
      setServices(await getServices());
      toast(t("services.deleted"));
      setToDelete(null);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("services.title")}
        </h1>
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
        ]}
      />

      {!services ? (
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
            <ServiceCard
              key={service.id}
              service={service}
              busy={busy}
              onToggleStatus={handleToggle}
              onDelete={setToDelete}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t("services.deleteTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={busy}>
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <p>{t("services.deleteDesc")}</p>
        {toDelete && (
          <p className="mt-2 font-medium text-ink">{toDelete.title}</p>
        )}
      </Modal>
    </div>
  );
}
