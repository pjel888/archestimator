import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
type BadgeSize = "xs" | "sm";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  size?: BadgeSize;
  children: ReactNode;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-hairline bg-surfaceMuted text-tertiary",
  accent: "border-accent/20 bg-accent-soft text-accent-dark",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-dangerSoft bg-dangerSoft text-danger",
  info: "border-info/20 bg-info/10 text-info",
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: "min-h-4 px-1 py-px !text-[8px]",
  sm: "min-h-5 px-1.5 py-px !text-[9px]",
};

export function Badge({ className, tone = "neutral", size = "sm", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xs border font-medium leading-none tracking-normal uppercase tabular-nums",
        toneClasses[tone],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
