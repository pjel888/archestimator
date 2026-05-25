import type { SelectHTMLAttributes } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";

type ControlSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

export function ControlSelect({ className, wrapperClassName, children, ...props }: ControlSelectProps) {
  return (
    <span className={cn(
      "relative inline-flex min-w-0 items-center transition focus-within:border-accent focus-within:ring-2 focus-within:ring-focus",
      wrapperClassName,
    )}>
      <select
        className={cn(
          "h-5 min-w-0 appearance-none border-0 border-b border-hairline bg-transparent pl-0 pr-6 !text-[9px] font-medium leading-none text-ink outline-none transition-colors hover:border-tertiary focus:border-accent disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <CaretDown size={8} weight="regular" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-tertiary" aria-hidden="true" />
    </span>
  );
}
