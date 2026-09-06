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
    <div className="flex min-h-screen flex-col bg-[#F3F4F6]">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Logo href="/" />
        <LangSwitch />
      </header>
      <main className="flex flex-1 items-center justify-center p-3 sm:p-6 md:p-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
