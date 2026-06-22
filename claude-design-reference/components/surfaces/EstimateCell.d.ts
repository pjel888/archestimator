import type { HTMLAttributes, ReactNode } from "react";

/**
 * One spreadsheet cell for the estimate sheet.
 * @dsCard group="Components"
 */
export interface EstimateCellProps extends HTMLAttributes<HTMLDivElement> {
  value: ReactNode;
  selected?: boolean;
  editing?: boolean;
  numeric?: boolean;
  align?: "left" | "center" | "right";
}
export declare function EstimateCell(props: EstimateCellProps): JSX.Element;
