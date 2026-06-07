import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, actions, breadcrumbs, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col gap-1", className)} {...props}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} className="mb-0.5" />
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h1 className="text-[12px] font-medium text-ink tracking-normal leading-[16px] truncate">
              {title}
            </h1>
            {description && (
              <p className="text-[10px] font-normal text-muted tracking-normal leading-[14px]">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      </div>
    );
  }
);

PageHeader.displayName = "PageHeader";
