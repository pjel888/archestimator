import * as React from "react";
import { cn } from "@/lib/ui/cn";

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  ref?: React.Ref<HTMLDivElement>;
  title?: React.ReactNode;
  actions?: React.ReactNode;
}

export function Panel({ className, title, actions, children, ref, ...props }: PanelProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-surface border border-hairline rounded-xs text-ink flex flex-col",
        className
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-hairline">
          {title && (
            <div className="text-[12px] font-medium text-ink tracking-normal">
              {title}
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-3 flex-1">{children}</div>
    </div>
  );
}
