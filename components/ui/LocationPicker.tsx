"use client";

import { useEffect, useState } from "react";
import { COUNTRIES, buildLocationString, parseLocationString, validateCustomCity } from "@/lib/geo";
import { useT } from "@/lib/i18n";

interface LocationPickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export function LocationPicker({
  value = "",
  onChange,
  label,
  error,
  disabled = false,
  required = false,
}: LocationPickerProps) {
  const { lang } = useT();
  const parsed = parseLocationString(value);

  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [cityChoice, setCityChoice] = useState(() => {
    if (!parsed.city) return "";
    const activeCountry = COUNTRIES.find((c) => c.code === parsed.countryCode);
    const inList = activeCountry?.cities.some(
      (ct) =>
        ct.uz.toLowerCase() === parsed.city.toLowerCase() ||
        ct.ru.toLowerCase() === parsed.city.toLowerCase() ||
        ct.en.toLowerCase() === parsed.city.toLowerCase()
    );
    return inList ? parsed.city : "custom";
  });
  const [customCity, setCustomCity] = useState(cityChoice === "custom" ? parsed.city : "");
  const [localCityError, setLocalCityError] = useState("");

  const currentCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0]!;

  // Mamlakat o'zgarganda
  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    const country = COUNTRIES.find((c) => c.code === newCode) || COUNTRIES[0]!;
    if (country.cities.length > 0) {
      const defaultCity = lang === "ru" ? country.cities[0]!.ru : country.cities[0]!.uz;
      setCityChoice(defaultCity);
      setCustomCity("");
      setLocalCityError("");
      const full = buildLocationString(defaultCity, lang === "ru" ? country.nameRu : country.nameUz);
      onChange(full);
    } else {
      setCityChoice("custom");
      setCustomCity("");
      setLocalCityError("");
      onChange(lang === "ru" ? country.nameRu : country.nameUz);
    }
  };

  // Shahar tanlovi o'zgarganda
  const handleCitySelect = (choice: string) => {
    setCityChoice(choice);
    setLocalCityError("");
    const countryName = lang === "ru" ? currentCountry.nameRu : currentCountry.nameUz;
    if (choice === "custom") {
      setCustomCity("");
      onChange(countryName);
    } else {
      const full = buildLocationString(choice, countryName);
      onChange(full);
    }
  };

  // Erkin shahar nomi kiritilganda
  const handleCustomCityChange = (typed: string) => {
    setCustomCity(typed);
    const check = validateCustomCity(typed);
    const countryName = lang === "ru" ? currentCountry.nameRu : currentCountry.nameUz;
    if (!check.valid && typed.trim().length > 0) {
      setLocalCityError(check.error || "Noto'g'ri shahar formati");
    } else {
      setLocalCityError("");
    }
    const full = buildLocationString(typed.trim(), countryName);
    onChange(full);
  };

  // Value prop tashqaridan yangilanganda sinxronlash
  useEffect(() => {
    if (!value) return;
    const p = parseLocationString(value);
    setCountryCode(p.countryCode);
    const activeCountry = COUNTRIES.find((c) => c.code === p.countryCode);
    const inList = activeCountry?.cities.some(
      (ct) =>
        ct.uz.toLowerCase() === p.city.toLowerCase() ||
        ct.ru.toLowerCase() === p.city.toLowerCase() ||
        ct.en.toLowerCase() === p.city.toLowerCase()
    );
    if (inList) {
      setCityChoice(p.city);
    } else if (p.city) {
      setCityChoice("custom");
      setCustomCity(p.city);
    }
  }, [value]);

  const displayError = error || localCityError;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold text-ink">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Davlat tanlash */}
        <div>
          <select
            value={countryCode}
            disabled={disabled}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full rounded-btn border border-line bg-surface px-3 py-2.5 text-xs font-medium text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 cursor-pointer"
          >
            {COUNTRIES.map((cnt) => (
              <option key={cnt.code} value={cnt.code}>
                {cnt.flag} {lang === "ru" ? cnt.nameRu : cnt.nameUz}
              </option>
            ))}
          </select>
        </div>

        {/* Shahar tanlash */}
        {currentCountry.cities.length > 0 ? (
          <div>
            <select
              value={cityChoice}
              disabled={disabled}
              onChange={(e) => handleCitySelect(e.target.value)}
              className="w-full rounded-btn border border-line bg-surface px-3 py-2.5 text-xs font-medium text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 cursor-pointer"
            >
              {currentCountry.cities.map((ct, idx) => {
                const cName = lang === "ru" ? ct.ru : ct.uz;
                return (
                  <option key={idx} value={cName}>
                    {cName}
                  </option>
                );
              })}
              <option value="custom">
                {lang === "ru" ? "✏️ Другой город..." : "✏️ Boshqa shahar..."}
              </option>
            </select>
          </div>
        ) : (
          <div>
            <input
              type="text"
              disabled={disabled}
              value={customCity}
              onChange={(e) => handleCustomCityChange(e.target.value)}
              placeholder={lang === "ru" ? "Введите название города" : "Shahar nomini kiriting"}
              className={`w-full rounded-btn border px-3 py-2.5 text-xs font-medium text-ink focus:outline-none focus:ring-1 ${
                displayError ? "border-danger focus:ring-danger" : "border-line bg-surface focus:border-primary focus:ring-primary"
              }`}
            />
          </div>
        )}
      </div>

      {/* Agar "Boshqa shahar" tanlansa, erkin shahar kiritish inputi chiqadi */}
      {cityChoice === "custom" && currentCountry.cities.length > 0 && (
        <div className="mt-1">
          <input
            type="text"
            disabled={disabled}
            value={customCity}
            onChange={(e) => handleCustomCityChange(e.target.value)}
            placeholder={
              lang === "ru"
                ? "Shahar nomini kiriting (masalan: Samara, Omsk)"
                : "Shahar nomini kiriting (masalan: Denov, Kattaqo'rg'on)"
            }
            className={`w-full rounded-btn border px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:ring-1 ${
              displayError ? "border-danger focus:ring-danger" : "border-line bg-surface focus:border-primary focus:ring-primary"
            }`}
          />
        </div>
      )}

      {/* Tanlangan lokatsiya preview va xatolik */}
      <div className="flex items-center justify-between text-2xs mt-0.5">
        {displayError ? (
          <span className="font-medium text-danger">{displayError}</span>
        ) : (
          value && (
            <span className="text-muted flex items-center gap-1">
              <span>📍</span>
              <span className="font-semibold text-ink">{value}</span>
            </span>
          )
        )}
      </div>
    </div>
  );
}
