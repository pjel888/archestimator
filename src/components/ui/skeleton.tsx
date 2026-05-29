import { cn } from "@/lib/ui/cn";

/**
 * Generic skeleton block for loading states.
 * Matches the design system's border-radius and animation patterns.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xs bg-muted/40",
        "motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
