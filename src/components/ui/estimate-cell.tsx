import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type EstimateCellProps = HTMLAttributes<HTMLDivElement> & {
  value: ReactNode;
  selected?: boolean;
  editing?: boolean;
  numeric?: boolean;
  align?: "left" | "center" | "right";
};

export function EstimateCell({
  value,
  selected,
  editing,
  numeric,
  align = "left",
  className,
  ...props
}: EstimateCellProps) {
  return (
    <div
      className={cn(
        "flex h-[36px] items-center border border-hairline p-[8px] text-[10px] font-normal tracking-normal",
        selected ? "bg-accentSoft text-ink" : "bg-surface text-ink",
        editing && "ring-1 ring-primary",
        numeric && "font-medium tabular-nums",
        align === "left" && "justify-start",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        className
      )}
      {...props}
    >
      {value}
    </div>
  );
}
