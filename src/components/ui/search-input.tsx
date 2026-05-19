import { forwardRef, type InputHTMLAttributes } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapperClassName?: string;
  shortcutKey?: string;
  onClear?: () => void;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, wrapperClassName, shortcutKey, onClear, value, ...props }, ref) => {
    const hasValue = Boolean(value && String(value).length > 0);

    return (
      <div
        className={cn(
          "flex items-center gap-1.5 bg-transparent px-2 transition hover:bg-surfaceMuted/60 focus-within:bg-surfaceMuted/60 [&:has(input:not(:placeholder-shown))]:bg-surfaceMuted/60",
          wrapperClassName,
        )}
      >
        <MagnifyingGlass size={12} weight="bold" className="shrink-0 text-tertiary" aria-hidden="true" />
        <input
          ref={ref}
          type="search"
          value={value}
          className={cn(
            "min-w-0 flex-1 bg-transparent !text-[10px] font-semibold text-ink outline-none placeholder:text-tertiary",
            className,
          )}
          {...props}
        />
        {hasValue ? (
          <button
            type="button"
            className="grid size-5 shrink-0 place-items-center rounded-sm text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label="Clear search"
            onClick={onClear}
          >
            <X size={11} />
          </button>
        ) : shortcutKey ? (
          <kbd className="shrink-0 rounded-sm border border-hairline bg-white px-1 text-[9px] font-bold text-tertiary">
            {shortcutKey}
          </kbd>
        ) : null}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
