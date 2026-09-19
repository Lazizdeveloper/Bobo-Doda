import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/LegalPage";

export const metadata: Metadata = {
  title: "Foydalanish shartlari — Bobo&Doda",
  alternates: { canonical: "/shartlar" },
};

export default function Page() {
  return <LegalPage kind="terms" />;
}
