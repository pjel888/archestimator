import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Compact toggle / filter / removable tag built as a real button.
 * @dsCard group="Components"
 */
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "neutral" | "accent" | "danger";
  active?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  children: ReactNode;
}
export declare function Chip(props: ChipProps): JSX.Element;
