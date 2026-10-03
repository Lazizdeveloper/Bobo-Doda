"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { TopNav as XaridorTopNav } from "@/components/xaridor/TopNav";
import { TopNav as MutaxassisTopNav } from "@/components/mutaxassis/TopNav";
import { CabinetFooter } from "@/components/shared/CabinetFooter";
import { SkipLink } from "@/components/shared/SkipLink";
import { authService } from "@/lib/api";

export default function XaridorLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function check() {
      let session = authService.getSession();
      if (!session) {
        session = await authService.refresh();
        if (!active) return;
      }

      if (!session) {
        if (pathname !== "/kirish") router.replace("/kirish");
        return;
      }

      setUserRole(session.role);

      const isMarketRoute = pathname.startsWith("/xaridor/bozor");
      if (session.role !== "xaridor" && !isMarketRoute) {
        const dest = session.role === "mutaxassis" ? "/mutaxassis" : "/rol-tanlash";
        if (pathname !== dest) router.replace(dest);
        return;
      }

      setReady(true);
    }

    void check();

    return () => {
      active = false;
    };
  }, [router, pathname]);

  if (!ready) return null;

  const isSpecialist = userRole === "mutaxassis";

  return (
    <div className="min-h-screen bg-bg">
      <SkipLink />
      {isSpecialist ? (
        <MutaxassisTopNav base="/mutaxassis" />
      ) : (
        <XaridorTopNav base="/xaridor" />
      )}
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
