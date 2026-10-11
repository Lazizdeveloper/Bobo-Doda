"use client";

import { usePathname, useRouter } from "next/navigation";
import { useT, type Lang } from "@/lib/i18n";

export function LangSwitch() {
  const { lang, setLang, t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const options: Lang[] = ["uz", "ru", "en"];

  const handleSelect = (option: Lang) => {
    setLang(option);
    if (pathname && typeof window !== "undefined") {
      const isPublicPath =
        pathname === "/" ||
        pathname === "/ru" ||
        pathname === "/en" ||
        pathname.startsWith("/ru/") ||
        pathname.startsWith("/en/") ||
        pathname.startsWith("/oferta") ||
        pathname.startsWith("/maxfiylik") ||
        pathname.startsWith("/shartlar") ||
        pathname.startsWith("/savol-javob") ||
        pathname.startsWith("/yordam-markazi");

      if (isPublicPath) {
        const barePath = pathname.replace(/^\/(ru|en)(\/|$)/, "/") || "/";
        const newPath =
          option === "uz"
            ? barePath
            : `/${option}${barePath === "/" ? "" : barePath}`;
        if (newPath !== pathname) {
          router.push(newPath);
        }
      }
    }
  };

  return (
    <div
      className="flex rounded-btn border border-line bg-card p-0.5"
      role="group"
      aria-label={t("a11y.language")}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => handleSelect(option)}
          aria-pressed={lang === option}
          className={`rounded-[8px] px-1.5 py-1 text-2xs font-semibold uppercase sm:px-2.5 transition-colors duration-150 cursor-pointer ${
            lang === option
              ? "bg-primary-deep text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
