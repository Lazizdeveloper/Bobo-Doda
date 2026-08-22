"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SupportModal } from "./SupportModal";

interface OpenOptions {
  /** Qayerdan ochilgani — navbar | footer | faq | help-center | project | profile ... */
  source: string;
  /** Ixtiyoriy: aniq route/article context (masalan Help Center maqolasi).
      Berilmasa, joriy pathname avtomatik ishlatiladi. */
  route?: string;
}

interface SupportModalContextValue {
  openSupportModal: (opts: OpenOptions) => void;
  closeSupportModal: () => void;
}

const SupportModalContext = createContext<SupportModalContextValue>({
  openSupportModal: () => {},
  closeSupportModal: () => {},
});

export function SupportModalProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("unknown");
  const [route, setRoute] = useState<string | undefined>(undefined);

  // Close modal on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const openSupportModal = useCallback((opts: OpenOptions) => {
    // Do not open public support modal on admin routes
    if (pathname && (pathname.startsWith("/admin") || pathname.startsWith("/rahbariyat"))) {
      return;
    }
    setSource(opts.source);
    setRoute(opts.route);
    setOpen(true);
  }, [pathname]);

  const closeSupportModal = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ openSupportModal, closeSupportModal }), [openSupportModal, closeSupportModal]);

  const isAdminRoute = Boolean(pathname && (pathname.startsWith("/admin") || pathname.startsWith("/rahbariyat")));

  return (
    <SupportModalContext.Provider value={value}>
      {children}
      {!isAdminRoute && (
        <SupportModal open={open} onClose={() => setOpen(false)} source={source} route={route} />
      )}
    </SupportModalContext.Provider>
  );
}

export function useSupportModal(): SupportModalContextValue {
  return useContext(SupportModalContext);
}

