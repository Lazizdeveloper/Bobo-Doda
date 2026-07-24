"use client";

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";

/** Xavfsizlik: faqat rasm turlari va 2MB gacha (localStorage DoS himoyasi) */
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export interface FileUploadProps {
  label?: string;
  /** base64 data-URL ro'yxati */
  value: string[];
  onChange: (images: string[]) => void;
  max?: number;
  error?: string;
}

export function FileUpload({
  label,
  value,
  onChange,
  max = 5,
  error,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const { t } = useT();

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setFileError("");
    const remaining = max - value.length;
    const picked = Array.from(files).slice(0, remaining);
    /* Tur va hajm tekshiruvi — noto'g'ri fayllar rad etiladi */
    const valid = picked.filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_BYTES
    );
    if (valid.length < picked.length) setFileError(t("upload.rejected"));
    if (!valid.length) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    Promise.all(
      valid.map(
        (file) =>
          new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve(typeof reader.result === "string" ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          })
      )
    ).then((results) => {
      const images = results.filter((src): src is string => !!src);
      if (images.length) onChange([...value, ...images]);
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  const full = value.length >= max;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      <div className="flex flex-wrap gap-3">
        {value.map((src, i) => (
          <div key={i} className="group relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${i + 1}-rasm`}
              className="h-20 w-20 rounded-input border border-line object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              aria-label={t("upload.remove")}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-card text-2xs text-muted transition-colors duration-150 hover:text-danger"
            >
              ×
            </button>
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-input border border-dashed border-line bg-card text-muted transition-colors duration-150 hover:border-primary hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="px-1 text-center text-2xs">{t("upload.cta")}</span>
          </button>
        )}
      </div>
      <p className="text-2xs text-faint">
        {full ? t("upload.limit") : `${t("upload.hint")} · ${value.length}/${max}`}
      </p>
      {(fileError || error) && (
        <p className="text-2xs text-danger" role="alert">
          {fileError || error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
