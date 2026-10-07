import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/LegalPage";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati — Bobololadono",
  alternates: { canonical: "/maxfiylik" },
};

export default function Page() {
  return <LegalPage kind="privacy" />;
}
