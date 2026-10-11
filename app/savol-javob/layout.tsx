import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Ko'p beriladigan savollar (FAQ) — Bobololadono",
  description:
    "Bobololadono platformasi, xavfsiz to'lov va mutaxassislar bo'yicha ko'p beriladigan savollarga javoblar.",
  alternates: { canonical: "/savol-javob" },
};

export default function FaqLayout({ children }: { children: ReactNode }) {
  return children;
}
