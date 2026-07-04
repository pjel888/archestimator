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

export function SearchInput({ className, wrapperClassName, shortcutKey, onClear, value, ref, style, ...props }: SearchInputProps) {
  const hasValue = Boolean(value && String(value).length > 0);

  return (
    <div
      data-search-input-root="true"
      className={cn(
        "box-border flex h-[38px] min-h-[38px] items-center gap-1.5 rounded-xs bg-transparent px-2",
        wrapperClassName,
      )}
    >
      <MagnifyingGlass size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
      <input
        ref={ref}
        type="text"
        role="searchbox"
        value={value}
        data-search-input-control="true"
        className={cn(
          "min-w-0 flex-1 appearance-none border-0 bg-transparent !text-[10px] font-medium text-ink shadow-none outline-none placeholder:text-tertiary [background:transparent] [&::-webkit-search-cancel-button]:hidden",
          className,
        )}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          background: "transparent",
          backgroundColor: "transparent",
          ...style,
        }}
        {...props}
      />
      {hasValue ? (
        <button
          type="button"
          className="grid size-5 shrink-0 place-items-center rounded-xs bg-transparent text-tertiary transition-colors hover:bg-white/45 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus/40"
          aria-label="Clear search"
          onClick={onClear}
        >
          <X size={11} />
        </button>
      ) : shortcutKey ? (
        <kbd className="shrink-0 rounded-xs bg-white/45 px-1 text-[9px] font-medium text-tertiary shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]">
          {shortcutKey}
        </kbd>
      ) : null}
    </div>
  );
}
