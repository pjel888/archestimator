import type { ReactNode } from "react";

/**
 * Edge-anchored panel / drawer with the Modal chrome.
 * @dsCard group="Overlays"
 */
export type SheetSide = "right" | "left" | "bottom";
export type SheetSize = "narrow" | "md" | "wide";

export interface SheetProps {
  open?: boolean;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  side?: SheetSide;
  size?: SheetSize;
  inline?: boolean;
  blur?: boolean;
  /** Dim the area behind the panel. Off for non-modal inspectors. */
  scrim?: boolean;
  closeLabel?: string;
  bodyClassName?: string;
  children?: ReactNode;
}
export declare function Sheet(props: SheetProps): JSX.Element | null;
