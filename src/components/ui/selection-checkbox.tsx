"use client";

import { Check, Minus } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, type KeyboardEventHandler, type MouseEventHandler } from "react";

import { cn } from "@/lib/ui/cn";

export type SelectionCheckboxTone = "neutral" | "blue";

export type SelectionCheckboxProps = {
  checked: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  tone?: SelectionCheckboxTone;
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
  tone = "neutral",
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

  const active = checked || indeterminate;
  const state = indeterminate ? "mixed" : checked ? "checked" : "unchecked";

  return (
    <span
      className={cn(
        "relative flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-all",
        active && "opacity-100",
        !active && "opacity-0",
        !active && uncheckedRevealClassName,
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
        data-selection-checkbox-tone={tone}
        data-selection-checkbox-state={state}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={cn(
          "absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-xs border transition-all disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
          tone === "blue" ? "focus-visible:ring-blue-500/40" : "focus-visible:ring-focus",
          active && "opacity-100",
          !active && "opacity-0",
          !active && uncheckedRevealClassName,
          checked && !indeterminate && (tone === "blue" ? "border-blue-500 bg-blue-50" : "border-[#ABABAB] bg-[#ABABAB]"),
          indeterminate && (tone === "blue" ? "border-blue-500 bg-blue-50" : "border-[#D9D9D9] bg-[#E4E4E4]"),
          !active && "border-tertiary bg-transparent",
          className,
        )}
      />
      {checked && !indeterminate && (
        <Check
          weight="regular"
          data-selection-checkbox-icon="checked"
          className={cn("h-2.5 w-2.5", tone === "blue" ? "text-blue-700" : "text-white")}
        />
      )}
      {indeterminate && (
        <Minus
          weight="regular"
          data-selection-checkbox-icon="mixed"
          className={cn("h-2.5 w-2.5", tone === "blue" ? "text-blue-700" : "text-tertiary")}
        />
      )}
    </span>
  );
}
