"use client";

import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { useT } from "@/lib/i18n";

/** KYC (hujjat) tasdiqlanganlik belgisi — TrustBadge (reyting asosida) va
    User.verified (Telegram)dan alohida, VerificationRecord.status === "tasdiqlangan"
    ga bog'liq real identity tekshiruvi. */
export function IdentityVerifiedBadge() {
  const { t } = useT();
  return (
    <Tooltip content={t("badge.identityVerifiedHint")}>
      <Badge tone="info">
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
          <path
            d="M5.7 8.1 7.3 9.7 10.4 6.3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t("badge.identityVerified")}
      </Badge>
    </Tooltip>
  );
}
