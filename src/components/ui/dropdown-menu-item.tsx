import type { ReactNode } from "react";

export type DropdownMenuItemProps = {
  id?: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
  /**
   * When true, the item renders a trailing check mark to signal it is the
   * currently selected choice (e.g. the active group/color in a picker menu).
   * Purely additive: omitting `selected` renders the item exactly as before.
   * Selection does not disable the item — its `onClick` still fires.
   */
  selected?: boolean;
};

export function DropdownMenuItem(_props: DropdownMenuItemProps) {
  return null;
}
