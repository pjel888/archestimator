import type { HTMLAttributes, ReactNode } from "react";

/**
 * Small uppercase label/status pill. Tone carries meaning only.
 * @dsCard group="Components"
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  size?: "xs" | "sm";
  children: ReactNode;
}
export declare function Badge(props: BadgeProps): ReactNode;
