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
        "flex flex-col rounded-xs p-4 tracking-normal",
        variant === "primary"
          ? "bg-primary text-white"
          : "border border-hairline bg-surface text-ink",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "text-[10px] font-medium uppercase tracking-wider",
          variant === "primary" ? "text-white/70" : "text-tertiary"
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-semibold tabular-nums leading-tight",
          variant === "primary" ? "text-[28px]" : "text-[24px]"
        )}
      >
        {value}
      </div>
      {sublabel && (
        <div
          className={cn(
            "mt-1 text-[10px]",
            variant === "primary" ? "text-white/70" : "text-muted"
          )}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}
