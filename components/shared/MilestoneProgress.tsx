"use client";

import type { Milestone } from "@/lib/types";
import { useT } from "@/lib/i18n";

export function MilestoneProgress({ milestones }: { milestones: Milestone[] }) {
  const { t } = useT();
  const done = milestones.filter((m) => m.status === "qabul_qilindi").length;
  const total = milestones.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1" aria-hidden="true">
        {milestones.map((m) => (
          <span
            key={m.id}
            className={`h-1.5 flex-1 rounded-full ${
              m.status === "qabul_qilindi"
                ? "bg-success"
                : m.status === "kutilmoqda"
                  ? "bg-card-hover"
                  : "bg-primary"
            }`}
          />
        ))}
      </div>
      <p className="text-2xs text-muted">
        {done}/{total} {t("ms.progressDone")}
      </p>
    </div>
  );
}
