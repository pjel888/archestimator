"use client";

import { useId, useMemo, type FocusEvent, type KeyboardEvent } from "react";
import { CaretDown, Plus, Trash, X } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";
import { DropdownPopupPanel, useDropdownPopup } from "./dropdown-popup";
import { CONTROL_INPUT_SURFACE_CLASS, ControlInput } from "./control-input";

export type CreatableComboboxOption = {
  id: string;
  label: string;
  description?: string;
  searchText?: string;
};

export type CreatableComboboxChange = {
  id: string | null;
  label: string;
  reason: "input" | "select" | "create" | "clear";
};

type CreatableComboboxProps = {
  id?: string;
  name?: string;
  value: string;
  selectedId?: string | null;
  options: CreatableComboboxOption[];
  onChange: (change: CreatableComboboxChange) => void;
  ariaLabel: string;
  ariaRequired?: boolean;
  placeholder?: string;
  createLabel?: (value: string) => string;
  emptyLabel?: string;
  className?: string;
  inputClassName?: string;
  invalid?: boolean;
  allowCreate?: boolean;
  preferSelectionOnEnter?: boolean;
  suppressCreateWhenSearchMatches?: boolean;
  optionPresentation?: "default" | "unit";
  dropdownPlacement?: "bottom" | "top";
  showClearButton?: boolean;
  showDropdownIndicator?: boolean;
  onInputFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onInputBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onInputKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  inputDataAttributes?: Record<`data-${string}`, string | number | boolean | undefined>;
  isOptionDeletable?: (option: CreatableComboboxOption) => boolean;
  onDeleteOption?: (option: CreatableComboboxOption) => void;
  getDeleteOptionLabel?: (option: CreatableComboboxOption) => string;
};

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function getNormalizedTokens(value: string): string[] {
  const normalized = normalizeLabel(value);
  return normalized ? normalized.split(" ") : [];
}

function getOptionSearchText(option: CreatableComboboxOption): string {
  return [option.id, option.label, option.description, option.searchText].filter(Boolean).join(" ");
}

function getOptionDomId(listboxId: string, optionId: string): string {
  return `${listboxId}-${optionId.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

export function CreatableCombobox({
  id,
  name,
  value,
  selectedId,
  options,
  onChange,
  ariaLabel,
  ariaRequired,
  placeholder = "Search or add",
  createLabel = (nextValue) => `Add "${nextValue}"`,
  emptyLabel = "No matches",
  className,
  inputClassName,
  invalid,
  allowCreate = true,
  preferSelectionOnEnter,
  suppressCreateWhenSearchMatches,
  optionPresentation = "default",
  dropdownPlacement = "bottom",
  showClearButton = true,
  showDropdownIndicator = false,
  onInputFocus,
  onInputBlur,
  onInputKeyDown,
  inputDataAttributes,
  isOptionDeletable,
  onDeleteOption,
  getDeleteOptionLabel = (option) => `Delete ${option.label}`,
}: CreatableComboboxProps) {
  const listboxId = useId();
  const query = value.trim();
  const usesUnitPresentation = optionPresentation === "unit";
  const {
    open,
    position,
    rootRef,
    triggerRef,
    panelRef,
    openPopup,
    close,
  } = useDropdownPopup({
    align: usesUnitPresentation ? "end" : "start",
    side: dropdownPlacement,
  });
  const popupPlacement = position?.placement ?? dropdownPlacement;
  const normalizedQuery = normalizeLabel(query);
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options.slice(0, 8);
    return options.filter((option) => normalizeLabel(getOptionSearchText(option)).includes(normalizedQuery)).slice(0, 8);
  }, [normalizedQuery, options]);
  const exactMatch = normalizedQuery.length > 0 && options.some((option) => (
    normalizeLabel(option.id) === normalizedQuery || normalizeLabel(option.label) === normalizedQuery
  ));
  const searchAliasMatch = suppressCreateWhenSearchMatches && normalizedQuery.length > 0 && options.some((option) => (
    getNormalizedTokens(getOptionSearchText(option)).includes(normalizedQuery)
  ));
  const canCreate = allowCreate && normalizedQuery.length > 0 && !exactMatch && !searchAliasMatch;
  const activeOptionId =
    open && selectedId && filteredOptions.some((option) => option.id === selectedId)
      ? getOptionDomId(listboxId, selectedId)
      : undefined;

  function selectOption(option: CreatableComboboxOption) {
    onChange({ id: option.id, label: option.label, reason: "select" });
    close("select");
  }

  function createOption() {
    if (!query) return;
    onChange({ id: null, label: query, reason: "create" });
    close("select");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
      }
      close("escape");
      if (!event.defaultPrevented) onInputKeyDown?.(event);
      return;
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      const firstOption = filteredOptions[0];
      if (preferSelectionOnEnter && firstOption) {
        selectOption(firstOption);
        return;
      }
      if (canCreate) {
        createOption();
        return;
      }
      if (firstOption) {
        selectOption(firstOption);
        return;
      }
    }
    onInputKeyDown?.(event);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <ControlInput
        ref={(node) => {
          triggerRef.current = node;
        }}
        id={id}
        name={name}
        value={value}
        role="combobox"
        aria-label={ariaLabel}
        aria-required={ariaRequired}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={activeOptionId}
        placeholder={placeholder}
        autoComplete="off"
        invalid={invalid}
        className={cn(CONTROL_INPUT_SURFACE_CLASS, "pr-10", inputClassName)}
        onFocus={(event) => {
          openPopup();
          onInputFocus?.(event);
        }}
        onBlur={onInputBlur}
        onClick={openPopup}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          onChange({ id: null, label: event.target.value, reason: "input" });
          openPopup();
        }}
        {...inputDataAttributes}
      />
      {showClearButton && value ? (
        <button
          type="button"
          aria-label={`Clear ${ariaLabel}`}
          onClick={() => {
            onChange({ id: null, label: "", reason: "clear" });
            close("manual");
          }}
          className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-xs text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <X size={10} weight="regular" className="pointer-events-none" aria-hidden="true" />
        </button>
      ) : showDropdownIndicator ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center text-tertiary"
        >
          <CaretDown size={11} weight="regular" />
        </span>
      ) : null}
      {open ? (
        // react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- This is an ARIA combobox popup, not a native datalist-backed input.
        <DropdownPopupPanel
          id={listboxId}
          role="listbox"
          aria-label={`${ariaLabel} options`}
          open={open}
          position={position}
          panelRef={panelRef}
          data-combobox-popup-placement={popupPlacement}
          className={cn(
            "rounded-xs border border-hairline bg-white shadow-[0_12px_32px_rgba(17,17,17,0.14)]",
            usesUnitPresentation
              ? "w-[min(22rem,calc(100vw-2rem))] p-1.5"
              : "overflow-hidden px-0 py-1",
          )}
        >
          {usesUnitPresentation && filteredOptions.length > 0 ? (
            <div
              aria-hidden="true"
              className="sticky top-0 z-10 mb-1 grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2 rounded-xs border border-hairline bg-surfaceMuted px-2 py-1 text-[8px] font-medium uppercase leading-3 tracking-normal text-tertiary"
            >
              <span>Code</span>
              <span>Meaning</span>
            </div>
          ) : null}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const optionIsSelected = selectedId === option.id;
              const canDeleteOption = !usesUnitPresentation && Boolean(onDeleteOption && isOptionDeletable?.(option));

              if (usesUnitPresentation) {
                return (
                  <button
                    key={option.id}
                    id={getOptionDomId(listboxId, option.id)}
                    type="button"
                    role="option"
                    aria-selected={optionIsSelected}
                    aria-label={`${option.label} ${option.description ?? option.label}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "grid min-h-9 w-full cursor-pointer grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-2 rounded-xs px-2 py-1.5 text-left transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                      optionIsSelected ? "bg-accentSoft" : "bg-white",
                    )}
                  >
                    <span
                      data-combobox-option-code={option.id}
                      className={cn(
                        "inline-flex min-w-0 max-w-full items-center justify-center truncate rounded-xs border px-1.5 py-0.5 font-sans !text-[10px] font-medium leading-4 tabular-nums",
                        optionIsSelected
                          ? "border-accent bg-white text-ink"
                          : "border-hairline bg-surfaceMuted/70 text-ink",
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="min-w-0">
                      <span
                        data-combobox-option-meaning={option.description ?? option.label}
                        className="block truncate !text-[10px] font-medium leading-4 text-ink"
                      >
                        {option.description ?? option.label}
                      </span>
                    </span>
                  </button>
                );
              }

              return (
                <div key={option.id} className="flex min-h-7 items-stretch">
                  <button
                    id={getOptionDomId(listboxId, option.id)}
                    type="button"
                    role="option"
                    aria-selected={optionIsSelected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "flex min-w-0 flex-1 cursor-pointer items-center px-2 text-left !text-[10px] leading-4 text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                      canDeleteOption ? "pr-1" : "",
                      optionIsSelected ? "font-medium" : "font-normal",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <span className="mt-0.5 block truncate text-[9px] font-medium leading-3 text-tertiary">{option.description}</span>
                      ) : null}
                    </span>
                  </button>
                  {canDeleteOption ? (
                    <button
                      type="button"
                      aria-label={getDeleteOptionLabel(option)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDeleteOption?.(option);
                      }}
                      className="grid w-7 shrink-0 cursor-pointer place-items-center text-tertiary transition hover:bg-dangerSoft/50 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                    >
                      <Trash size={10} weight="regular" className="pointer-events-none" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="px-2 py-1 text-[10px] leading-4 text-tertiary">{emptyLabel}</div>
          )}
          {canCreate ? (
            <button
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={createOption}
              className={cn(
                "w-full cursor-pointer border-t border-hairline text-left font-medium text-ink transition hover:bg-accentSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                usesUnitPresentation
                  ? "mt-1 flex min-h-8 items-center gap-1 rounded-xs px-2 py-1 !text-[10px] leading-4"
                  : "flex min-h-7 items-center gap-1 px-2 !text-[10px] leading-4",
              )}
            >
              <Plus size={10} weight="regular" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{createLabel(query)}</span>
            </button>
          ) : null}
        </DropdownPopupPanel>
      ) : null}
    </div>
  );
}
