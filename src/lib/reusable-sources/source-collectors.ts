import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import type { ProjectNodeReusableSource } from "./types";

export type ProjectSourceSearchContext = {
  projectId: string;
  projectName: string;
  estimateId: string;
  estimateName: string;
  sheetCode: string | null;
  tabId: string;
  tabName: string;
  tabDisplayName?: string;
  updatedAt: string | null;
};

type ProjectSourceOutlineContext = {
  projectId: string;
  estimateId: string;
  tabId: string;
  tabName: string;
  tabDisplayName?: string;
  updatedAt: string | null;
};

type EstimateTreeSummary = {
  rowCount: number;
  totalCost: number;
};

function normalizeReusableSourceSearchText(value: string) {
  return value
    .replace(/[,()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export function textMatchesReusableSourceQuery(query: string, values: Array<string | null | undefined>) {
  return values.some((value) => value ? normalizeReusableSourceSearchText(value).includes(query) : false);
}

function summarizeEstimateRows(rows: readonly EstimateRowItem[] | undefined): EstimateTreeSummary {
  return {
    rowCount: rows?.length ?? 0,
    totalCost: rows?.reduce((sum, row) => sum + row.totalItemCosts, 0) ?? 0,
  };
}

function combineEstimateTreeSummaries(summaries: readonly EstimateTreeSummary[]): EstimateTreeSummary {
  return summaries.reduce(
    (total, summary) => ({
      rowCount: total.rowCount + summary.rowCount,
      totalCost: total.totalCost + summary.totalCost,
    }),
    { rowCount: 0, totalCost: 0 },
  );
}

function summarizeEstimateTreeNode(node: EstimateTreeNode): EstimateTreeSummary {
  return combineEstimateTreeSummaries([
    summarizeEstimateRows(node.estimateRowItems),
    summarizeEstimateTreeNodes(node.children ?? []),
  ]);
}

export function summarizeEstimateTreeNodes(nodes: readonly EstimateTreeNode[]): EstimateTreeSummary {
  return combineEstimateTreeSummaries(nodes.map(summarizeEstimateTreeNode));
}

export function collectProjectNodeSources({
  context,
  nodes,
  path = [],
  parentNodeId = null,
}: {
  context: ProjectSourceOutlineContext;
  nodes: EstimateTreeNode[];
  path?: string[];
  parentNodeId?: string | null;
}): ProjectNodeReusableSource[] {
  const sources: ProjectNodeReusableSource[] = [];
  const displayTabName = context.tabDisplayName ?? context.tabName;

  for (const node of nodes) {
    const nodePath = [...path, node.name];
    if (node.kind === "group" || node.kind === "area") {
      const summary = summarizeEstimateTreeNode(node);
      sources.push({
        kind: "project-node",
        projectId: context.projectId,
        estimateId: context.estimateId,
        tabId: context.tabId,
        nodeId: node.id,
        parentNodeId,
        nodeKind: node.kind,
        name: node.name,
        rowItems: node.estimateRowItems ?? [],
        metadata: {
          tabName: context.tabName,
          tabDisplayName: displayTabName,
          nodePath: [displayTabName, ...nodePath],
          updatedAt: context.updatedAt,
          rowCount: summary.rowCount,
          totalCost: summary.totalCost,
        },
      });
    }
    if (node.children?.length) {
      sources.push(...collectProjectNodeSources({
        context,
        nodes: node.children,
        path: nodePath,
        parentNodeId: node.id,
      }));
    }
  }

  return sources;
}

export function collectProjectNodeSearchSources({
  context,
  nodes,
  query,
  path = [],
  parentNodeId = null,
}: {
  context: ProjectSourceSearchContext;
  nodes: EstimateTreeNode[];
  query: string;
  path?: string[];
  parentNodeId?: string | null;
}): ProjectNodeReusableSource[] {
  const sources: ProjectNodeReusableSource[] = [];
  const displayTabName = context.tabDisplayName ?? context.tabName;

  for (const node of nodes) {
    const nodePath = [...path, node.name];
    if ((node.kind === "group" || node.kind === "area") && textMatchesReusableSourceQuery(query, [node.name])) {
      const summary = summarizeEstimateTreeNode(node);
      sources.push({
        kind: "project-node",
        projectId: context.projectId,
        estimateId: context.estimateId,
        tabId: context.tabId,
        nodeId: node.id,
        parentNodeId,
        nodeKind: node.kind,
        name: node.name,
        rowItems: node.estimateRowItems ?? [],
        metadata: {
          projectName: context.projectName,
          estimateName: context.estimateName,
          sheetCode: context.sheetCode,
          tabName: context.tabName,
          tabDisplayName: displayTabName,
          nodePath: [displayTabName, ...nodePath],
          updatedAt: context.updatedAt,
          rowCount: summary.rowCount,
          totalCost: summary.totalCost,
        },
      });
    }
    if (node.children?.length) {
      sources.push(...collectProjectNodeSearchSources({
        context,
        nodes: node.children,
        query,
        path: nodePath,
        parentNodeId: node.id,
      }));
    }
  }

  return sources;
}
