import type { LibraryTreeNode } from "./tree/types";
import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";

export type { EstimateTemplate, EstimateTemplateSummary } from "@/lib/component-library/estimate-templates";

export const ESTIMATE_TEMPLATE_DRAG_MIME_TYPE = "application/x-archestimator-estimate-template";

export function summarizeEstimateTemplate(template: EstimateTemplate) {
  const summary = {
    groupCount: 0,
    areaCount: 0,
    rowCount: 0,
    total: 0,
  };

  function visit(node: EstimateTemplate["nodes"][number]) {
    if (node.kind === "group") summary.groupCount += 1;
    if (node.kind === "area") summary.areaCount += 1;
    for (const row of node.estimateRowItems ?? []) {
      summary.rowCount += 1;
      summary.total += row.totalItemCosts;
    }
    node.children?.forEach(visit);
  }

  template.nodes.forEach(visit);
  return summary;
}

export function buildTemplateNavigationTree(templates: EstimateTemplate[]): LibraryTreeNode[] {
  const categories = Array.from(new Set(templates.map((template) => template.category))).sort();

  return [
    {
      id: "all-templates",
      label: "All Templates",
      kind: "organizer",
      children: categories.map((category) => ({
        id: `template-category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        label: category,
        kind: "template-category",
      })),
    },
  ];
}

export function getTemplatesForTreeNode(selectedNodeId: string | null, templates: EstimateTemplate[]) {
  if (!selectedNodeId || selectedNodeId === "all-templates") return templates;
  if (!selectedNodeId.startsWith("template-category-")) return [];

  const normalized = selectedNodeId.replace(/^template-category-/, "");
  return templates.filter((template) => (
    template.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === normalized
  ));
}
