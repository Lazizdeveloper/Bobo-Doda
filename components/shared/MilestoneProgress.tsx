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
        {/* To'rt daraja: yakunlangan (to'q yashil) · ko'rib chiqilmoqda (to'liq
            brend rangi) · mablag'langan, hali topshirilmagan (ochiq brend
            rangi) · to'lanmagan (kulrang).
            Ilgari "yakunlangan"dan boshqa HAMMASI bir xil to'liq `bg-primary`
            edi: 0/2 bosqich bajarilgan shartnomada ham chiziq boshdan-oyoq
            to'la ko'rinar va "0/2 bosqich yakunlandi" yozuvi bilan ochiq
            qarama-qarshilikka tushardi. */}
        {milestones.map((m) => (
          <span
            key={m.id}
            className={`h-1.5 flex-1 rounded-full ${
              m.status === "qabul_qilindi"
                ? "bg-success"
                : m.status === "topshirildi" || m.status === "ozgartirish_soraldi"
                  ? "bg-primary"
                  : m.status === "mablaglangan"
                    ? "bg-primary/25"
                    : "bg-card-hover"
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
