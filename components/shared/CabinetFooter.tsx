"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

/* Kabinet ichidagi ixcham pastki qism. Ilgari huquqiy sahifalar
   (shartlar/maxfiylik/oferta) va Yordam markazi FAQAT landing footer'idan
   havola qilingan edi — kabinetga kirgan foydalanuvchi ularga umuman
   chiqa olmasdi. */
const LINKS = [
  { href: "/shartlar", key: "foot.terms" },
  { href: "/maxfiylik", key: "foot.privacy" },
  { href: "/oferta", key: "foot.offer" },
  { href: "/yordam-markazi", key: "foot.help" },
  { href: "/savol-javob", key: "foot.faq" },
];

export function CabinetFooter() {
  const { t } = useT();
  return (
    <footer className="mt-10 border-t border-line px-4 py-6 sm:px-6 xl:px-10 2xl:px-14">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-2xs text-muted transition-colors duration-150 hover:text-ink hover:underline"
          >
            {t(link.key)}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("bobododa:open-feedback"));
            }
          }}
          className="text-2xs text-muted transition-colors duration-150 hover:text-ink hover:underline cursor-pointer"
        >
          {t("foot.feedback")}
        </button>
        <span className="ml-auto text-2xs text-faint">
          © {new Date().getFullYear()} Bobo&amp;Doda
        </span>
      </nav>
    </footer>
  );
}
