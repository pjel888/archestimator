import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

type ButtonLinkVariant = "primary" | "secondary" | "ghost";
type ButtonLinkSize = "sm" | "md";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonLinkVariant;
  size?: ButtonLinkSize;
  children?: ReactNode;
};

const variantClasses: Record<ButtonLinkVariant, string> = {
  primary: "bg-primary text-white hover:bg-accentDark focus-visible:ring-focus",
  secondary: "border border-divider bg-surface text-ink hover:bg-surfaceMuted focus-visible:ring-focus",
  ghost: "text-muted hover:bg-surfaceMuted hover:text-ink focus-visible:ring-focus",
};

const sizeClasses: Record<ButtonLinkSize, string> = {
  sm: "min-h-8 rounded-xs p-2",
  md: "min-h-9 rounded-xs p-2",
};

export function ButtonLink({ className, variant = "secondary", size = "md", children, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 !text-[10px] !font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
