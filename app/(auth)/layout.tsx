"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { LangSwitch } from "@/components/shared/LangSwitch";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isKirish = pathname === "/kirish";

  if (isKirish) {
    return <main className="min-h-screen w-full overflow-x-hidden">{children}</main>;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#FAFAFC] overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[140px]" />

      <header className="relative z-10 flex h-20 sm:h-24 items-center justify-between px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto w-full">
        <Logo href="/" className="scale-105 sm:scale-115 origin-left" />
        <LangSwitch />
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16">
        <div className="w-full max-w-xl sm:max-w-2xl lg:max-w-[680px] xl:max-w-[720px] transition-all duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
