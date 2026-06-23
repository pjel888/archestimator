import * as React from "react";
import { cn } from "@/lib/ui/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
  interactive?: boolean;
}

export function Card({ className, interactive = false, ref, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-surface border border-hairline rounded-xs text-ink",
        interactive && "transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_16px_38px_-34px_rgba(17,17,17,0.45)] hover:border-muted",
        className
      )}
      {...props}
    />
  );
}
