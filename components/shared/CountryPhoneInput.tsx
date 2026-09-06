"use client";

import { useState, useRef, useEffect, useId } from "react";

export interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  mask: string; // e.g. "(XX) XXX-XX-XX"
  length: number; // raw digits count excluding dial code
  placeholder: string;
}

export const CENTRAL_ASIA_COUNTRIES: Country[] = [
  {
    code: "UZ",
    name: "O'zbekiston",
    flag: "🇺🇿",
    dialCode: "+998",
    mask: "(XX) XXX-XX-XX",
    length: 9,
    placeholder: "(90) 123-45-67",
  },
  {
    code: "KZ",
    name: "Qozog'iston",
    flag: "🇰🇿",
    dialCode: "+7",
    mask: "(XXX) XXX-XX-XX",
    length: 10,
    placeholder: "(701) 123-45-67",
  },
  {
    code: "KG",
    name: "Qirg'iziston",
    flag: "🇰🇬",
    dialCode: "+996",
    mask: "(XXX) XXX-XXX",
    length: 9,
    placeholder: "(555) 123-456",
  },
  {
    code: "TJ",
    name: "Tojikiston",
    flag: "🇹🇯",
    dialCode: "+992",
    mask: "(XX) XXX-XX-XX",
    length: 9,
    placeholder: "(90) 123-45-67",
  },
  {
    code: "TM",
    name: "Turkmaniston",
    flag: "🇹🇲",
    dialCode: "+993",
    mask: "(XX) XX-XX-XX",
    length: 8,
    placeholder: "(65) 12-34-56",
  },
  {
    code: "OTHER",
    name: "Boshqa davlat",
    flag: "🌐",
    dialCode: "+",
    mask: "XXXXXXXXXXXXXXX",
    length: 15,
    placeholder: "901234567",
  },
];

interface CountryPhoneInputProps {
  value: string; // full number e.g. "+998901234567"
  onChange: (fullNumber: string, isValid: boolean) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
  id?: string;
}

function formatWithMask(digits: string, mask: string): string {
  let digitIndex = 0;
  let formatted = "";
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === "X") {
      if (digitIndex < digits.length) {
        formatted += digits[digitIndex++];
      } else {
        break;
      }
    } else {
      if (digitIndex < digits.length) {
        formatted += mask[i];
      }
    }
  }
  return formatted;
}

export function CountryPhoneInput({
  value,
  onChange,
  error,
  disabled,
  autoFocus,
  label,
  id: externalId,
}: CountryPhoneInputProps) {
  const generatedId = useId();
  const inputId = externalId || generatedId;

  // Selected country state
  const [selectedCountry, setSelectedCountry] = useState<Country>(CENTRAL_ASIA_COUNTRIES[0]);
  const [nationalNumber, setNationalNumber] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse external value on load or change
  useEffect(() => {
    if (!value) {
      setNationalNumber("");
      return;
    }
    const clean = value.replace(/[^\d+]/g, "");
    // Check if value matches any dial code
    const matched = CENTRAL_ASIA_COUNTRIES.find(
      (c) => c.code !== "OTHER" && clean.startsWith(c.dialCode)
    );
    if (matched) {
      setSelectedCountry(matched);
      const digits = clean.slice(matched.dialCode.length).slice(0, matched.length);
      setNationalNumber(formatWithMask(digits, matched.mask));
    } else if (clean.startsWith("+")) {
      const other = CENTRAL_ASIA_COUNTRIES.find((c) => c.code === "OTHER")!;
      setSelectedCountry(other);
      setNationalNumber(clean.slice(1));
    } else {
      // Default to Uzbekistan if raw 9 digits
      const digits = clean.slice(0, 9);
      setSelectedCountry(CENTRAL_ASIA_COUNTRIES[0]);
      setNationalNumber(formatWithMask(digits, CENTRAL_ASIA_COUNTRIES[0].mask));
    }
  }, [value]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  function handleCountrySelect(country: Country) {
    setSelectedCountry(country);
    setIsOpen(false);
    // Re-format existing digits with new country mask
    const rawDigits = nationalNumber.replace(/\D/g, "").slice(0, country.length);
    const formatted = country.code === "OTHER" ? rawDigits : formatWithMask(rawDigits, country.mask);
    setNationalNumber(formatted);

    const fullNumber = country.dialCode + rawDigits;
    const isValid = country.code === "OTHER" ? rawDigits.length >= 7 : rawDigits.length === country.length;
    onChange(fullNumber, isValid);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    const rawDigits = text.replace(/\D/g, "").slice(0, selectedCountry.length);

    const formatted =
      selectedCountry.code === "OTHER"
        ? rawDigits
        : formatWithMask(rawDigits, selectedCountry.mask);

    setNationalNumber(formatted);

    const fullNumber = selectedCountry.dialCode + rawDigits;
    const isValid =
      selectedCountry.code === "OTHER"
        ? rawDigits.length >= 7
        : rawDigits.length === selectedCountry.length;

    onChange(fullNumber, isValid);
  }

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs sm:text-sm font-bold text-ink mb-2">
          {label}
        </label>
      )}

      <div
        className={`relative flex items-center w-full h-13 sm:h-14 rounded-2xl border transition-all bg-surface/60 ${
          error
            ? "border-danger focus-within:ring-2 focus-within:ring-danger/20"
            : "border-line focus-within:border-primary focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20"
        } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
      >
        {/* Country Selector Dropdown Toggle */}
        <div ref={dropdownRef} className="relative h-full flex items-center">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="h-full flex items-center gap-2 pl-3.5 pr-2.5 sm:pl-4 sm:pr-3 text-sm sm:text-base font-bold text-ink hover:bg-black/5 rounded-l-2xl border-r border-line/70 transition-colors cursor-pointer select-none focus:outline-none"
            aria-label={`Davlat kodi: ${selectedCountry.name}`}
            aria-expanded={isOpen}
          >
            <span className="text-xl sm:text-2xl leading-none">{selectedCountry.flag}</span>
            <span className="text-xs sm:text-sm font-black text-ink">{selectedCountry.dialCode}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-64 max-h-72 overflow-y-auto rounded-2xl border border-line bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 text-2xs uppercase font-bold text-muted tracking-wider border-b border-line/50">
                Markaziy Osiyo va boshqa
              </div>
              {CENTRAL_ASIA_COUNTRIES.map((country) => {
                const isSelected = country.code === selectedCountry.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-ink hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{country.flag}</span>
                      <span>{country.name}</span>
                    </div>
                    <span className="text-xs font-bold text-muted font-mono">{country.dialCode}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* National Number Input */}
        <input
          id={inputId}
          ref={inputRef}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          disabled={disabled}
          autoFocus={autoFocus}
          value={nationalNumber}
          onChange={handleInputChange}
          placeholder={selectedCountry.placeholder}
          className="flex-1 h-full bg-transparent px-3.5 sm:px-4 text-sm sm:text-base font-medium text-ink placeholder:text-muted/50 outline-none rounded-r-2xl"
        />
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-danger font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
