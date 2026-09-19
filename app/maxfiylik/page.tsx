import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/LegalPage";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati — Bobo&Doda",
  alternates: { canonical: "/maxfiylik" },
};

export default function Page() {
  return <LegalPage kind="privacy" />;
}
