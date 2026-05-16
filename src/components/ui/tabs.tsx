import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export function TabList({ children, className, ariaLabel = "Workspace sections" }: { children: ReactNode; className?: string; ariaLabel?: string }) {
  return <div role="tablist" aria-label={ariaLabel} className={cn("grid rounded-2xl border border-hairline bg-surface p-1 text-sm shadow-sm", className)}>{children}</div>;
}

export function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} className={cn("rounded-xl px-3 py-2 font-semibold capitalize transition", active ? "bg-foreground text-white" : "text-muted hover:bg-surface-muted")} onClick={onClick}>{children}</button>;
}
