import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("min-h-screen bg-background px-4 py-8 text-foreground lg:px-8", className)}>{children}</main>;
}

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("mx-auto max-w-6xl", className)}>{children}</section>;
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-hairline bg-surface p-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? <p className="text-sm font-medium uppercase tracking-[0.16em] text-accent">{eyebrow}</p> : null}
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.04em]">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
