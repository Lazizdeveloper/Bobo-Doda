"use client";

import { useId, useState, type KeyboardEvent } from "react";

export interface TagInputProps {
  label?: string;
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  max?: number;
}

export function TagInput({
  label,
  placeholder,
  value,
  onChange,
  error,
  max = 10,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function addTag() {
    const tag = draft.trim();
    if (!tag || value.includes(tag) || value.length >= max) return;
    onChange([...value, tag]);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <div
        className={`flex min-h-10 w-full flex-wrap items-center gap-2 rounded-input border bg-card px-3 py-2 transition-colors duration-150 focus-within:border-primary ${
          error ? "border-danger" : "border-line"
        }`}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-ink"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              aria-label={`${tag} — o'chirish`}
              className="text-muted transition-colors duration-150 hover:text-danger"
            >
              ×
            </button>
          </span>
        ))}
        <div className="flex flex-1 items-center gap-1.5 min-w-32">
          <input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            placeholder={value.length ? "" : placeholder}
            className="w-full flex-1 rounded-sm bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          />
          {draft.trim().length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag();
              }}
              aria-label="Tegni qo'shish"
              className="inline-flex h-6 shrink-0 items-center gap-1 rounded bg-primary px-2 text-2xs font-semibold text-white shadow-xs transition-transform active:scale-95"
            >
              +
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-2xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
