import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Kirish — Bobololadono",
  description: "Bobololadono platformasiga kirish: xaridor va mutaxassis kabineti.",
  alternates: { canonical: "/kirish" },
};

export default function KirishLayout({ children }: { children: ReactNode }) {
  return children;
}
