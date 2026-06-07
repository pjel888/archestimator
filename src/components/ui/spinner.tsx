import * as React from "react";
import { cn } from "@/lib/ui/cn";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg";
}

const sizeClasses = {
  xs: "w-[12px] h-[12px] border-[1.5px]",
  sm: "w-[16px] h-[16px] border-2",
  md: "w-[24px] h-[24px] border-2",
  lg: "w-[32px] h-[32px] border-[3px]",
};

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        style={{ borderRadius: "50%" }}
        className={cn(
          "inline-block animate-spin border-hairline border-t-ink motion-reduce:animate-[spin_1.5s_linear_infinite]",
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Spinner.displayName = "Spinner";
