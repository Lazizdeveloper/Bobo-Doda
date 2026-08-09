"use client";

import { useT } from "@/lib/i18n";
import { CURRENCIES, CURRENCY_LIST, isCurrency } from "@/lib/currency";

/* Valyuta o'zgartkichi — til yonida. Markaziy Osiyo 5 valyutasi.
   Native select: mobil + klaviatura uchun ishonchli, kam kod. */
export function CurrencySwitch() {
  const { currency, setCurrency, lang } = useT();

  return (
    <label className="relative flex items-center">
      <span className="sr-only">{lang === "ru" ? "Валюта" : lang === "en" ? "Currency" : "Valyuta"}</span>
      <select
        value={currency}
        onChange={(e) => {
          if (isCurrency(e.target.value)) setCurrency(e.target.value);
        }}
        className="h-8 appearance-none rounded-btn border border-line bg-card pl-2.5 pr-7 text-2xs font-medium uppercase text-ink transition-colors duration-150 hover:border-line-strong focus:border-primary focus:outline-none"
      >
        {CURRENCY_LIST.map((c) => (
          <option key={c} value={c}>
            {CURRENCIES[c].country} {c}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 h-3 w-3 text-faint"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
