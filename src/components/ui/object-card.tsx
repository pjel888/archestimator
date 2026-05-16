import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export function ObjectCard({ href, title, eyebrow, meta, value, footer, children, className }: { href?: string; title: string; eyebrow?: string; meta?: string; value?: ReactNode; footer?: ReactNode; children?: ReactNode; className?: string }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{eyebrow}</p> : null}
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
          {meta ? <p className="mt-1 text-sm text-muted">{meta}</p> : null}
        </div>
        {value ? <div className="text-right font-mono text-lg font-semibold">{value}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
      {footer ? <div className="mt-4 text-sm text-muted">{footer}</div> : null}
    </>
  );

  const classes = cn("rounded-3xl border border-hairline bg-surface p-5 shadow-sm transition", href ? "hover:-translate-y-0.5 hover:shadow-md" : null, className);
  return href ? <Link className={classes} href={href}>{content}</Link> : <article className={classes}>{content}</article>;
}
