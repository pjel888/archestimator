import type { ReactNode } from "react";
/**
 * Workshop settings surface — wide Modal with a two-pane nav + sections layout.
 * A composed pattern built on Modal + Button, not a single primitive.
 * @dsCard group="Overlays"
 */
export interface SettingsModalProps {
  open?: boolean;
  onClose?: () => void;
  /** Scrim the nearest positioned ancestor instead of the viewport. Default true. */
  inline?: boolean;
  /** Reveal the closed-beta operations group (platform admins). */
  canManagePlatform?: boolean;
}
export declare function SettingsModal(props: SettingsModalProps): ReactNode | null;
