import { type InputHTMLAttributes, type Ref } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  ref?: Ref<HTMLInputElement>;
  /**
   * Styles the SearchInput root. The root owns the complete 38px search surface height.
   * Do not add vertical padding in parent rows around this component.
   */
  wrapperClassName?: string;
  shortcutKey?: string;
  onClear?: () => void;
};

export function SearchInput({ className, wrapperClassName, shortcutKey, onClear, value, ref, ...props }: SearchInputProps) {
  const hasValue = Boolean(value && String(value).length > 0);

  return (
    <div
      className={cn(
        "box-border flex h-[38px] min-h-[38px] items-center gap-1.5 bg-transparent px-2 transition focus-within:ring-1 focus-within:ring-inset focus-within:ring-focus/40",
        wrapperClassName,
      )}
    >
      <MagnifyingGlass size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        value={value}
        className={cn(
          "min-w-0 flex-1 bg-transparent !text-[10px] font-medium text-ink outline-none placeholder:text-tertiary",
          className,
        )}
        {...props}
      />
      {hasValue ? (
        <button
          type="button"
          className="grid size-5 shrink-0 place-items-center rounded-xs text-tertiary hover:bg-surfaceMuted hover:text-ink"
          aria-label="Clear search"
          onClick={onClear}
        >
          <X size={11} />
        </button>
      ) : shortcutKey ? (
        <kbd className="shrink-0 rounded-xs bg-white px-1 text-[9px] font-medium text-tertiary">
          {shortcutKey}
        </kbd>
      ) : null}
    </div>
  );
}
