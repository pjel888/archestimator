import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type FinancialTotalCardProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  sublabel?: ReactNode;
  variant?: "primary" | "default";
};

export function FinancialTotalCard({
  label,
  value,
  sublabel,
  variant = "default",
  className,
  ...props
}: FinancialTotalCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xs p-[16px] tracking-normal",
        variant === "primary"
          ? "bg-primary text-white"
          : "border border-hairline bg-surface text-ink",
        className
      )}
      {...props}
    >
      <div className="text-[12px] font-medium">{label}</div>
      <div className="mt-1 text-[12px] font-medium tabular-nums">{value}</div>
      {sublabel && (
        <div
          className={cn(
            "mt-1 text-[10px]",
            variant === "primary" ? "text-white/80" : "text-muted"
          )}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}
