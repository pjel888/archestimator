import type { EstimateTreeNode } from "@/lib/estimates/types";
import type { EstimateTemplate } from "../../component-library/templates";

export const TEMPLATE_EDITOR_ROOT_NODE_ID = "template-editor-root";

export function getTemplateStructureAllNodeIds(template: EstimateTemplate): string[] {
  const ids: string[] = [TEMPLATE_EDITOR_ROOT_NODE_ID];
  function visit(node: EstimateTreeNode) {
    ids.push(node.id);
    node.children?.forEach(visit);
  }
  template.nodes.forEach(visit);
  return ids;
}
