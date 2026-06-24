import { DropdownMenuRendererGroup } from "./dropdown-menu-renderer-group";
import { DropdownMenuRendererItem } from "./dropdown-menu-renderer-item";
import { DropdownMenuRendererLabel } from "./dropdown-menu-renderer-label";
import { DropdownMenuRendererSeparator } from "./dropdown-menu-renderer-separator";
import { DropdownMenuRendererShortcut } from "./dropdown-menu-renderer-shortcut";

export const dropdownRenderer = {
  Group: DropdownMenuRendererGroup,
  Label: DropdownMenuRendererLabel,
  Separator: DropdownMenuRendererSeparator,
  Shortcut: DropdownMenuRendererShortcut,
  Item: DropdownMenuRendererItem,
};
