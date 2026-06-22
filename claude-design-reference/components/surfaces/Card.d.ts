import type { HTMLAttributes, ReactNode } from "react";

/**
 * Flat white, thin-bordered content surface.
 * @dsCard group="Components"
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  children?: ReactNode;
}
export declare function Card(props: CardProps): JSX.Element;
