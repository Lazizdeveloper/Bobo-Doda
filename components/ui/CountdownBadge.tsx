"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { useT } from "@/lib/i18n";

export interface CountdownBadgeProps {
  /** ISO sana — muddat tugash vaqti */
  deadline: string;
}

export function CountdownBadge({ deadline }: CountdownBadgeProps) {
  const { t } = useT();
  const [now, setNow] = useState(() => Date.now());

  /* Sahifa ochiq turganda hisob eskirmasligi uchun daqiqada bir yangilanadi */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const msLeft = new Date(deadline).getTime() - now;

  if (msLeft <= 0) {
    return <Badge tone="danger">{t("cd.expired")}</Badge>;
  }

  const hoursLeft = Math.ceil(msLeft / 3_600_000);
  if (hoursLeft < 24) {
    return (
      <Badge tone="warning">
        {t("cd.reviewHours").replace("{n}", String(hoursLeft))}
      </Badge>
    );
  }

  const daysLeft = Math.ceil(msLeft / 86_400_000);
  return (
    <Badge tone="warning">{t("cd.review").replace("{n}", String(daysLeft))}</Badge>
  );
}
