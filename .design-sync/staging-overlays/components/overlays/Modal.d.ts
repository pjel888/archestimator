import type { ReactNode } from "react";

/**
 * Centered app dialog over a dim scrim.
 * @dsCard group="Overlays"
 */
export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl";
export type ModalTone = "default" | "success" | "warning" | "danger" | "destructive";

export interface ModalProps {
  /** Render the surface. Defaults to true so the design tool shows it open. */
  open?: boolean;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Right-aligned action area (usually Buttons). */
  footer?: ReactNode;
  size?: ModalSize;
  /** Tints the border + title for success/warning/danger flows; destructive sets alertdialog. */
  tone?: ModalTone;
  /** Scrim the nearest positioned ancestor instead of the viewport. Cards pass this. */
  inline?: boolean;
  blur?: boolean;
  /** Remove body padding + use the muted surface (composed layouts like SettingsModal). */
  flushBody?: boolean;
  closeLabel?: string;
  bodyClassName?: string;
  className?: string;
  children?: ReactNode;
}
export declare function Modal(props: ModalProps): JSX.Element | null;
