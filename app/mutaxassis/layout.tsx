"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SkipLink } from "@/components/shared/SkipLink";
import { Logo } from "@/components/shared/Logo";
import { TopNav } from "@/components/mutaxassis/TopNav";
import { CabinetFooter } from "@/components/shared/CabinetFooter";
import { authService } from "@/lib/api";

export default function MutaxassisLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const isOnboarding = pathname === "/mutaxassis/royxat";

  useEffect(() => {
    const session = authService.getSession();
    if (!session) {
      if (pathname !== "/kirish") router.replace("/kirish");
      return;
    }
    if (session.role !== "mutaxassis") {
      const dest = session.role === "xaridor" ? "/xaridor" : "/rol-tanlash";
      if (pathname !== dest) router.replace(dest);
      return;
    }
    if (!session.profileDone && !isOnboarding) {
      if (pathname !== "/mutaxassis/royxat") router.replace("/mutaxassis/royxat");
      return;
    }
    // Bosqich 21 — `session.verified` endi HAR DOIM true: tasdiqlash
    // (SMS OTP) hisob yaratishning O'ZIDA sodir bo'ladi (register/complete),
    // login'da alohida "tasdiqlanmagan sessiya" bosqichi umuman yo'q.
    setReady(true);
  }, [router, pathname, isOnboarding]);

  if (!ready) return null;

  if (isOnboarding) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center px-4 sm:px-8">
          <Logo href="/mutaxassis" />
        </header>
        <main className="flex flex-1 justify-center px-4 py-8">
          <div className="w-full max-w-lg">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SkipLink />
      <TopNav base="/mutaxassis" />
      <main
        id="main-content"
        tabIndex={-1}
        className="workspace-container px-4 py-6 focus:outline-none sm:px-6 sm:py-8 xl:px-10 2xl:px-14"
      >
        {children}
      </main>
      <CabinetFooter />
    </div>
  );
}
