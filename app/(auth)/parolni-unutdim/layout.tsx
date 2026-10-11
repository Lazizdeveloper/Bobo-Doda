import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Parolni tiklash — Bobololadono",
  description: "Bobololadono akkauntiga kirish parolini xavfsiz tiklash.",
  alternates: { canonical: "/parolni-unutdim" },
};

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
