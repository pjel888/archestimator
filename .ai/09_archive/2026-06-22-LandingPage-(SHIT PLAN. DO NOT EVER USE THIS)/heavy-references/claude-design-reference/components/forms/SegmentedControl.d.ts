import type { ReactNode } from "react";

/**
 * Single-select segmented control with arrow-key roving.
 * @dsCard group="Components"
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}
export interface SegmentedControlProps<T extends string> {
  ariaLabel: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}
export declare function SegmentedControl<T extends string>(props: SegmentedControlProps<T>): ReactNode;
