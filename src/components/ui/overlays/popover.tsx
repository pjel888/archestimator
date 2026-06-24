"use client";

import { type ReactNode, useId, useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

export type PopoverSide = "top" | "right" | "bottom" | "left";
export type PopoverAlign = "start" | "center" | "end";

export type PopoverProps = {
  trigger: ReactNode;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: PopoverSide;
  align?: PopoverAlign;
  triggerLabel?: string;
  /** Styling passthrough for the trigger Button (e.g. toolbar-icon styling). */
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  triggerClassName?: string;
  triggerPressed?: boolean;
  className?: string;
  contentClassName?: string;
};

const sideClasses: Record<PopoverSide, string> = {
  top: "bottom-full mb-1",
  right: "left-full ml-1 top-0",
  bottom: "top-full mt-1",
  left: "right-full mr-1 top-0",
};

const alignClasses: Record<PopoverAlign, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

export function Popover({
  trigger,
  children,
  title,
  description,
  footer,
  open,
  defaultOpen = false,
  onOpenChange,
  side = "bottom",
  align = "start",
  triggerLabel = "Toggle popover",
  triggerVariant,
  triggerSize,
  triggerClassName,
  triggerPressed,
  className,
  contentClassName,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const contentId = useId();
  const titleId = useId();
  const isOpen = open ?? internalOpen;

  function setOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (open === undefined) setInternalOpen(nextOpen);
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      <Button
        type="button"
        aria-label={triggerLabel}
        aria-expanded={isOpen}
        aria-controls={isOpen ? contentId : undefined}
        aria-pressed={triggerPressed}
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => setOpen(!isOpen)}
      >
        {trigger}
      </Button>
      {isOpen ? (
        <section
          id={contentId}
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : triggerLabel}
          className={cn(
            "absolute z-[1050] w-60 rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 tracking-normal text-secondary shadow-[0_16px_36px_rgba(17,24,39,0.14)]",
            sideClasses[side],
            side === "top" || side === "bottom" ? alignClasses[align] : "",
            contentClassName,
          )}
        >
          {title ? <p id={titleId} className="text-[11px] font-medium leading-4 tracking-normal text-ink">{title}</p> : null}
          {description ? <p className="mt-0.5 text-[9px] leading-3 tracking-normal text-tertiary">{description}</p> : null}
          <div className="mt-2">{children}</div>
          {footer ? <div className="mt-2 border-t border-hairline pt-2">{footer}</div> : null}
        </section>
      ) : null}
    </span>
  );
}

export function InfoPopover(props: Omit<PopoverProps, "title"> & { title?: ReactNode }) {
  return <Popover {...props} title={props.title ?? "Information"} />;
}

export function HelpPopover(props: Omit<PopoverProps, "title"> & { title?: ReactNode }) {
  return <Popover {...props} title={props.title ?? "Help"} />;
}

export function FilterPopover(props: Omit<PopoverProps, "title"> & { title?: ReactNode }) {
  return <Popover {...props} title={props.title ?? "Filters"} />;
}
