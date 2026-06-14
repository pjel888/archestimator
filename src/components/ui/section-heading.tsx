import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

/**
 * Compact zone title for workshop surfaces: the app-subtitle token (11px / 500).
 * Semantic by default (`h2`); pass `as="h3"` when nesting under another heading
 * so the document outline stays correct. A trailing `aside` slot carries quiet
 * secondary context (a count, a "View all" link) on the same baseline.
 */
type SectionHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: "h2" | "h3";
  /** Quiet trailing slot rendered to the right of the title. */
  aside?: ReactNode;
};

export function SectionHeading({ as = "h2", aside, className, children, ...props }: SectionHeadingProps) {
  const Heading = as;
  if (aside === undefined || aside === null) {
    return (
      <Heading
        className={cn("text-[11px] font-medium leading-[14px] tracking-normal text-ink", className)}
        {...props}
      >
        {children}
      </Heading>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Heading
        className={cn("text-[11px] font-medium leading-[14px] tracking-normal text-ink", className)}
        {...props}
      >
        {children}
      </Heading>
      <div className="shrink-0 text-[9px] font-medium leading-3 text-secondary">{aside}</div>
    </div>
  );
}
