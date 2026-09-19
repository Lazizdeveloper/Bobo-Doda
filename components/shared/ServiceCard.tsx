"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ServiceStatusBadge } from "@/components/shared/StatusBadge";
import type { Service } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export type ServiceAction = "submit" | "pause" | "resume" | "archive";

export interface ServiceCardProps {
  service: Service;
  onAction: (service: Service, action: ServiceAction) => void;
  busy?: boolean;
}

export function ServiceCard({ service, onAction, busy = false }: ServiceCardProps) {
  const { t, lang } = useT();

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{t(`cat.${service.category}`)}</Badge>
          <ServiceStatusBadge status={service.status} />
        </div>
      </div>

      <div>
        <h3 className="font-heading text-sm font-bold text-ink">{service.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted">{service.description}</p>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="font-medium text-ink">{formatMoney(service.price, lang)}</span>
        <span>
          {service.deliveryDays} {t("common.days")}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {(service.status === "draft" || service.status === "rejected") && (
          <Link href={`/mutaxassis/xizmatlarim/${service.id}`}>
            <Button variant="secondary" size="sm">
              {t("common.edit")}
            </Button>
          </Link>
        )}
        {service.status === "draft" && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onAction(service, "submit")}>
            {t("services.submitForReview")}
          </Button>
        )}
        {service.status === "active" && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onAction(service, "pause")}>
            {t("services.pause")}
          </Button>
        )}
        {service.status === "paused" && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onAction(service, "resume")}>
            {t("services.activate")}
          </Button>
        )}
        {(service.status === "active" || service.status === "paused" || service.status === "draft") && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onAction(service, "archive")}
            className="ml-auto text-danger hover:text-danger"
          >
            {t("services.archive")}
          </Button>
        )}
      </div>
    </Card>
  );
}
