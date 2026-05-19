import type { ReactNode, SelectHTMLAttributes } from "react";

import { cn } from "@/lib/ui/cn";

type ToolbarIconSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  icon: ReactNode;
  wrapperClassName?: string;
};

export function ToolbarIconSelect({ label, icon, className, wrapperClassName, children, ...props }: ToolbarIconSelectProps) {
  return (
    <span className={cn("group relative inline-flex size-6 items-center justify-center rounded-sm text-tertiary hover:bg-surfaceMuted focus-within:bg-surfaceMuted", wrapperClassName)}>
      <span className="pointer-events-none flex size-6 items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <select
        aria-label={label}
        title={label}
        className={cn("absolute inset-0 size-full cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 text-transparent outline-none", className)}
        {...props}
      >
        {children}
      </select>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-[calc(100%+4px)] z-50 whitespace-nowrap rounded-sm border border-hairline bg-ink px-1.5 py-1 text-[9px] font-bold leading-none text-white opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
