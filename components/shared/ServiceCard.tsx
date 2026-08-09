"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ServiceStatusBadge } from "@/components/shared/StatusBadge";
import type { Service } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

export interface ServiceCardProps {
  service: Service;
  onToggleStatus: (service: Service) => void;
  onDelete: (service: Service) => void;
  busy?: boolean;
}

export function ServiceCard({
  service,
  onToggleStatus,
  onDelete,
  busy = false,
}: ServiceCardProps) {
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
        <span className="font-medium text-ink">
          {formatMoney(service.price, lang)}
        </span>
        <span>
          {service.deliveryDays} {t("common.days")}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Link href={`/mutaxassis/xizmatlarim/${service.id}`}>
          <Button variant="secondary" size="sm">
            {t("common.edit")}
          </Button>
        </Link>
        {service.status !== "draft" && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onToggleStatus(service)}
          >
            {service.status === "active" ? t("services.pause") : t("services.activate")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onDelete(service)}
          className="ml-auto text-danger hover:text-danger"
        >
          {t("common.delete")}
        </Button>
      </div>
    </Card>
  );
}
