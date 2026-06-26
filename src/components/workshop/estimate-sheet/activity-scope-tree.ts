import type { ProposalExportMetadata } from "@/lib/proposal-export/types";

import type { EstimateTreeNode } from "../estimate-tree-data";
import {
  BLANK_ESTIMATE_ROW_AUDIT_LABEL,
  isBlankEstimateRowItem,
  type ActivityScopeTreeItem,
  type FlattenedEstimateRow,
} from "./activity-history-model";
import { computeNodeTotal, type EditableRowValue } from "./rows/editable-row-model";
import { getNodeCode } from "./rows/node-visuals-utils";

export function buildActivityScopeTreeItems({
  nodes,
  rows,
  editableRows,
  metadata,
  projectTotal,
  nodeTotals,
  activityScopeDirectOnly,
}: {
  nodes: EstimateTreeNode[];
  rows: FlattenedEstimateRow[];
  editableRows: Record<string, EditableRowValue>;
  metadata: ProposalExportMetadata | null;
  projectTotal: number;
  nodeTotals: ReadonlyMap<string, number>;
  // Scope is a stored, stable per-node choice. An empty map yields
  // includeDescendants:true for every node and keeps cache keys stable as tree
  // shape changes.
  activityScopeDirectOnly: Record<string, boolean>;
}) {
  const rowById = new Map(rows.map((row) => [row.item.id, row]));
  const items: ActivityScopeTreeItem[] = [
    {
      id: "sheet",
      scope: { mode: "sheet" },
      depth: 0,
      kind: "sheet",
      label: metadata?.estimateName ?? "Estimate",
      eyebrow: metadata?.estimateSheetCode ?? "Estimate",
      total: projectTotal,
      row: null,
    },
  ];

  function visit(node: EstimateTreeNode, depth: number, nodeCode: string, ancestorNames: string[]) {
    const isGroup = node.kind === "group";
    const pathLabel = [...ancestorNames, node.name].join(" / ");
    items.push({
      id: `node:${node.id}`,
      scope: { mode: "node", nodeId: node.id, includeDescendants: !(activityScopeDirectOnly[node.id] ?? false) },
      depth,
      kind: isGroup ? "group" : "area",
      label: node.name,
      eyebrow: `${nodeCode} Area`,
      description: isGroup ? "Includes descendant node and row activity" : pathLabel,
      total: nodeTotals.get(node.id) ?? computeNodeTotal(node, editableRows),
      row: null,
    });

    node.children?.forEach((child, childIndex) => {
      visit(child, depth + 1, getNodeCode(nodeCode, childIndex), [...ancestorNames, node.name]);
    });

    node.estimateRowItems?.forEach((rowItem, rowIndex) => {
      const row = rowById.get(rowItem.id) ?? null;
      const label = isBlankEstimateRowItem(rowItem) ? BLANK_ESTIMATE_ROW_AUDIT_LABEL : rowItem.material;
      items.push({
        id: `row:${node.id}:${rowIndex}:${rowItem.id}`,
        scope: { mode: "row", rowId: rowItem.id },
        depth: depth + 1,
        kind: "row",
        label,
        eyebrow: `Row ${String(rowIndex + 1).padStart(2, "0")}`,
        description: pathLabel,
        total: row?.lineTotal ?? rowItem.totalItemCosts ?? null,
        row,
      });
    });
  }

  nodes.forEach((node, index) => visit(node, 1, getNodeCode("", index), []));
  return items;
}
