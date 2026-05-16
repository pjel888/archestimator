import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-dashed border-hairline bg-surface-muted p-6 text-center", className)}>
      <h3 className="text-lg font-semibold tracking-[-0.02em]">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
