import type { HTMLAttributes } from "react";

import { cn } from "@/lib/ui/cn";

export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "block min-h-3 truncate text-[9px] font-medium uppercase leading-3 tracking-normal text-secondary",
        className,
      )}
      {...props}
    />
  );
}
