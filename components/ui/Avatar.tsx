import { initials } from "@/lib/format";

export interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-2xs",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-lg",
};

export function Avatar({ name, src, size = "md", className = "" }: AvatarProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`shrink-0 rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading font-bold text-primary-deep ${sizeClasses[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
