"use client";

import * as React from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";

import {
  DropdownPopupPanel,
  useDropdownPopup,
  type DropdownPopupAlign,
  type DropdownPopupSide,
} from "@/components/ui/dropdown-popup";
import { scrollPopupItemIntoView } from "@/components/ui/dropdown-popup-utils";
import { cn } from "@/lib/ui/cn";

/**
 * Select-semantics dropdown on the shared popup core — the value-picker
 * counterpart to the action-oriented `DropdownMenu`, mirroring how
 * Radix/React Aria ship Select and Menu as separate ARIA contracts over
 * shared mechanics.
 *
 * APG select-only combobox: the trigger is `role="combobox"`, DOM focus
 * stays on it for the whole interaction, and the open listbox tracks a
 * virtual active option via `aria-activedescendant`. Keeping real focus on
 * the trigger is what makes Tab-commits land on the next form control and
 * keeps dialog focus traps working — the portaled panel never holds focus.
 *
 * Form association: with `name`, a visually hidden native select mirrors the
 * value so `FormData`, GET-filter query strings (including empty values),
 * `required` constraint validation, and form resets keep working. It is
 * `tabIndex={-1}` + `aria-hidden` so it is neither a phantom tab stop nor
 * trap-focusable; `invalid` redirects focus to the trigger.
 */

export type DropdownSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export type DropdownSelectProps = {
  options: readonly DropdownSelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Shown in the trigger when the current value matches no option (e.g. ""). */
  placeholder?: string;
  /** Renders the hidden native select for form submission and validation. */
  name?: string;
  required?: boolean;
  /** Hard disabled (permission/configuration): not focusable, like a native disabled control. */
  disabled?: boolean;
  /** Transient disabled (pending commits): stays focusable so focus-return and announcements survive. */
  ariaDisabled?: boolean;
  align?: DropdownPopupAlign;
  side?: DropdownPopupSide;
  /** Controls trigger appearance. "underline" (default) keeps the current hairline-underline look;
   *  "boxed" renders a full-height bordered input-style trigger. */
  variant?: "underline" | "boxed";
  triggerDisplay?: "label" | "icon";
  className?: string;
  panelClassName?: string;
  id?: string;
  form?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "data-testid"?: string;
};

const TYPEAHEAD_RESET_MS = 700;

function findTypeaheadMatch(
  options: readonly DropdownSelectOption[],
  buffer: string,
  startIndex: number,
): number {
  const query = buffer.toLowerCase();
  const isRepeatedChar = query.length > 1 && query.split("").every((char) => char === query[0]);
  const needle = isRepeatedChar ? query[0] : query;
  const total = options.length;

  // Repeating one character cycles through its matches (native select
  // behavior); a growing buffer narrows from the current position.
  const searchFrom = isRepeatedChar || query.length === 1 ? startIndex + 1 : startIndex;
  for (let offset = 0; offset < total; offset += 1) {
    const index = (searchFrom + offset + total) % total;
    const option = options[index];
    if (option.disabled) continue;
    if (option.label.toLowerCase().startsWith(needle)) return index;
  }
  return -1;
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function DropdownSelect({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select…",
  name,
  required,
  disabled,
  ariaDisabled,
  align = "start",
  side = "bottom",
  variant = "underline",
  triggerDisplay = "label",
  className,
  panelClassName,
  id,
  form,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "data-testid": dataTestId,
}: DropdownSelectProps) {
  const listboxId = React.useId();
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");
  const currentValue = isControlled ? value : uncontrolledValue;
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [invalid, setInvalid] = React.useState(false);
  const typeaheadRef = React.useRef<{ buffer: string; timeout: ReturnType<typeof setTimeout> | null }>({ buffer: "", timeout: null });
  const triggerButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const hiddenSelectRef = React.useRef<HTMLSelectElement | null>(null);

  // Commit always reads the latest props: option handlers are never
  // snapshotted at open time, so a realtime update or an adjacent input's
  // blur-commit between open and select cannot produce stale writes.
  const optionsRef = React.useRef(options);
  const onValueChangeRef = React.useRef(onValueChange);
  const currentValueRef = React.useRef(currentValue);
  const openOptionsStateRef = React.useRef<{
    currentValue: string | undefined;
    open: boolean;
    options: readonly DropdownSelectOption[];
  }>({ currentValue, open: false, options });
  React.useLayoutEffect(() => {
    optionsRef.current = options;
    onValueChangeRef.current = onValueChange;
    currentValueRef.current = currentValue;
  });

  const { open, position, rootRef, triggerRef, panelRef, openPopup, close } = useDropdownPopup({ align, side });

  const selectedIndex = options.findIndex((option) => option.value === currentValue);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const interactionDisabled = Boolean(disabled || ariaDisabled);

  const firstEnabledIndex = React.useCallback((fromIndex: number, direction: 1 | -1) => {
    const list = optionsRef.current;
    for (let index = fromIndex; index >= 0 && index < list.length; index += direction) {
      if (!list[index]?.disabled) return index;
    }
    return -1;
  }, []);

  const openWithActive = React.useCallback(
    (preferred?: number) => {
      if (interactionDisabled) return;
      const list = optionsRef.current;
      const selected = list.findIndex((option) => option.value === currentValue && !option.disabled);
      const fallback = firstEnabledIndex(0, 1);
      const active = preferred !== undefined && !list[preferred]?.disabled ? preferred : selected >= 0 ? selected : fallback;
      setActiveIndex(active);
      openPopup();
    },
    [currentValue, firstEnabledIndex, interactionDisabled, openPopup],
  );

  const commitValue = React.useCallback(
    (nextValue: string) => {
      setInvalid(false);
      // Native parity: a select does not fire change when the same value is
      // re-picked. Without this guard a same-value commit would mark
      // estimate rows dirty and re-fire teamspace server actions.
      if (nextValue === currentValueRef.current) return;
      if (!isControlled) setUncontrolledValue(nextValue);
      onValueChangeRef.current?.(nextValue);
    },
    [isControlled],
  );

  const commitActiveAndClose = React.useCallback(
    (focusTrigger: boolean) => {
      const list = optionsRef.current;
      const active = list[activeIndex];
      if (active && !active.disabled) commitValue(active.value);
      close("select");
      if (focusTrigger) triggerButtonRef.current?.focus?.();
    },
    [activeIndex, close, commitValue],
  );

  // Reveal the active option once the panel is positioned; manual scrollTop
  // math only — scrollIntoView would scroll ancestors and self-dismiss.
  React.useLayoutEffect(() => {
    if (!open || activeIndex < 0) return;
    const panel = panelRef.current;
    const item = panel?.querySelector<HTMLElement>(`[data-dropdown-option-index="${activeIndex}"]`);
    if (panel && item) scrollPopupItemIntoView(panel, item);
  }, [activeIndex, open, panelRef, position]);

  // Options can change while the listbox is open (realtime refetch); re-anchor
  // the virtual highlight without reading refs during render.
  React.useEffect(() => {
    const previous = openOptionsStateRef.current;
    openOptionsStateRef.current = { currentValue, open, options };
    if (!open) return;
    if (!previous.open) return;
    if (previous.options === options && previous.currentValue === currentValue) return;

    const frameId = window.requestAnimationFrame(() => {
      const selected = options.findIndex((option) => option.value === currentValue && !option.disabled);
      const fallback = options.findIndex((option) => !option.disabled);
      setActiveIndex(selected >= 0 ? selected : fallback);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [currentValue, open, options]);

  // Form resets (including React 19's post-action reset) must resync the
  // visible trigger with the hidden control or the next submit posts a
  // value the user no longer sees.
  React.useEffect(() => {
    if (!name) return;
    const formElement = hiddenSelectRef.current?.form;
    if (!formElement) return;
    const handleReset = () => {
      setInvalid(false);
      if (!isControlled) setUncontrolledValue(defaultValue ?? "");
    };
    formElement.addEventListener("reset", handleReset);
    return () => formElement.removeEventListener("reset", handleReset);
  }, [defaultValue, isControlled, name]);

  const pushTypeahead = React.useCallback(
    (char: string) => {
      const state = typeaheadRef.current;
      if (state.timeout) clearTimeout(state.timeout);
      state.buffer += char.toLowerCase();
      state.timeout = setTimeout(() => {
        state.buffer = "";
        state.timeout = null;
      }, TYPEAHEAD_RESET_MS);
      return state.buffer;
    },
    [],
  );

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (interactionDisabled) return;

    const list = optionsRef.current;

    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openWithActive();
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        openWithActive(firstEnabledIndex(0, 1));
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        openWithActive(firstEnabledIndex(list.length - 1, -1));
        return;
      }
      // Printable characters open the listbox on the first match (APG
      // select-only combobox; native selects honor closed typeahead too).
      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey && event.key !== " ") {
        const buffer = pushTypeahead(event.key);
        const match = findTypeaheadMatch(list, buffer, selectedIndex);
        if (match >= 0) {
          event.preventDefault();
          openWithActive(match);
        }
        return;
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = firstEnabledIndex(Math.min(activeIndex + 1, list.length - 1), 1);
      if (next >= 0) setActiveIndex(next);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const previous = firstEnabledIndex(Math.max(activeIndex - 1, 0), -1);
      if (previous >= 0) setActiveIndex(previous);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      const first = firstEnabledIndex(0, 1);
      if (first >= 0) setActiveIndex(first);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      const last = firstEnabledIndex(list.length - 1, -1);
      if (last >= 0) setActiveIndex(last);
      return;
    }
    if (event.key === "Enter" || (event.key === " " && typeaheadRef.current.buffer.length === 0)) {
      event.preventDefault();
      commitActiveAndClose(true);
      return;
    }
    if (event.key === "Tab") {
      // Select semantics: Tab commits, then moves on. Focus already sits on
      // the trigger, so the default Tab lands on the next form control.
      commitActiveAndClose(false);
      return;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      // A typed space is part of the buffer and must never fall through to
      // the trigger button's default space activation, which would
      // synthesize a click and close the listbox mid-typeahead.
      if (event.key === " ") event.preventDefault();
      const buffer = pushTypeahead(event.key);
      const match = findTypeaheadMatch(list, buffer, activeIndex);
      if (match >= 0) {
        event.preventDefault();
        setActiveIndex(match);
      }
    }
  };

  const triggerLabel = selectedOption?.label ?? placeholder;
  const triggerIcon = selectedOption?.icon;
  const needsIconFallbackLabel = triggerDisplay === "icon" && !ariaLabel && !ariaLabelledBy;
  const activeOptionId = open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  // Stable ref callback: an inline closure would be re-invoked
  // (cleanup + attach) on every render of every mounted instance — at one
  // picker per estimate row that is hundreds of DOM ref calls per keystroke.
  const setTriggerRefs = React.useCallback((node: HTMLButtonElement | null) => {
    triggerButtonRef.current = node;
    triggerRef.current = node;
  }, [triggerRef]);

  return (
    <div ref={rootRef} className="relative inline-flex w-full min-w-0" data-slot="dropdown-select-root">
      <button
        ref={setTriggerRefs}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-disabled={ariaDisabled || undefined}
        disabled={disabled}
        title={triggerDisplay === "icon" ? triggerLabel : undefined}
        data-slot="dropdown-select-trigger"
        data-testid={dataTestId}
        data-placeholder={selectedOption ? undefined : "true"}
        className={cn(
          "inline-flex cursor-pointer items-center justify-between rounded-xs transition disabled:cursor-not-allowed",
          variant === "underline"
            ? "h-5 w-full min-w-0 gap-1 border-0 border-b border-hairline bg-transparent pl-0 pr-0.5 text-left !text-[9px] font-medium leading-3 text-ink outline-none hover:border-tertiary focus-visible:border-tertiary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40 disabled:cursor-not-allowed disabled:opacity-50"
            : "h-10 w-full border border-hairline bg-white px-2 text-[10px] hover:border-tertiary focus-visible:border-tertiary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40",
          ariaDisabled && "cursor-not-allowed opacity-50",
          invalid && "border-danger",
          !selectedOption && "text-tertiary",
          className,
        )}
        onClick={(event) => {
          if (interactionDisabled) {
            event.preventDefault();
            return;
          }
          if (open) close("manual");
          else openWithActive();
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        {triggerDisplay === "icon" && triggerIcon ? (
          <span className="inline-flex min-w-0 items-center justify-center" aria-hidden="true">
            {triggerIcon}
          </span>
        ) : (
          <span className="truncate">{triggerLabel}</span>
        )}
        {needsIconFallbackLabel ? <span className="sr-only">{triggerLabel}</span> : null}
        <CaretDown size={variant === "boxed" ? 12 : 8} weight="regular" aria-hidden="true" className="shrink-0 text-tertiary" />
      </button>
      {name ? (
        <select
          ref={hiddenSelectRef}
          name={name}
          form={form}
          value={currentValue}
          required={required}
          disabled={disabled}
          aria-hidden="true"
          tabIndex={-1}
          data-slot="dropdown-select-hidden"
          className="absolute left-0 top-0 h-px w-px overflow-hidden opacity-0"
          onChange={(event) => commitValue(event.target.value)}
          onInvalid={(event) => {
            // Constraint validation would try to focus the visually hidden
            // control with no visible feedback; surface it on the trigger.
            event.preventDefault();
            setInvalid(true);
            triggerButtonRef.current?.focus?.();
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      <DropdownPopupPanel
        open={open}
        position={position}
        panelRef={panelRef}
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        data-slot="dropdown-select-listbox"
        className={panelClassName}
      >
        {options.map((option, index) => {
          const isSelected = option.value === currentValue;
          const isActive = index === activeIndex;
          return (
            // react-doctor-disable-next-line react-doctor/prefer-tag-over-role, react-doctor/click-events-have-key-events, react-doctor/interactive-supports-focus -- APG combobox keeps DOM focus on the trigger and uses aria-activedescendant; native <option> would break the custom listbox.
            <div
              key={option.value}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              data-dropdown-option-index={index}
              className={cn(
                "flex min-h-7 w-full cursor-pointer select-none items-center rounded-xs px-2 py-1 text-left text-[10px] font-medium leading-3 text-ink",
                isActive && "bg-surfaceMuted",
                isSelected && "bg-accentSoft",
                option.disabled && "pointer-events-none cursor-not-allowed opacity-50",
              )}
              onMouseEnter={() => {
                if (!option.disabled) setActiveIndex(index);
              }}
              onPointerDown={(event) => {
                // Keep DOM focus on the combobox trigger (virtual focus model).
                event.preventDefault();
              }}
              onClick={() => {
                if (option.disabled) return;
                commitValue(option.value);
                close("select");
                triggerButtonRef.current?.focus?.();
              }}
            >
              {option.icon ? (
                <span className="mr-1.5 inline-flex size-3 shrink-0 items-center justify-center text-tertiary" aria-hidden="true">
                  {option.icon}
                </span>
              ) : null}
              <span className="truncate">{option.label}</span>
            </div>
          );
        })}
      </DropdownPopupPanel>
    </div>
  );
}
