"use client";

import { Check, Minus } from "@phosphor-icons/react/dist/ssr";
import type { KeyboardEventHandler, MouseEventHandler } from "react";

import { cn } from "@/lib/ui/cn";

export type SelectionCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  ariaLabel: string;
  tabIndex?: number;
  className?: string;
  uncheckedRevealClassName?: string;
  onClick?: MouseEventHandler<HTMLSpanElement>;
  onKeyDown?: KeyboardEventHandler<HTMLSpanElement>;
};

export function SelectionCheckbox({
  checked,
  indeterminate = false,
  ariaLabel,
  tabIndex = -1,
  className,
  uncheckedRevealClassName = "group-hover/tree-row:opacity-100",
  onClick,
  onKeyDown,
}: SelectionCheckboxProps) {
  return (
    <span
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-xs border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1",
        checked && !indeterminate && "border-[#ABABAB] bg-[#ABABAB] opacity-100",
        indeterminate && "border-[#D9D9D9] bg-[#E4E4E4] opacity-100",
        !checked && !indeterminate && "border-tertiary opacity-0",
        !checked && !indeterminate && uncheckedRevealClassName,
        "cursor-pointer",
        className,
      )}
    >
      {checked && !indeterminate && <Check weight="regular" className="h-2.5 w-2.5 text-white" />}
      {indeterminate && <Minus weight="regular" className="h-2.5 w-2.5 text-tertiary" />}
    </span>
  );
}
