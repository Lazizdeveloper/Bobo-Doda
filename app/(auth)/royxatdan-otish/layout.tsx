import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Ro'yxatdan o'tish — Bobololadono",
  description: "Bobololadono platformasida ro'yxatdan o'tish: xavfsiz to'lov va professional bozor.",
  alternates: { canonical: "/royxatdan-otish" },
};

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
