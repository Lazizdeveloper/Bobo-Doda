import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/LegalPage";

export const metadata: Metadata = {
  title: "Ommaviy oferta — Bobololadono",
  alternates: { canonical: "/oferta" },
};

export default function Page() {
  return <LegalPage kind="offer" />;
}
