import { cn } from "@/lib/ui/cn";

/**
 * MaturityTag — the persistent "Pre-launch MVP preview" honesty disclosure
 * (MASTER §15 / §7.4). Rides near the header wordmark (sm) and as a footer status
 * badge (md). Ink is --secondary #5D5D5D (AA-safe); #7F7F7F is NEVER used (fails AA).
 *
 * RSC-safe: no hooks, no "use client".
 */
export function MaturityTag({ size = "sm", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <span
      data-maturity="pre-launch-mvp"
      className={cn(
        "inline-flex items-center rounded-xs border border-hairline bg-surfaceMuted/60 font-numeric uppercase leading-none tracking-normal tabular-nums text-secondary",
        size === "sm" ? "min-h-4 px-1.5 !text-[8px]" : "min-h-5 px-2 !text-[9px]",
        className,
      )}
    >
      Pre-launch MVP preview
    </span>
  );
}
