import * as React from "react";
import { cn } from "@/lib/ui/cn";

export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  ref?: React.Ref<HTMLHRElement>;
  orientation?: "horizontal" | "vertical";
}

export function Separator({ className, orientation = "horizontal", ref, ...props }: SeparatorProps) {
  return (
    <hr
      ref={ref}
      aria-orientation={orientation}
      className={cn(
        "shrink-0 border-0 bg-hairline",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  );
}
