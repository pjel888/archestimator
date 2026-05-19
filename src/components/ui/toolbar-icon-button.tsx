import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

type ToolbarIconButtonProps = Omit<ComponentProps<typeof Button>, "children" | "size"> & {
  label: string;
  children: ReactNode;
  visibleLabel?: string;
};

export function ToolbarIconButton({ label, visibleLabel, className, children, ...props }: ToolbarIconButtonProps) {
  const hasVisibleLabel = Boolean(visibleLabel);

  return (
    <span className="group/toolbar-icon relative inline-flex">
      <Button
        size={hasVisibleLabel ? "sm" : "icon-sm"}
        variant="ghost"
        aria-label={label}
        title={label}
        className={cn(
          hasVisibleLabel ? "h-8 min-h-8 w-auto gap-1.5 rounded-md px-2 py-0" : "size-6 rounded-sm p-0",
          "text-tertiary",
          className,
        )}
        {...props}
      >
        {children}
        {visibleLabel ? <span className="whitespace-nowrap">{visibleLabel}</span> : null}
      </Button>
      {!hasVisibleLabel ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-0 top-[calc(100%+4px)] z-50 whitespace-nowrap rounded-sm border border-hairline bg-ink px-1.5 py-1 text-[9px] font-bold leading-none text-white opacity-0 shadow-sm transition group-hover/toolbar-icon:opacity-100 group-focus-within/toolbar-icon:opacity-100"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
