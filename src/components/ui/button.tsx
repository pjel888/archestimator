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
  primary: "bg-primary text-white hover:bg-accentDark focus-visible:ring-focus",
  secondary: "border border-divider bg-surface text-ink hover:bg-surfaceMuted focus-visible:ring-focus",
  ghost: "text-muted hover:bg-surfaceMuted hover:text-ink focus-visible:ring-focus",
  danger: "border border-dangerSoft bg-white text-danger hover:bg-dangerSoft focus-visible:ring-danger",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 rounded-md px-2 py-1.5 text-xs",
  md: "min-h-10 rounded-md px-2 py-2 text-sm",
  icon: "grid size-9 place-items-center rounded-md p-0",
};

export function Button({ className, variant = "secondary", size = "md", type = "button", children, ...props }: ButtonProps) {
  return <button type={type} className={cn("inline-flex items-center justify-center gap-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", variantClasses[variant], sizeClasses[size], className)} {...props}>{children}</button>;
}
