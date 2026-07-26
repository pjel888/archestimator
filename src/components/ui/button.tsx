import Link from "next/link";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/ui/cn";

export type ButtonVariant =
  | "primary"
  | "brand"
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

export type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export type ButtonProps = Omit<ComponentPropsWithRef<"button">, "className"> & ButtonStyleOptions;
export type ButtonLinkProps = Omit<ComponentPropsWithRef<typeof Link>, "className"> & ButtonStyleOptions;

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-accentDark focus-visible:ring-focus",
  // `brand` = the Glass Brand signal-orange CTA (keystone decision D-3 / MASTER-IMPLEMENTATION-PLAN section C-3).
  // Use this for signal-orange primary CTAs. `variant="primary"`
  // yields #3D3D3D ink, NOT orange. White text on #F24405 is AA-pass; hover steps to #C63804.
  brand: "bg-brand-orange text-white hover:bg-brand-orange-dark focus-visible:ring-brand-orange",
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
  xs: "min-h-7 min-w-[96px] rounded-xs px-1.5 py-1",
  sm: "min-h-8 min-w-[96px] rounded-xs px-2 py-1.5",
  md: "min-h-9 min-w-[96px] rounded-xs px-2.5 py-2",
  lg: "min-h-10 min-w-[96px] rounded-xs px-3 py-2",
  "icon-xs": "grid size-7 place-items-center rounded-xs p-0",
  "icon-sm": "grid size-8 place-items-center rounded-xs p-0",
  icon: "grid size-9 place-items-center rounded-xs p-0",
  "icon-lg": "grid size-10 place-items-center rounded-xs p-0",
  scrim: "fixed inset-0 p-0",
};

const baseClasses =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap !text-[10px] !font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-surfaceMuted aria-pressed:text-ink [&_svg]:pointer-events-none";

export function buttonVariants({ className, variant = "secondary", size = "md" }: ButtonStyleOptions = {}) {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
}

export function Button({ className, variant = "secondary", size = "md", type = "button", children, ref, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      className={buttonVariants({ className, variant, size })}
      data-slot="button"
      data-size={size}
      data-variant={variant}
    >
      {children}
    </button>
  );
}

export function ButtonLink({ className, variant = "secondary", size = "md", children, ref, ...props }: ButtonLinkProps) {
  return (
    <Link
      {...props}
      ref={ref}
      className={buttonVariants({ className, variant, size })}
      data-slot="button-link"
      data-size={size}
      data-variant={variant}
    >
      {children}
    </Link>
  );
}
