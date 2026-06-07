import * as React from "react";
import { cn } from "@/lib/ui/cn";

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  actions?: React.ReactNode;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, title, actions, children, ...props }, ref) => {
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
);
Panel.displayName = "Panel";
