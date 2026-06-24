"use client";

import type { Ref } from "react";
import { cn } from "@/lib/ui/cn";

export interface ProgressProps {
  ref?: Ref<HTMLDivElement>;
  value?: number;
  max?: number;
  indeterminate?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2",
};

export function Progress({ value = 0, max = 100, indeterminate = false, size = "md", showLabel = false, className, ref, ...props }: ProgressProps) {
  const percent = Math.min(Math.max(indeterminate ? 0 : (value / max) * 100, 0), 100);

  return (
    <div ref={ref} className={cn("flex items-center gap-2", className)} {...props}>
      <progress
        className="sr-only"
        max={max}
        value={indeterminate ? undefined : value}
        aria-label={showLabel ? `${Math.round(percent)}%` : undefined}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : value}
      />
      <div
        aria-hidden="true"
        className={cn(
          "relative w-full overflow-hidden rounded-xs bg-surfaceMuted",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-xs bg-primary transition-all duration-300 motion-reduce:transition-none",
            indeterminate && "animate-indeterminate motion-reduce:animate-[indeterminate_2s_linear_infinite]"
          )}
          style={
            indeterminate
              ? { width: "40%", animationTimingFunction: "linear" }
              : { width: `${percent}%` }
          }
        />
      </div>
      {showLabel && (
        <span className="text-[9px] font-medium text-muted tracking-normal tabular-nums shrink-0">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
}
