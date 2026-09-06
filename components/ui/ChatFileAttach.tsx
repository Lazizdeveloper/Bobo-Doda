"use client";

import { useRef, useState } from "react";
import type { DeliverableFile } from "@/lib/types";

export interface ChatFileAttachProps {
  onAddImages: (newImages: string[]) => void;
  onAddFiles: (newFiles: DeliverableFile[]) => void;
  attachedCount?: number;
  disabled?: boolean;
}

export function ChatFileAttach({
  onAddImages,
  onAddFiles,
  attachedCount = 0,
  disabled = false,
}: ChatFileAttachProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const newImages: string[] = [];
    const newFiles: DeliverableFile[] = [];

    setLoading(true);
    let processed = 0;

    filesArray.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        if (isImage) {
          newImages.push(result);
        } else {
          newFiles.push({
            id: `chat-file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            size: file.size,
            url: result,
            type: file.type || "application/octet-stream",
          });
        }

        processed++;
        if (processed === filesArray.length) {
          if (newImages.length > 0) onAddImages(newImages);
          if (newFiles.length > 0) onAddFiles(newFiles);
          setLoading(false);
          if (inputRef.current) inputRef.current.value = "";
        }
      };

      reader.onerror = () => {
        processed++;
        if (processed === filesArray.length) {
          setLoading(false);
          if (inputRef.current) inputRef.current.value = "";
        }
      };

      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
        aria-label="Fayl yoki rasm biriktirish"
        title="Fayl yoki rasm biriktirish (bir nechta tanlash mumkin)"
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
        accept="image/*,.pdf,.zip,.rar,.tar,.gz,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.fig,.json"
        hidden
        onChange={handleFileChange}
      />
    </div>
  );
}
