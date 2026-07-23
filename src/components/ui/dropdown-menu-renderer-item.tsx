import { cn } from "@/lib/ui/cn";
import type { DropdownRendererItemProps } from "./dropdown-menu-renderer-types";

export function DropdownMenuRendererItem({
  children,
  disabled,
  title,
  variant = "default",
  onSelect,
}: DropdownRendererItemProps) {
  return (
    <button
      className={cn(
        "relative flex min-h-7 w-full cursor-pointer select-none items-center gap-2 rounded-xs px-2 py-1 text-left text-[10px] font-medium leading-3 text-ink outline-none transition-colors duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-surface-muted hover:text-ink focus:bg-surface-muted focus:text-ink disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
        variant === "destructive" && "text-danger hover:bg-danger-soft hover:text-danger focus:bg-danger-soft focus:text-danger",
      )}
      data-disabled={disabled ? "true" : undefined}
      data-dropdown-menu-item="true"
      disabled={disabled}
      role="menuitem"
      tabIndex={-1}
      title={disabled ? title : undefined}
      type="button"
      onClick={() => {
        if (!disabled) onSelect();
      }}
    >
      {children}
    </button>
  );
}
