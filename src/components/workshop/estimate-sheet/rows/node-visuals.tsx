import { Circle } from "@phosphor-icons/react/dist/ssr";

// Depth-driven inter-node rhythm. Sibling separation is intentionally spacious:
// the old sm/md/lg rhythm felt like drawn dividers, while this reads as white
// breathing room between sheet sections.
export function groupGap(depth: number) {
  if (depth <= 0) return "mt-0";
  if (depth === 1) return "mt-[100px]";
  if (depth === 2) return "mt-[60px]";
  return "mt-10";
}

// One node model: root and descendants share the same plain paper surface.
// Depth is expressed by spacing and indentation, not background tint or frames.
export function nodeShellClasses(depth?: number) {
  void depth;
  return "bg-white";
}

export function getNodeCode(parentCode: string, siblingIndex: number): string {
  const segment = String(siblingIndex + 1).padStart(2, "0");
  return parentCode ? `${parentCode}.${segment}` : segment;
}

// One neutral header/name/total chrome for every node (no group-vs-area split).
export function nodeHeaderClasses() {
  return "";
}

export function nodeNameClasses(depth = 0) {
  if (depth <= 0) return "truncate text-[9px] font-medium uppercase tracking-normal text-ink";
  return "truncate text-[10px] font-normal text-secondary";
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
