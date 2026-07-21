import type { ComponentProps, ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/ui/cn";

type AdminPageProps = ComponentProps<"div">;

/**
 * Full-width admin page container. Replaces the old centered
 * `mx-auto max-w-6xl` wrappers so /admin pages use the whole workspace.
 */
export function AdminPage({ children, className, ...props }: AdminPageProps) {
  return (
    <div className={cn("flex w-full flex-col gap-3", className)} {...props}>
      {children}
    </div>
  );
}

type AdminPageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
};

/**
 * Standard admin page header. Single typographic hierarchy for every
 * /admin subpage: optional uppercase eyebrow, 12px medium title,
 * 10px tertiary description, right-aligned actions.
 */
export function AdminPageHeader({ title, description, actions, eyebrow, className }: AdminPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {eyebrow ? (
        <p className="text-[9px] font-medium uppercase leading-3 tracking-wide text-tertiary">{eyebrow}</p>
      ) : null}
      <PageHeader title={title} description={description} actions={actions} />
    </div>
  );
}

type AdminSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Standard admin content section: a Card with a consistent header row
 * (11px title, optional 9px description, right-aligned actions such as a
 * status Badge) above the section body. Replaces the per-page hand-rolled
 * `Card + header flex row + Badge` pattern.
 */
export function AdminSection({ title, description, actions, children, className }: AdminSectionProps) {
  return (
    <Card className={cn("p-2", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[11px] font-medium leading-4 text-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[9px] leading-3 text-tertiary">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
      {children}
    </Card>
  );
}
