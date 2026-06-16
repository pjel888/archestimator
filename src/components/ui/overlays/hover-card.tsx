"use client";

import { cloneElement, isValidElement, type ReactElement, type ReactNode, useId, useState } from "react";

import { Button } from "@/components/ui/button";
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

type HoverTriggerProps = {
  readonly "aria-describedby"?: string;
  readonly disabled?: boolean;
  readonly href?: string;
  readonly tabIndex?: number;
};

function isFocusableTrigger(trigger: ReactNode): trigger is ReactElement<HoverTriggerProps> {
  if (!isValidElement<HoverTriggerProps>(trigger)) return false;
  if (trigger.props.disabled) return false;
  if (trigger.props.tabIndex !== undefined && trigger.props.tabIndex >= 0) return true;
  if (trigger.type === Button) return true;
  if (typeof trigger.type !== "string") return false;
  if (trigger.type === "a") return Boolean(trigger.props.href);
  return trigger.type === "button" || trigger.type === "input" || trigger.type === "select" || trigger.type === "textarea";
}

function mergeDescribedBy(existing: string | undefined, nextId: string | undefined) {
  if (!nextId) return existing;
  return existing ? `${existing} ${nextId}` : nextId;
}

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
  const titleId = useId();
  const isOpen = open ?? internalOpen;
  const triggerNode = isFocusableTrigger(trigger) ? (
    cloneElement(trigger, {
      "aria-describedby": mergeDescribedBy(trigger.props["aria-describedby"], isOpen ? cardId : undefined),
    })
  ) : (
    <span aria-describedby={isOpen ? cardId : undefined} tabIndex={0} className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-focus">
      {trigger}
    </span>
  );

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setInternalOpen(true)}
      onMouseLeave={() => setInternalOpen(false)}
      onFocus={() => setInternalOpen(true)}
      onBlur={() => setInternalOpen(false)}
    >
      {triggerNode}
      {isOpen ? (
        <div
          id={cardId}
          role="dialog"
          aria-labelledby={title ? titleId : undefined}
          className={cn(
            "absolute left-0 top-full z-[1050] mt-1 w-72 rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 tracking-normal text-secondary shadow-[0_18px_44px_rgba(17,24,39,0.15)]",
            contentClassName,
          )}
        >
          {title ? <p id={titleId} className="text-[11px] font-medium leading-4 tracking-normal text-ink">{title}</p> : null}
          {description ? <p className="mt-0.5 text-[9px] leading-3 tracking-normal text-tertiary">{description}</p> : null}
          <div className="mt-2">{children}</div>
        </div>
      ) : null}
    </span>
  );
}
