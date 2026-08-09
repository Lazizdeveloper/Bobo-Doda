"use client";

import { useT, type Lang } from "@/lib/i18n";

export function LangSwitch() {
  const { lang, setLang } = useT();
  const options: Lang[] = ["uz", "ru", "en"];
  return (
    <div
      className="flex rounded-btn border border-line bg-card p-0.5"
      role="group"
      aria-label="Til / Язык"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLang(option)}
          aria-pressed={lang === option}
          className={`rounded-[8px] px-1.5 py-1 text-2xs font-medium uppercase sm:px-2.5 transition-colors duration-150 ${
            lang === option
              ? "bg-primary text-on-primary"
              : "text-muted hover:text-ink"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
