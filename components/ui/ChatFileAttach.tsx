"use client";

import { useRef, useState } from "react";
import { filesService } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import {
  ATTACHMENT_ACCEPT,
  isImageAttachment,
  MAX_ATTACHMENTS,
} from "@/lib/attachments";
import { useT } from "@/lib/i18n";
import type { DeliverableFile } from "@/lib/types";

export interface ChatFileAttachProps {
  onAddImages: (newImages: string[]) => void;
  onAddFiles: (newFiles: DeliverableFile[]) => void;
  attachedCount?: number;
  disabled?: boolean;
  /** Rad etilgan fayl haqida xabar (toast ko'rsatish uchun) */
  onError?: (message: string) => void;
}

export function ChatFileAttach({
  onAddImages,
  onAddFiles,
  attachedCount = 0,
  disabled = false,
  onError,
}: ChatFileAttachProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useT();

  /* Fayl yuklash API chegarasidan o'tadi (`filesService.upload`) — u tur va
     hajmni tekshiradi va data-URL qaytaradi. Ilgari bu yerda tekshiruvsiz
     `FileReader` ishlatilardi: 30 MB'lik ZIP localStorage kvotasini to'ldirib,
     xabar jimgina yuborilmasdi. */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const picked = Array.from(fileList).slice(
      0,
      Math.max(0, MAX_ATTACHMENTS - attachedCount)
    );
    if (picked.length < fileList.length) onError?.(t("upload.tooMany"));
    if (picked.length === 0) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setLoading(true);
    const images: string[] = [];
    const files: DeliverableFile[] = [];
    let rejected = "";

    for (const file of picked) {
      try {
        const uploaded = await filesService.upload(file);
        if (isImageAttachment(uploaded)) images.push(uploaded.url);
        else files.push(uploaded);
      } catch (error) {
        /* `ApiError.message` — ma'lumot qatlami tashlagan kod satri
           ("FILE_TOO_LARGE"), foydalanuvchi matni emas. */
        const code = error instanceof ApiError ? error.message : "";
        rejected =
          code === "FILE_TOO_LARGE"
            ? t("upload.tooLarge")
            : t("upload.rejected");
      }
    }

    if (images.length > 0) onAddImages(images);
    if (files.length > 0) onAddFiles(files);
    if (rejected) onError?.(rejected);

    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const full = attachedCount >= MAX_ATTACHMENTS;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={disabled || loading || full}
        onClick={() => inputRef.current?.click()}
        aria-label={t("chat.attachLabel")}
        title={full ? t("upload.tooMany") : t("chat.attachLabel")}
        className="flex h-11 w-11 items-center justify-center rounded-input border border-line bg-card text-muted transition-colors duration-150 hover:border-primary hover:text-ink disabled:opacity-50"
      >
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        )}
        {attachedCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-3xs font-bold text-on-primary shadow-xs">
            {attachedCount}
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        hidden
        onChange={handleFileChange}
      />
    </div>
  );
}
