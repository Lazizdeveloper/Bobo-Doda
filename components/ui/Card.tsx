import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  padding?: "none" | "md" | "lg";
  /** Tepasida qizil yugurma chok — faqat asosiy panellar uchun */
  stitch?: boolean;
}

const paddingClasses = {
  none: "",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  children,
  hoverable = false,
  padding = "md",
  stitch = false,
  className = "",
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-card border border-line bg-card ${stitch ? "sb-stitch" : ""} ${paddingClasses[padding]} ${
        hoverable
          ? "transition-colors duration-150 hover:border-line-strong hover:bg-card-hover"
          : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
