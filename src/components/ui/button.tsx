import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "outline"
  | "ghost"
  | "plain"
  | "danger"
  | "success"
  | "warning"
  | "overlay"
  | "scrim";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon-xs" | "icon-sm" | "icon" | "icon-lg" | "scrim";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-accentDark focus-visible:ring-focus",
  secondary: "border border-divider bg-surface text-ink hover:bg-surfaceMuted focus-visible:ring-focus",
  soft: "border border-accent/20 bg-accent-soft text-accent-dark hover:bg-accentSoft focus-visible:ring-focus",
  outline: "border border-hairline bg-transparent text-ink hover:bg-surfaceMuted focus-visible:ring-focus",
  ghost: "text-muted hover:bg-surfaceMuted hover:text-ink focus-visible:ring-focus",
  plain: "bg-transparent text-secondary hover:text-ink focus-visible:ring-focus",
  danger: "border border-dangerSoft bg-white text-danger hover:bg-dangerSoft focus-visible:ring-danger",
  success: "bg-success text-white hover:bg-success/90 focus-visible:ring-success",
  warning: "bg-warning text-white hover:bg-warning/90 focus-visible:ring-warning",
  overlay: "bg-white/[0.10] text-white/78 ring-1 ring-white/16 backdrop-blur-[1px] hover:bg-white/[0.16] hover:text-white focus-visible:ring-white/75",
  scrim: "bg-black/12",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "min-h-7 rounded-xs px-1.5 py-1",
  sm: "min-h-8 rounded-xs px-2 py-1.5",
  md: "min-h-9 rounded-xs px-2.5 py-2",
  lg: "min-h-10 rounded-xs px-3 py-2",
  "icon-xs": "grid size-7 place-items-center rounded-xs p-0",
  "icon-sm": "grid size-8 place-items-center rounded-xs p-0",
  icon: "grid size-9 place-items-center rounded-xs p-0",
  "icon-lg": "grid size-10 place-items-center rounded-xs p-0",
  scrim: "fixed inset-0 cursor-default p-0",
};

export function Button({ className, variant = "secondary", size = "md", type = "button", children, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap !text-[10px] !font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-surfaceMuted aria-pressed:text-ink",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
