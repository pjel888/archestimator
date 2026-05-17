import type { ReactNode } from "react";

import { MainSidebar } from "@/components/sidebar/MainSidebar";

type WorkshopPageShellProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function WorkshopPageShell({
  title,
  eyebrow = "Workshop",
  description,
  actions,
  footer,
  children,
}: WorkshopPageShellProps) {
  return (
    <main className="h-dvh overflow-hidden bg-canvas text-ink" aria-label={title}>
      <MainSidebar />
      <section className="flex h-full min-h-0 flex-col lg:pl-[64px]" aria-label={`${title} canvas`}>
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-white p-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-tertiary">{eyebrow}</p>
            <h1 className="mt-0.5 truncate text-[12px] font-semibold tracking-[-0.025em] text-ink">{title}</h1>
          </div>
          {actions ? <div className="ml-2 flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-2">
          {description ? <p className="mb-2 max-w-2xl text-[10px] leading-4 text-tertiary">{description}</p> : null}
          {children}
        </div>

        <footer className="flex min-h-12 shrink-0 items-center justify-between border-t border-hairline bg-white p-2 text-[10px] text-tertiary">
          {footer ?? (
            <>
              <span>Archestimator workshop</span>
              <span>Local sample workspace</span>
            </>
          )}
        </footer>
      </section>
    </main>
  );
}
