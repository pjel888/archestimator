import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("rounded-lg border border-hairline bg-surface", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-hairline p-4", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return <h2 className={cn("text-lg font-medium tracking-[-0.02em]", className)} {...props}>{children}</h2>;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm leading-6 text-muted", className)} {...props} />;
}
