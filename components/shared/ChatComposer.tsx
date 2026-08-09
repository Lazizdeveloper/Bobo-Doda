"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/lib/i18n";

/** Xavfsizlik: FileUpload bilan bir xil cheklov (2MB, faqat rasm turlari) */
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Shartnoma/taklif chatlari uchun umumiy compose paneli — matn + ixtiyoriy
   bitta rasm ilovasi. 4 ta deyarli bir xil chat sahifasi shu bilan almashtirildi. */
export function ChatComposer({
  onSend,
}: {
  onSend: (text: string, image?: string) => Promise<void> | void;
}) {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [fileError, setFileError] = useState("");
  const [sending, setSending] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
      setFileError(t("upload.rejected"));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFileError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImage(reader.result);
    };
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() && !image) return;
    setSending(true);
    try {
      await onSend(draft.trim(), image);
      setDraft("");
      setImage(undefined);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-line p-3">
      {image && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className="h-16 w-16 rounded-input border border-line object-cover"
          />
          <button
            type="button"
            onClick={() => setImage(undefined)}
            aria-label={t("upload.remove")}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-card text-2xs text-muted transition-colors duration-150 hover:text-danger"
          >
            ×
          </button>
        </div>
      )}
      {fileError && (
        <p className="text-2xs text-danger" role="alert">
          {fileError}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={t("chat.attach")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn border border-line text-muted transition-colors duration-150 hover:bg-card-hover hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M11 5.5 5.8 10.7a2 2 0 1 1-2.8-2.8L8.9 2.1a3 3 0 1 1 4.2 4.2L7.4 12"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="flex-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("chat.placeholder")}
            aria-label={t("chat.placeholder")}
            maxLength={5000}
          />
        </div>
        <Button type="submit" loading={sending} disabled={!draft.trim() && !image}>
          {t("chat.send")}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </form>
  );
}
