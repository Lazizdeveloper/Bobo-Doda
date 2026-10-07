import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/LegalPage";

export const metadata: Metadata = {
  title: "Foydalanish shartlari — Bobololadono",
  alternates: { canonical: "/shartlar" },
};

export default function Page() {
  return <LegalPage kind="terms" />;
}
