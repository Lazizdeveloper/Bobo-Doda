"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useInactivityTimeout } from "@/lib/hooks/useInactivityTimeout";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n";

/**
 * Global Inactivity Timeout komponenti:
 * RootLayout ichiga joylashtiriladi va barcha autentifikatsiyalangan
 * sahifalarda harakatsizlik taymerini faol tutadi.
 * 30 daqiqa harakatsizlikdan so'ng toast ko'rsatadi va /kirish ga yo'naltiradi.
 * Brauzer "Orqaga" (Back) tugmasi orqali yopiq sahifaga qaytish xavfini
 * bartaraf etish uchun `router.replace` ishlatiladi.
 */
export function InactivityTimeout() {
  const { toast } = useToast();
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();

  const handleTimeout = useCallback(() => {
    const message =
      t("auth.inactivityLogout") ||
      "Xavfsizlik yuzasidan 30 daqiqalik harakatsizlik sababli sessiyangiz yakunlandi";
    toast(message, "error");

    if (pathname !== "/kirish") {
      router.replace("/kirish?reason=inactivity");
    }
  }, [toast, t, router, pathname]);

  useInactivityTimeout({
    onTimeout: handleTimeout,
  });

  return null;
}
