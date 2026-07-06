"use client";

import { Check, Minus } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, type KeyboardEventHandler, type MouseEventHandler } from "react";

import { cn } from "@/lib/ui/cn";

export type SelectionCheckboxProps = {
  checked: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  ariaLabel: string;
  tabIndex?: number;
  className?: string;
  uncheckedRevealClassName?: string;
  onClick?: MouseEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

export function SelectionCheckbox({
  checked,
  disabled = false,
  indeterminate = false,
  ariaLabel,
  tabIndex = -1,
  className,
  uncheckedRevealClassName = "group-hover/tree-row:opacity-100",
  onClick,
  onKeyDown,
}: SelectionCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <span
      className={cn(
        "relative flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-all",
        (checked || indeterminate) && "opacity-100",
        !checked && !indeterminate && "opacity-0",
        !checked && !indeterminate && uncheckedRevealClassName,
        className,
      )}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        readOnly
        aria-checked={indeterminate ? "mixed" : checked}
        aria-label={ariaLabel}
        tabIndex={tabIndex}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={cn(
          "absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-xs border transition-all disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1",
          (checked || indeterminate) && "opacity-100",
          !checked && !indeterminate && "opacity-0",
          !checked && !indeterminate && uncheckedRevealClassName,
          checked && !indeterminate && "border-[#ABABAB] bg-[#ABABAB]",
          indeterminate && "border-[#D9D9D9] bg-[#E4E4E4]",
          !checked && !indeterminate && "border-tertiary bg-transparent",
          className,
        )}
      />
      {checked && !indeterminate && <Check weight="regular" className="h-2.5 w-2.5 text-white" />}
      {indeterminate && <Minus weight="regular" className="h-2.5 w-2.5 text-tertiary" />}
    </span>
  );
}
