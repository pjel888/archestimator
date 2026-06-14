import { Circle } from "@phosphor-icons/react/dist/ssr";

// Depth-driven inter-node rhythm, token-aligned to DESIGN.md spacing
// (sm:8 / md:12 / lg:20). The gap DECREASES with depth so nesting reads as a
// hierarchy: top-level siblings breathe, deep siblings sit tighter. The root
// (depth 0) carries no top margin (its container owns the outer gap). Purely
// depth-driven now — the old usesSiblingGroupRhythm flag was never threaded
// through the recursion, so the depth>0 branches were dead (always mt-0).
export function groupGap(depth: number) {
  if (depth <= 0) return "mt-0";
  if (depth === 1) return "mt-5"; // lg = 20px
  if (depth === 2) return "mt-3"; // md = 12px
  return "mt-2";                  // sm = 8px
}

// One node model: root and descendants share the same surface tone; depth is
// expressed by spacing, indentation, and the root frame, not a darker child fill.
export function nodeShellClasses(depth: number) {
  return depth > 0 ? "bg-surfaceMuted/20" : "rounded-xs border border-hairline bg-surfaceMuted/20";
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
