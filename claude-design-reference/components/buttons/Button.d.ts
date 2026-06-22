import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The button primitive for all Archestimator app/workshop UI.
 *
 * @dsCard group="Components"
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual treatment. `primary` is strong-neutral (#3D3D3D), never orange. */
  variant?:
    | "primary"
    | "secondary"
    | "soft"
    | "outline"
    | "ghost"
    | "plain"
    | "danger"
    | "add";
  /** Control height. xs=28 sm=32 md=36 lg=40. Default md. */
  size?: "xs" | "sm" | "md" | "lg";
  children?: ReactNode;
}

export declare function Button(props: ButtonProps): JSX.Element;
