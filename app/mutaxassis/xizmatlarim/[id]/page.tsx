"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ServiceWizard } from "@/components/shared/ServiceWizard";
import { getService, getSession, SELLER_ID } from "@/lib/mock-api";
import type { Service } from "@/lib/types";
import { useT } from "@/lib/i18n";

export default function TahrirlashPage() {
  const { t } = useT();
  const params = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null | undefined>(undefined);

  useEffect(() => {
    getService(params.id).then((found) => {
      /* Faqat o'z xizmatini tahrirlash mumkin */
      const myId = getSession()?.userId ?? SELLER_ID;
      setService(found && found.sellerId === myId ? found : null);
    });
  }, [params.id]);

  if (service === undefined) return <SkeletonCard />;
  if (service === null) return <EmptyState title={t("common.notFound")} />;

  return <ServiceWizard initial={service} />;
}
