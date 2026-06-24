"use client";

import { type ReactNode, useId, useState } from "react";

import { cn } from "@/lib/ui/cn";

export type HoverCardProps = {
  trigger: ReactNode;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
};

export function HoverCard({
  trigger,
  children,
  title,
  description,
  open,
  defaultOpen = false,
  className,
  contentClassName,
}: HoverCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const cardId = useId();
  const isOpen = open ?? internalOpen;

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setInternalOpen(true)}
      onMouseLeave={() => setInternalOpen(false)}
      onFocus={() => setInternalOpen(true)}
      onBlur={() => setInternalOpen(false)}
    >
      {/* react-doctor-disable-next-line react-doctor/no-noninteractive-tabindex -- Hover card trigger must be focusable so keyboard users can reveal the described content. */}
      <span aria-describedby={isOpen ? cardId : undefined} tabIndex={0} className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-focus">
        {trigger}
      </span>
      {isOpen ? (
        <div
          id={cardId}
          role="tooltip"
          className={cn(
            "absolute left-0 top-full z-[1050] mt-1 w-72 rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 tracking-normal text-secondary shadow-[0_18px_44px_rgba(17,24,39,0.15)]",
            contentClassName,
          )}
        >
          {title ? <p className="text-[11px] font-medium leading-4 tracking-normal text-ink">{title}</p> : null}
          {description ? <p className="mt-0.5 text-[9px] leading-3 tracking-normal text-tertiary">{description}</p> : null}
          <div className="mt-2">{children}</div>
        </div>
      ) : null}
    </span>
  );
}
