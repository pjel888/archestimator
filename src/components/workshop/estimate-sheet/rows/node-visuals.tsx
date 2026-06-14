import { Circle } from "@phosphor-icons/react/dist/ssr";

// Sticky-stacking constants for the rows-first mixed-content layout. The node
// header and a node's own-rows <thead> are both sticky, so a child header must
// pin BELOW its ancestor's header (and that ancestor's own-rows header, when
// present) instead of colliding at the same top offset. These heights are the
// rendered pixel heights of the two sticky layers; the branch recurses a
// depth-accumulated offset built from them (see branch.tsx).
export const STICKY_HEADER_H = 40;
export const STICKY_THEAD_H = 40;

export function groupGap(depth: number, usesSiblingGroupRhythm = false) {
  // Single depth-driven rhythm. Spacing no longer forks on node kind (one
  // node type); the sibling-rhythm flag still tightens nested siblings.
  if (depth > 0 && !usesSiblingGroupRhythm) return "mt-0";
  if (depth === 0) return "mt-0";
  if (depth === 1) return "mt-5";
  return "mt-4";
}

export function getNodeCode(parentCode: string, siblingIndex: number): string {
  const segment = String(siblingIndex + 1).padStart(2, "0");
  return parentCode ? `${parentCode}.${segment}` : segment;
}

// One neutral header/name/total chrome for every node (no group-vs-area split).
export function nodeHeaderClasses() {
  return "hover:bg-surfaceMuted/40";
}

export function nodeNameClasses() {
  return "truncate text-[10px] font-medium text-secondary";
}

export function nodeTotalClasses() {
  return "shrink-0 text-right text-[10px] font-normal tabular-nums text-ink";
}

// One neutral node glyph for every node — containment is signalled by the
// disclosure caret (present only when the node has children), not by a
// folder-vs-pin icon. A small outline mark reads as a generic node without
// implying "container" (folder) or "location/area" (pin).
export function NodeIcon() {
  return <Circle size={13} weight="regular" aria-hidden="true" />;
}
