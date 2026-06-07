import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export type StatusBadgeStatus =
  | "approved"
  | "review"
  | "danger"
  | "draft"
  | "active"
  | "inactive";

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  status: StatusBadgeStatus;
  showDot?: boolean;
};

const statusClasses: Record<StatusBadgeStatus, string> = {
  approved: "bg-successSoft text-success",
  review: "bg-warningSoft text-warning",
  danger: "bg-dangerSoft text-danger",
  draft: "bg-surfaceMuted text-muted",
  active: "bg-successSoft text-success",
  inactive: "bg-surfaceMuted text-tertiary",
};

const dotClasses: Record<StatusBadgeStatus, string> = {
  approved: "bg-success",
  review: "bg-warning",
  danger: "bg-danger",
  draft: "bg-muted",
  active: "bg-success",
  inactive: "bg-tertiary",
};

export function StatusBadge({
  status,
  showDot,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center min-w-[96px] rounded-xs p-[6px] text-[8px] font-medium uppercase leading-none tracking-normal",
        statusClasses[status],
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn("mr-1.5 h-1.5 w-1.5", dotClasses[status])}
          style={{ borderRadius: "50%" }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
