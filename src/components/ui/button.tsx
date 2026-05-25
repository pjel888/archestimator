import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "overlay" | "scrim";
type ButtonSize = "sm" | "md" | "icon" | "icon-sm" | "scrim";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-accentDark focus-visible:ring-focus",
  secondary: "border border-divider bg-surface text-ink hover:bg-surfaceMuted focus-visible:ring-focus",
  ghost: "text-muted hover:bg-surfaceMuted hover:text-ink focus-visible:ring-focus",
  danger: "border border-dangerSoft bg-white text-danger hover:bg-dangerSoft focus-visible:ring-danger",
  overlay: "bg-white/[0.10] text-white/78 ring-1 ring-white/16 backdrop-blur-[1px] hover:bg-white/[0.16] hover:text-white focus-visible:ring-white/75",
  scrim: "bg-black/12",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-8 rounded-xs p-2",
  md: "min-h-9 rounded-xs p-2",
  icon: "grid size-9 place-items-center rounded-xs p-0",
  "icon-sm": "grid size-8 place-items-center rounded-xs p-0",
  scrim: "fixed inset-0 cursor-default p-0",
};

export function Button({ className, variant = "secondary", size = "md", type = "button", children, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 !text-[10px] !font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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
