"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { adminGlobalSearch, type SearchResultItem } from "@/lib/admin-api";
import { Badge } from "@/components/ui/Badge";

export function AdminGlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [open]);

  const rawResults = query.trim().length >= 2 ? adminGlobalSearch(query) : [];

  const results = filterType === "all"
    ? rawResults
    : rawResults.filter((r) => r.type === filterType);

  function handleSelect(item: SearchResultItem) {
    setOpen(false);
    router.push(item.url);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  }

  const typeLabels: Record<string, { label: string; icon: string }> = {
    user: { label: "Foydalanuvchi", icon: "👤" },
    order: { label: "Shartnoma", icon: "📋" },
    kyc: { label: "KYC Hujjat", icon: "🛡️" },
    dispute: { label: "Nizo / Arbitraj", icon: "⚖️" },
    ticket: { label: "Yordam Chiptasi", icon: "🎫" },
    service: { label: "Xizmat", icon: "💼" },
    job: { label: "Loyiha", icon: "📌" },
  };

  return (
    <>
      {/* Trigger Button (placed in header) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center justify-between rounded-lg border border-line bg-surface/60 px-3 text-xs text-muted transition hover:border-primary hover:bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <span className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Operatsion qidiruv (foydalanuvchi, shartnoma, chipta)...</span>
        </span>
        <kbd className="hidden rounded border border-line bg-card px-1.5 py-0.5 font-mono text-3xs font-semibold text-muted sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* Command Palette Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16 sm:pt-24 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Search Input Bar */}
            <div className="flex items-center border-b border-line px-4 py-3">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Foydalanuvchi ismi, telefon, shartnoma ID, KYC, chipta yoki nizo qidiring..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="ml-3 flex-1 bg-transparent text-sm text-ink placeholder-muted outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted hover:bg-surface hover:text-ink"
              >
                <span className="text-xs">Esc</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 border-b border-line bg-surface/40 px-4 py-2 text-xs">
              <span className="self-center pr-1 text-3xs font-bold uppercase tracking-wider text-muted">Filtr:</span>
              {[
                { id: "all", label: "Barchasi" },
                { id: "user", label: "Foydalanuvchilar" },
                { id: "order", label: "Shartnomalar" },
                { id: "kyc", label: "KYC" },
                { id: "dispute", label: "Nizolar" },
                { id: "ticket", label: "Chiptalar" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                    filterType === f.id
                      ? "bg-primary text-white font-medium shadow-xs"
                      : "bg-card text-muted border border-line hover:border-muted hover:text-ink"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div className="max-h-96 overflow-y-auto p-2">
              {query.trim().length < 2 ? (
                <div className="py-12 text-center text-xs text-muted">
                  <p className="font-medium text-ink">Qidiruv uchun kamida 2 ta belgi kiriting</p>
                  <p className="mt-1 text-muted">
                    Masalan: <span className="font-mono text-primary">Rustam</span>, <span className="font-mono text-primary">cnt-1</span>, <span className="font-mono text-primary">+99890</span>, <span className="font-mono text-primary">dsp-1</span>
                  </p>
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted">
                  <p className="font-medium text-ink">{`"${query}"`} bo‘yicha natija topilmadi</p>
                  <p className="mt-1">Imlo xatosini tekshiring yoki filtrni o‘zgartiring.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {results.map((item, idx) => {
                    const meta = typeLabels[item.type] || { label: item.type, icon: "📄" };
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 transition ${
                          isSelected
                            ? "bg-primary/10 text-ink border border-primary/20"
                            : "hover:bg-surface text-ink border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-base border border-line">
                            {meta.icon}
                          </span>
                          <div className="truncate">
                            <p className="text-xs font-semibold text-ink truncate">{item.title}</p>
                            <p className="text-2xs text-muted truncate">{item.subtitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge tone={item.badgeTone || "neutral"} size="sm">
                            {meta.label}
                          </Badge>
                          {isSelected && (
                            <span className="text-primary text-xs font-bold">↵</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer tips */}
            <div className="flex items-center justify-between border-t border-line bg-surface/50 px-4 py-2 text-3xs text-muted">
              <div className="flex items-center gap-3">
                <span><kbd className="rounded bg-card px-1 py-0.5 border border-line">↑</kbd> <kbd className="rounded bg-card px-1 py-0.5 border border-line">↓</kbd> Harakatlanish</span>
                <span><kbd className="rounded bg-card px-1 py-0.5 border border-line">↵</kbd> O‘tish</span>
                <span><kbd className="rounded bg-card px-1 py-0.5 border border-line">Esc</kbd> Yopish</span>
              </div>
              <span className="font-semibold text-primary">Bobo&amp;Doda Operations Console</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
