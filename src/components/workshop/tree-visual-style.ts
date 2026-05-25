import type { CSSProperties } from "react";

export const WORKSHOP_TREE_INDENT_STEP = 20;
export const WORKSHOP_TREE_MAX_INDENT = 140;
export const WORKSHOP_TREE_ROW_GAP_CLASS = "space-y-0";
export const WORKSHOP_TREE_ROW_MIN_HEIGHT_CLASS = "min-h-7";
export const WORKSHOP_TREE_TEXT_CLASS = "!text-[10px] font-medium leading-4";
export const WORKSHOP_TREE_ICON_SLOT_CLASS = "grid size-4 shrink-0 place-items-center rounded-xs text-tertiary";

export function workshopTreeIndentStyle(depth: number): CSSProperties {
  return { paddingLeft: `${Math.min(depth * WORKSHOP_TREE_INDENT_STEP, WORKSHOP_TREE_MAX_INDENT)}px` };
}
