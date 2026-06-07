import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export type ConfidenceLevel = "high" | "medium" | "low";
type ConfidenceSize = "sm" | "md";

export type ConfidenceIndicatorProps = HTMLAttributes<HTMLDivElement> & {
  level: ConfidenceLevel;
  showLabel?: boolean;
  size?: ConfidenceSize;
};

const barColorClasses: Record<ConfidenceLevel, string> = {
  high: "bg-success",
  medium: "bg-warning",
  low: "bg-danger",
};

const textColorClasses: Record<ConfidenceLevel, string> = {
  high: "text-success",
  medium: "text-warning",
  low: "text-danger",
};

export function ConfidenceIndicator({
  level,
  showLabel,
  size = "md",
  className,
  ...props
}: ConfidenceIndicatorProps) {
  return (
    <div
      className={cn("flex items-center gap-1.5 tracking-normal", className)}
      {...props}
    >
      <div
        className={cn(
          "rounded-xs",
          size === "sm" ? "h-1 w-4" : "h-1.5 w-6",
          barColorClasses[level]
        )}
      />
      {showLabel && (
        <span
          className={cn(
            "text-[9px] font-medium uppercase leading-none",
            textColorClasses[level]
          )}
        >
          {level}
        </span>
      )}
    </div>
  );
}
