"use client";

import { useT } from "@/lib/i18n";

/* Klaviatura foydalanuvchilari uchun — Tab bosilganda birinchi ko'rinadi,
   asosiy kontentga sakraydi (sidebar/headerni aylanib o'tmasdan). */
export function SkipLink({ targetId = "main-content" }: { targetId?: string }) {
  const { t } = useT();
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-btn focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-primary focus:shadow-raised"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}
