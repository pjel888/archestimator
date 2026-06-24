import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";

type ChipTone = "neutral" | "accent" | "danger";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ChipTone;
  active?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  children: ReactNode;
};

const toneClasses: Record<ChipTone, string> = {
  neutral: "border-hairline bg-surfaceMuted text-ink hover:border-tertiary",
  accent: "border-accent/30 bg-accent-soft text-accent-dark hover:border-accent",
  danger: "border-dangerSoft bg-dangerSoft text-danger hover:border-danger",
};

const chipClasses =
  "inline-flex min-h-5 items-center gap-1 rounded-xs border px-1.5 py-px !text-[9px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50";

export function Chip({
  className,
  tone = "neutral",
  active = false,
  removable = false,
  onRemove,
  removeLabel = "Remove",
  children,
  type = "button",
  ...props
}: ChipProps) {
  function handleRemoveClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onRemove?.();
  }

  const disabled = props.disabled;
  const visualClasses = cn(
    chipClasses,
    active ? "border-ink bg-ink text-white hover:border-ink" : toneClasses[tone],
    className,
  );

  if (removable && onRemove) {
    return (
      <span className={cn(visualClasses, disabled && "opacity-50")}>
        <button
          type={type}
          aria-pressed={active || undefined}
          className="min-w-0 truncate text-left focus-visible:outline-none disabled:pointer-events-none"
          {...props}
        >
          {children}
        </button>
        <button
          type="button"
          aria-label={removeLabel}
          disabled={disabled}
          className="inline-flex size-3 shrink-0 items-center justify-center rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none"
          onClick={handleRemoveClick}
        >
          <X size={9} weight="regular" aria-hidden="true" />
        </button>
      </span>
    );
  }

  return (
    <button
      type={type}
      aria-pressed={active || undefined}
      className={visualClasses}
      {...props}
    >
      <span className="truncate">{children}</span>
      {removable ? <X size={9} weight="regular" aria-hidden="true" /> : null}
    </button>
  );
}
