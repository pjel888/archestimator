import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Square icon-only control on the Button scale — toolbar / chrome actions.
 *
 * @dsCard group="Components"
 */
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "secondary" | "add";
  size?: "xs" | "sm" | "md" | "lg";
  /** Always supply an accessible name for icon-only buttons. */
  "aria-label"?: string;
  children?: ReactNode;
}

export declare function IconButton(props: IconButtonProps): ReactNode;
