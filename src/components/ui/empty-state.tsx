import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex min-h-40 flex-col items-center justify-center border border-dashed border-divider bg-surfaceMuted/60 p-2 text-center", className)}>
      {icon ? <div className="mb-2 text-tertiary">{icon}</div> : null}
      <p className="text-[11px] font-medium leading-4 text-ink">{title}</p>
      {description ? <p className="mt-0.5 max-w-56 text-[9px] leading-4 text-tertiary">{description}</p> : null}
      {action ? <div className="mt-2 flex items-center justify-center gap-1">{action}</div> : null}
    </div>
  );
}
