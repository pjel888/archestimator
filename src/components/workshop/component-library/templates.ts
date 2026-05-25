import type { LibraryTreeNode } from "./tree/types";
import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";

export type { EstimateTemplate, EstimateTemplateSummary } from "@/lib/component-library/estimate-templates";

export const ESTIMATE_TEMPLATE_DRAG_MIME_TYPE = "application/x-archestimator-estimate-template";

function toTemplateCategoryId(category: string) {
  return `template-category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function toTemplateTreeItemId(templateId: string) {
  return `template-${templateId}`;
}

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
        id: toTemplateCategoryId(category),
        label: category,
        kind: "template-category",
        children: templates
          .filter((template) => template.category === category)
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((template) => {
            const summary = summarizeEstimateTemplate(template);
            return {
              id: toTemplateTreeItemId(template.id),
              label: template.name,
              kind: "template",
              meta: `${summary.groupCount} groups / ${summary.areaCount} areas / ${summary.rowCount} rows`,
            };
          }),
      })),
    },
  ];
}

export function getTemplatesForTreeNode(selectedNodeId: string | null, templates: EstimateTemplate[]) {
  if (!selectedNodeId || selectedNodeId === "all-templates") return templates;
  if (selectedNodeId.startsWith("template-") && !selectedNodeId.startsWith("template-category-")) {
    const templateId = selectedNodeId.replace(/^template-/, "");
    return templates.filter((template) => template.id === templateId);
  }
  if (!selectedNodeId.startsWith("template-category-")) return [];

  const normalized = selectedNodeId.replace(/^template-category-/, "");
  return templates.filter((template) => (
    toTemplateCategoryId(template.category).replace(/^template-category-/, "") === normalized
  ));
}
