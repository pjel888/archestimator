import type { ButtonHTMLAttributes, ReactNode } from "react";
import { X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";

type ChipTone = "neutral" | "accent" | "danger";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ChipTone;
  active?: boolean;
  removable?: boolean;
  children: ReactNode;
};

const toneClasses: Record<ChipTone, string> = {
  neutral: "border-hairline bg-surfaceMuted text-ink hover:border-tertiary",
  accent: "border-accent/30 bg-accent-soft text-accent-dark hover:border-accent",
  danger: "border-dangerSoft bg-dangerSoft text-danger hover:border-danger",
};

export function Chip({ className, tone = "neutral", active = false, removable = false, children, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active || undefined}
      className={cn(
        "inline-flex min-h-5 items-center gap-1 rounded-xs border px-1.5 py-px !text-[9px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
        active ? "border-ink bg-ink text-white hover:border-ink" : toneClasses[tone],
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {removable ? <X size={9} weight="regular" aria-hidden="true" /> : null}
    </button>
  );
}
