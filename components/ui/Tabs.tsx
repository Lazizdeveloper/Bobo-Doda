"use client";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** "lg" — kengroq ekranlarda (xl+) yirikroq nishonlar; kichik ekranlarda "md" bilan bir xil */
  size?: "md" | "lg";
}

export function Tabs({ items, value, onChange, size = "md" }: TabsProps) {
  return (
    <div
      role="tablist"
      className="flex gap-1 overflow-x-auto border-b border-line"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors duration-150 ${
              size === "lg" ? "xl:px-4 xl:py-3 xl:text-base" : ""
            } ${
              active
                ? "border-primary font-medium text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-2xs ${
                  size === "lg" ? "xl:px-2 xl:py-0.5 xl:text-xs" : ""
                } ${
                  active ? "bg-primary/10 text-primary-deep" : "bg-card-hover text-faint"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
