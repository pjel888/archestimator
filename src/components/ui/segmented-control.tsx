"use client";

import { useId, useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/ui/cn";

/**
 * Shared segmented control: a single-select group of real `<button aria-pressed>`
 * options with arrow-key roving tabindex (WAI-ARIA APG single-select pattern).
 *
 * Replaces the route-local toolbar button helpers that the charts page grew
 * (`13` R-5 / `10` D-14) and gives the segmented group ONE tab stop instead of
 * N (`06` A11Y-8): Tab enters the group on the selected option, Left/Right (and
 * Up/Down) move and select between options, Home/End jump to the ends.
 */
export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  /** Optional override for the accessible name when label is an abbreviation. */
  ariaLabel?: string;
};

export type SegmentedControlProps<T extends string> = {
  /** Accessible group name, e.g. "Break down by". */
  ariaLabel: string;
  options: ReadonlyArray<SegmentedControlOption<T>>;
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
};

export function SegmentedControl<T extends string>({
  ariaLabel,
  options,
  value,
  onValueChange,
  className,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  function focusAndSelect(nextIndex: number) {
    const clamped = (nextIndex + options.length) % options.length;
    const option = options[clamped];
    if (!option) return;
    onValueChange(option.value);
    buttonRefs.current[clamped]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusAndSelect(selectedIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusAndSelect(selectedIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelect(options.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn("inline-grid auto-cols-fr grid-flow-col gap-1 rounded-xs bg-surfaceMuted p-0.5", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option, index) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            id={`${groupId}-${option.value}`}
            aria-pressed={isActive}
            aria-label={option.ariaLabel}
            // Roving tabindex: only the selected option is in the tab order.
            tabIndex={isActive ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "min-h-6 cursor-pointer rounded-xs px-2 text-[10px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none",
              isActive ? "bg-white text-ink shadow-sm" : "text-tertiary hover:bg-white/70 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
