"use client";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { TrustBadge as TrustBadgeType } from "@/lib/types";
import { useT } from "@/lib/i18n";

const tones: Record<TrustBadgeType, BadgeTone> = {
  yangi: "neutral",
  ishonchli: "accent",
  top_mutaxassis: "primary",
};

export function TrustBadge({ badge }: { badge: TrustBadgeType }) {
  const { t } = useT();
  return (
    <Badge tone={tones[badge]}>
      {badge === "top_mutaxassis" && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
          className="mr-1"
        >
          <path d="M8 1.5l2 4.1 4.5.6-3.3 3.2.8 4.5L8 11.8l-4 2.1.8-4.5L1.5 6.2 6 5.6 8 1.5Z" />
        </svg>
      )}
      {badge === "ishonchli" && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="mr-1"
        >
          <path
            d="M8 1.5 13.5 4v3.6c0 3.3-2.3 6.1-5.5 6.9-3.2-.8-5.5-3.6-5.5-6.9V4L8 1.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {t(`badge.${badge}`)}
    </Badge>
  );
}
