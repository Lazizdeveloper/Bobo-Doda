import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Yordam markazi — Bobololadono",
  description:
    "Bobololadono yo'riqnomalari va qo'llab-quvvatlash markazi: xizmatlar, shartnomalar va xavfsiz to'lovlar.",
  alternates: { canonical: "/yordam-markazi" },
};

export default function HelpCenterLayout({ children }: { children: ReactNode }) {
  return children;
}
