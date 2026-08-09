"use client";

import type { ReactNode } from "react";
import { Logo } from "@/components/shared/Logo";
import { LangSwitch } from "@/components/shared/LangSwitch";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Logo href="/kirish" />
        <LangSwitch />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
