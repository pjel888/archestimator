import { FolderSimple, MapPin } from "@phosphor-icons/react/dist/ssr";

import { getEstimateNodeDisplayKind } from "@/lib/estimates/tree-hierarchy";
import type { EstimateTreeNode } from "../../estimate-tree-data";

export function groupGap(depth: number, kind?: EstimateTreeNode["kind"], usesSiblingGroupRhythm = false) {
  if (kind === "area" && depth > 0 && !usesSiblingGroupRhythm) return "mt-0";
  if (depth === 0) return "mt-0";
  if (depth === 1) return "mt-5";
  return "mt-4";
}

export function getNodeCode(parentCode: string, siblingIndex: number): string {
  const segment = String(siblingIndex + 1).padStart(2, "0");
  return parentCode ? `${parentCode}.${segment}` : segment;
}

export function nodeHeaderClasses(kind: EstimateTreeNode["kind"]) {
  if (kind === "group") {
    return "border border-hairline bg-surfaceMuted border-l-2 border-l-divider hover:bg-[#EAEEF3]";
  }
  return "hover:bg-surfaceMuted/40";
}

export function nodeNameClasses(kind: EstimateTreeNode["kind"]) {
  if (kind === "group") return "truncate text-[10px] font-medium text-ink";
  return "truncate text-[10px] font-medium text-secondary";
}

export function nodeTotalClasses(kind: EstimateTreeNode["kind"]) {
  if (kind === "group") return "shrink-0 text-right text-[10px] font-medium tabular-nums text-ink";
  return "shrink-0 text-right text-[10px] font-normal tabular-nums text-ink";
}

export function NodeIcon({ kind }: { kind: EstimateTreeNode["kind"] }) {
  if (getEstimateNodeDisplayKind(kind) === "group") return <FolderSimple size={13} weight="regular" aria-hidden="true" />;
  return <MapPin size={13} weight="regular" aria-hidden="true" />;
}
