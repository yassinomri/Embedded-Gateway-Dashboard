import { useId } from "react";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

interface BrandMarkProps {
  className?: string;
}

/** Hexagonal gateway mark: a central node linked to three edge devices. */
export function BrandMark({ className }: BrandMarkProps) {
  const gradId = `brand-grad-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-10 w-10", className)}
      role="img"
      aria-label={`${brand.name} logo`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <path
        d="M24 3 42 13.5v21L24 45 6 34.5v-21Z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M24 3 42 13.5v21L24 45 6 34.5v-21Z"
        fill="none"
        stroke="#99f6e4"
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      <g stroke="#f0fdfa" strokeWidth="2.2" strokeLinecap="round">
        <line x1="24" y1="24" x2="24" y2="12.5" />
        <line x1="24" y1="24" x2="14" y2="30" />
        <line x1="24" y1="24" x2="34" y2="30" />
      </g>
      <g fill="#f0fdfa">
        <circle cx="24" cy="12" r="3" />
        <circle cx="13.5" cy="30.5" r="3" />
        <circle cx="34.5" cy="30.5" r="3" />
      </g>
      <circle cx="24" cy="24" r="4.5" fill="#f0fdfa" />
      <circle cx="24" cy="24" r="2" fill="#0f766e" />
    </svg>
  );
}

interface BrandLogoProps {
  className?: string;
  showTagline?: boolean;
  tone?: "light" | "dark";
}

/** Logo mark plus product name. */
export function BrandLogo({ className, showTagline = false, tone = "light" }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark className="shrink-0" />
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            "whitespace-nowrap font-tech font-semibold tracking-wide",
            showTagline ? "text-base" : "text-[13px]",
            tone === "light" ? "text-white" : "text-slate-900 dark:text-white"
          )}
        >
          {brand.name}
        </span>
        {showTagline && (
          <span
            className={cn(
              "text-xs",
              tone === "light" ? "text-slate-400" : "text-slate-500 dark:text-slate-400"
            )}
          >
            {brand.tagline}
          </span>
        )}
      </div>
    </div>
  );
}
