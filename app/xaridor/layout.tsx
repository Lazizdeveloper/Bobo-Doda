"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { TopNav } from "@/components/xaridor/TopNav";
import { CabinetFooter } from "@/components/shared/CabinetFooter";
import { SkipLink } from "@/components/shared/SkipLink";
import { authService } from "@/lib/api";

export default function XaridorLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = authService.getSession();
    if (!session) {
      if (pathname !== "/kirish") router.replace("/kirish");
      return;
    }
    if (session.role !== "xaridor") {
      const dest = session.role === "mutaxassis" ? "/mutaxassis" : "/rol-tanlash";
      if (pathname !== dest) router.replace(dest);
      return;
    }
    // Bosqich 21 — `session.verified` endi HAR DOIM true: tasdiqlash
    // (SMS OTP) hisob yaratishning O'ZIDA sodir bo'ladi (register/complete),
    // login'da alohida "tasdiqlanmagan sessiya" bosqichi umuman yo'q.
    setReady(true);
  }, [router, pathname]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-bg">
      <SkipLink />
      <TopNav base="/xaridor" />
      <main
        id="main-content"
        tabIndex={-1}
        className="workspace-container px-4 py-8 focus:outline-none sm:px-6 lg:px-8 xl:px-10 2xl:px-14"
      >
        {children}
      </main>
      <CabinetFooter />
    </div>
  );
}
