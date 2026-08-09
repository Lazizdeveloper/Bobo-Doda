"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ServiceWizard } from "@/components/shared/ServiceWizard";
import { authService, servicesService } from "@/lib/api";
import type { Service } from "@/lib/types";
import { useT } from "@/lib/i18n";

export default function TahrirlashPage() {
  const { t } = useT();
  const params = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    setLoadError(null);
    servicesService
      .get(params.id)
      .then((found) => {
        /* Faqat o'z xizmatini tahrirlash mumkin */
        const myId = authService.getSession()?.userId ?? null;
        setService(found && found.sellerId === myId ? found : null);
      })
      .catch(setLoadError);
  }, [params.id]);

  useEffect(load, [load]);

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;
  if (service === undefined) return <SkeletonCard />;
  if (service === null) return <EmptyState title={t("common.notFound")} />;

  return <ServiceWizard initial={service} />;
}
