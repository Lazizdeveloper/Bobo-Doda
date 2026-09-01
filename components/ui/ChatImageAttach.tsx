"use client";

import { useRef, useState } from "react";
import { ALLOWED_IMAGE_TYPES, DEFAULT_MAX_BYTES } from "@/components/ui/FileUpload";
import { useT } from "@/lib/i18n";

export interface ChatImageAttachProps {
  value?: string;
  onChange: (image: string | undefined) => void;
}

/** Chat kompozer qatoriga mos ixcham rasm biriktirish tugmasi — bitta rasm,
    FileUpload bilan bir xil tur/hajm cheklovlari. */
export function ChatImageAttach({ value, onChange }: ChatImageAttachProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const { t } = useT();

  function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError("");
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > DEFAULT_MAX_BYTES) {
      setError(t("upload.rejected"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  }

  if (value) {
    return (
      <div className="relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt={t("chat.attachedImage")}
          className="h-11 w-11 rounded-input border border-line object-cover"
        />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label={t("upload.remove")}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-line bg-card text-3xs text-muted transition-colors duration-150 hover:text-danger"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={t("chat.attachImage")}
        title={t("chat.attachImage")}
        className="flex h-11 w-11 items-center justify-center rounded-input border border-line bg-card text-muted transition-colors duration-150 hover:border-primary hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M11 5.5v5a3 3 0 0 1-6 0v-6a2 2 0 0 1 4 0v5.5a1 1 0 0 1-2 0V5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {error && (
        <p className="mt-1 max-w-24 text-3xs text-danger" role="alert">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => handleFile(e.target.files)}
      />
    </div>
  );
}
