import type { HTMLAttributes, ReactNode } from "react";

/**
 * Total / sub-total card with strong numeric hierarchy.
 * @dsCard group="Components"
 */
export interface FinancialTotalCardProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  sublabel?: ReactNode;
  variant?: "primary" | "default";
}
export declare function FinancialTotalCard(props: FinancialTotalCardProps): JSX.Element;
