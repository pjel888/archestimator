import type { HTMLAttributes, ReactNode } from "react";

/**
 * Semantic estimate/proposal status chip with optional leading dot.
 * @dsCard group="Components"
 */
export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: "approved" | "review" | "danger" | "draft" | "active" | "inactive";
  showDot?: boolean;
}
export declare function StatusBadge(props: StatusBadgeProps): ReactNode;
