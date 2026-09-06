"use client";

export interface RatingStarsProps {
  value: number;
  /** Berilsa — interaktiv (baho berish) rejimi */
  onChange?: (value: number) => void;
  size?: "sm" | "md";
  showValue?: boolean;
}

export function RatingStars({
  value,
  onChange,
  size = "sm",
  showValue = false,
}: RatingStarsProps) {
  const px = size === "sm" ? 14 : 20;
  const interactive = !!onChange;

  return (
    <span
      className="inline-flex items-center gap-1"
      role={interactive ? "radiogroup" : undefined}
      aria-label={interactive ? "Baho" : `${value.toFixed(1)} / 5`}
    >
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(value);
          const icon = (
            <svg
              width={px}
              height={px}
              viewBox="0 0 16 16"
              fill={filled ? "#f59e0b" : "none"}
              stroke={filled ? "#f59e0b" : "#d4ccc4"}
              strokeWidth="1.2"
              aria-hidden="true"
            >
              <path d="M8 1.5l2 4.1 4.5.6-3.3 3.2.8 4.5L8 11.8l-4 2.1.8-4.5L1.5 6.2 6 5.6 8 1.5Z" />
            </svg>
          );
          if (!interactive) return <span key={star}>{icon}</span>;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === Math.round(value)}
              aria-label={`${star} yulduz`}
              onClick={() => onChange(star)}
              className="rounded transition-colors duration-150 hover:opacity-80"
            >
              {icon}
            </button>
          );
        })}
      </span>
      {showValue && (
        <span className="text-xs font-medium text-ink">{value.toFixed(1)}</span>
      )}
    </span>
  );
}
