import type { LibraryTreeNode } from "./tree/types";
import type { EstimateTreeNode } from "@/lib/estimates/types";
import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";

export type { EstimateTemplate, EstimateTemplateSummary } from "@/lib/component-library/estimate-templates";

export const ESTIMATE_TEMPLATE_DRAG_MIME_TYPE = "application/x-archestimator-estimate-template";

/**
 * Window event for surfaces that can target a template drop but do not own
 * the estimate mutation flow (e.g. the left estimate tree). The estimate
 * sheet listens and runs its optimistic insert + rollback.
 */
export const INSERT_ESTIMATE_TEMPLATE_EVENT = "archestimator:insert-estimate-template";

export type InsertEstimateTemplateEventDetail =
  | {
      targetParentNodeId: string;
      templateIds: string[];
    }
  | {
      targetParentNodeId: string;
      templateId: string;
      templateNodeId: string;
    }
  | {
      /** Area target: the sheet wraps this area and the payload in a new group. */
      wrapAreaNodeId: string;
      templateIds: string[];
    }
  | {
      wrapAreaNodeId: string;
      templateId: string;
      templateNodeId: string;
    };

/**
 * Window event for "Save as template" entry points outside the right
 * sidebar (e.g. the sheets tree context menu). The sidebar listens and
 * opens its create-template modal with this node as the source.
 */
export const CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT = "archestimator:create-template-from-node";

export type CreateEstimateTemplateFromNodeEventDetail = {
  sourceNodeId: string;
};

/**
 * Normalized template drag payload. Single-template drags stamp
 * `{templateId}`, category drags stamp `{templateIds}`, and dragging a
 * group/area inside a template stamps `{templateId, templateNodeId}` —
 * readers always get the discriminated form.
 */
export type EstimateTemplateDragPayload =
  | { kind: "templates"; templateIds: string[] }
  | { kind: "template-node"; templateId: string; templateNodeId: string };

export function readEstimateTemplateDragPayload(rawPayload: string): EstimateTemplateDragPayload | null {
  if (!rawPayload) return null;
  try {
    const parsed = JSON.parse(rawPayload) as { templateId?: unknown; templateIds?: unknown; templateNodeId?: unknown };
    if (
      typeof parsed.templateNodeId === "string" && parsed.templateNodeId &&
      typeof parsed.templateId === "string" && parsed.templateId
    ) {
      return { kind: "template-node", templateId: parsed.templateId, templateNodeId: parsed.templateNodeId };
    }
    if (typeof parsed.templateId === "string" && parsed.templateId) {
      return { kind: "templates", templateIds: [parsed.templateId] };
    }
    if (Array.isArray(parsed.templateIds)) {
      const templateIds = parsed.templateIds.filter((id): id is string => typeof id === "string" && id.length > 0);
      if (templateIds.length > 0) return { kind: "templates", templateIds };
    }
  } catch {
    // Malformed payloads from other surfaces are ignored.
  }
  return null;
}

export function templateMatchesQuery(template: EstimateTemplate, query: string) {
  if (!query.trim()) return true;
  const normalizedQuery = query.trim().toLowerCase();
  const searchableValues: string[] = [];

  function visit(node: EstimateTreeNode) {
    searchableValues.push(node.name);
    // Row content searches too (audit rec 7): material/name, description,
    // and supplier of every row inside the template.
    for (const row of node.estimateRowItems ?? []) {
      searchableValues.push(row.material, row.name ?? "", row.description ?? "", row.supplier ?? "");
    }
    node.children?.forEach(visit);
  }

  template.nodes.forEach(visit);
  return [template.name, template.description, template.category, ...searchableValues]
    .some((value) => Boolean(value) && value.toLowerCase().includes(normalizedQuery));
}

export function filterTemplatesByQuery(templates: EstimateTemplate[], query: string) {
  if (!query.trim()) return templates;
  return templates.filter((template) => templateMatchesQuery(template, query));
}

/** Numeric subtree total: descendant row `totalItemCosts` sums. */
export function computeTemplateNodeTotal(node: EstimateTreeNode): number {
  const rowTotal = (node.estimateRowItems ?? []).reduce((sum, row) => sum + row.totalItemCosts, 0);
  const childTotal = (node.children ?? []).reduce((sum, child) => sum + computeTemplateNodeTotal(child), 0);
  return rowTotal + childTotal;
}

/**
 * The node kinds a template would insert at its top level. Drop targets use
 * this for messaging only — the server accepts any mix under a group node.
 */
export function getTemplateRootKinds(template: EstimateTemplate): EstimateTreeNode["kind"][] {
  return Array.from(new Set(template.nodes.map((node) => node.kind)));
}

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
