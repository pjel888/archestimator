import type { HTMLAttributes } from "react";

/**
 * Square avatar with initials fallback.
 * @dsCard group="Components"
 */
export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  initials?: string;
  size?: "xs" | "sm" | "md" | "lg";
}
export declare function Avatar(props: AvatarProps): JSX.Element;
