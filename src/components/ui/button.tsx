import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-dark focus-visible:ring-accent",
  secondary: "border border-hairline bg-surface text-foreground hover:bg-surface-muted focus-visible:ring-accent",
  ghost: "text-muted hover:bg-surface-muted hover:text-foreground focus-visible:ring-accent",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50 focus-visible:ring-red-500",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 rounded-lg px-3 py-1.5 text-xs",
  md: "min-h-10 rounded-xl px-3 py-2 text-sm",
  icon: "grid size-9 place-items-center rounded-lg p-0",
};

export function Button({ className, variant = "secondary", size = "md", type = "button", children, ...props }: ButtonProps) {
  return <button type={type} className={cn("inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", variantClasses[variant], sizeClasses[size], className)} {...props}>{children}</button>;
}
