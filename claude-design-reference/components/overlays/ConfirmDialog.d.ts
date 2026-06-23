import type { ReactNode } from "react";

/**
 * Small decision modal — ghost Cancel + primary/danger Confirm.
 * @dsCard group="Overlays"
 */
export type ConfirmTone = "default" | "warning" | "danger" | "destructive";

export interface ConfirmDialogProps {
  open?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** destructive/danger → danger confirm button, alertdialog role, tinted head. */
  tone?: ConfirmTone;
  /** Disables + relabels the confirm to "Working". */
  busy?: boolean;
  /** Soft-red banner shown above the message. */
  error?: ReactNode;
  inline?: boolean;
  children?: ReactNode;
}
export declare function ConfirmDialog(props: ConfirmDialogProps): ReactNode | null;
