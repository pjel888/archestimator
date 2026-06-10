"use client";

import { useCallback, useMemo, useState, type DragEvent } from "react";
import {
  CaretDown,
  CaretRight,
  Cube,
  FolderSimple,
  Package,
  PencilSimple,
  Plus,
  StackPlus,
  StackSimple,
  Trash,
} from "@phosphor-icons/react/dist/ssr";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Tree, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import type { TreeSelectionNode } from "@/lib/bulk-selection/tree-selection";
import type { EstimateRowItem, EstimateTreeNode } from "../../estimate-tree-data";
import { getComponentName, getComponentPrice, pesoFormatter } from "../helpers";
import {
  computeTemplateNodeTotal,
  filterTemplatesByQuery,
  getTemplateRootKinds,
  summarizeEstimateTemplate,
  toTemplateTreeItemId,
  type EstimateTemplate,
} from "../templates";

/** Per-row domain payload carried on `UiTreeNode.data.templatesNode`. */
export type TemplatesTreeDatum =
  | { type: "category"; category: string }
  | { type: "template"; template: EstimateTemplate }
  | { type: "template-node"; template: EstimateTemplate; node: EstimateTreeNode }
  | { type: "template-row"; template: EstimateTemplate; item: EstimateRowItem };

export function templatesTreeCategoryId(category: string) {
  return `templates-tree-category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function templateInnerNodeId(templateId: string, nodeId: string) {
  return `${toTemplateTreeItemId(templateId)}::node-${nodeId}`;
}

function templateInnerRowId(templateId: string, nodeId: string, rowId: string, index: number) {
  return `${toTemplateTreeItemId(templateId)}::node-${nodeId}::row-${rowId}-${index}`;
}

function getTemplatesTreeDatum(node: UiTreeNode): TemplatesTreeDatum | undefined {
  return node.data?.templatesNode as TemplatesTreeDatum | undefined;
}

function NodeKindIcon({ kind }: { kind: EstimateTreeNode["kind"] }) {
  if (kind === "group") {
    return <FolderSimple size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
  }
  return <Cube size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
}

function TemplateRootIcon({ template }: { template: EstimateTemplate }) {
  // A template reads as the node it inserts: group icon for a group-rooted
  // template, cube for an area-rooted one, a stack when roots are mixed.
  const rootKinds = getTemplateRootKinds(template);
  if (rootKinds.length === 1) return <NodeKindIcon kind={rootKinds[0]} />;
  return <StackSimple size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
}

function toTemplateInnerUiNodes(template: EstimateTemplate, node: EstimateTreeNode): UiTreeNode {
  const childNodes = (node.children ?? []).map((child) => toTemplateInnerUiNodes(template, child));
  const rowNodes = (node.estimateRowItems ?? []).map((item, index) => ({
    id: templateInnerRowId(template.id, node.id, item.id, index),
    label: getComponentName(item),
    ariaLabel: `${getComponentName(item)} template component`,
    isLeaf: true,
    icon: <Package size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
    data: { templatesNode: { type: "template-row", template, item } satisfies TemplatesTreeDatum },
  } satisfies UiTreeNode));

  // Inner groups/areas drag out as their own subtree and join selection —
  // every row in this tree is a draggable, selectable unit.
  return {
    id: templateInnerNodeId(template.id, node.id),
    label: node.name,
    ariaLabel: `${node.name} template ${node.kind}`,
    isLeaf: childNodes.length === 0 && rowNodes.length === 0,
    icon: <NodeKindIcon kind={node.kind} />,
    children: [...childNodes, ...rowNodes],
    data: { templatesNode: { type: "template-node", template, node } satisfies TemplatesTreeDatum },
  };
}

/** Categories → template rows → the template's internal structure. */
export function buildTemplatesTreeNodes(templates: EstimateTemplate[]): UiTreeNode[] {
  const categories = Array.from(new Set(templates.map((template) => template.category))).sort();

  // Categories read as group nodes (same icon and row treatment); they are
  // still purely organizational — dragging one carries its templates, never
  // a "category" node.
  return categories.map((category) => ({
    id: templatesTreeCategoryId(category),
    label: category,
    ariaLabel: `${category} templates`,
    isLeaf: false,
    icon: <FolderSimple size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
    data: { templatesNode: { type: "category", category } satisfies TemplatesTreeDatum },
    children: templates
      .filter((template) => template.category === category)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((template) => ({
        id: toTemplateTreeItemId(template.id),
        label: template.name,
        ariaLabel: `${template.name} estimate template`,
        isLeaf: template.nodes.length === 0,
        icon: <TemplateRootIcon template={template} />,
        children: template.nodes.map((node) => toTemplateInnerUiNodes(template, node)),
        data: { templatesNode: { type: "template", template } satisfies TemplatesTreeDatum },
      })),
  }));
}

export function getTemplatesTreeAllNodeIds(nodes: UiTreeNode[]): string[] {
  const ids: string[] = [];
  function visit(node: UiTreeNode) {
    ids.push(node.id);
    node.children?.forEach(visit);
  }
  nodes.forEach(visit);
  return ids;
}

function toTemplateInnerSelectionNodes(template: EstimateTemplate, node: EstimateTreeNode): TreeSelectionNode {
  return {
    id: templateInnerNodeId(template.id, node.id),
    selectable: true,
    children: [
      ...(node.children ?? []).map((child) => toTemplateInnerSelectionNodes(template, child)),
      ...(node.estimateRowItems ?? []).map((item, index) => ({
        id: templateInnerRowId(template.id, node.id, item.id, index),
        selectable: true,
      })),
    ],
  };
}

/** Every row participates in cascade selection, mirroring the tree builder. */
export function buildTemplatesSelectionNodes(templates: EstimateTemplate[]): TreeSelectionNode[] {
  const categories = Array.from(new Set(templates.map((template) => template.category))).sort();
  return categories.map((category) => ({
    id: templatesTreeCategoryId(category),
    selectable: true,
    children: templates
      .filter((template) => template.category === category)
      .map((template) => ({
        id: toTemplateTreeItemId(template.id),
        selectable: true,
        children: template.nodes.map((node) => toTemplateInnerSelectionNodes(template, node)),
      })),
  }));
}

export function getCheckedTemplates(templates: EstimateTemplate[], checkedIds: ReadonlySet<string>): EstimateTemplate[] {
  return templates.filter((template) => checkedIds.has(toTemplateTreeItemId(template.id)));
}

export type CheckedTemplateUnits = {
  /** Whole templates whose row (or an ancestor) is checked. */
  templates: EstimateTemplate[];
  /** Top-most checked groups/areas inside templates not already covered above. */
  templateNodes: Array<{ template: EstimateTemplate; node: EstimateTreeNode }>;
  /** Checked component rows not covered by a checked ancestor. */
  items: EstimateRowItem[];
};

/**
 * Resolves a cascade selection to its top-most insertable units: a checked
 * template wins over its nodes, a checked node wins over its descendants,
 * and bare component rows fall out as plain library items.
 */
export function getCheckedTemplateUnits(
  templates: EstimateTemplate[],
  checkedIds: ReadonlySet<string>,
): CheckedTemplateUnits {
  const units: CheckedTemplateUnits = { templates: [], templateNodes: [], items: [] };

  function visitNode(template: EstimateTemplate, node: EstimateTreeNode) {
    if (checkedIds.has(templateInnerNodeId(template.id, node.id))) {
      units.templateNodes.push({ template, node });
      return;
    }
    node.children?.forEach((child) => visitNode(template, child));
    node.estimateRowItems?.forEach((item, index) => {
      if (checkedIds.has(templateInnerRowId(template.id, node.id, item.id, index))) units.items.push(item);
    });
  }

  for (const template of templates) {
    if (checkedIds.has(toTemplateTreeItemId(template.id))) {
      units.templates.push(template);
      continue;
    }
    template.nodes.forEach((node) => visitNode(template, node));
  }

  return units;
}

/**
 * One renderer for every node-like row: categories, templates, and the
 * groups/areas inside them read identically — name + cost. Inserting goes
 * through drag or the context menu only, so rows carry no action buttons.
 */
function TemplateNodeRowContent({ label, total }: { label: string; total: number }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-[9px] tabular-nums text-tertiary">{pesoFormatter.format(total)}</span>
    </span>
  );
}

function TemplateComponentRowContent({ item }: { item: EstimateRowItem }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[10px] leading-4 text-ink">{getComponentName(item)}</span>
        <span className="truncate text-[9px] leading-3 text-tertiary">{item.supplier}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-[9px] font-medium tabular-nums text-ink">{pesoFormatter.format(getComponentPrice(item))}</span>
        <span className="text-[9px] text-tertiary">/{item.unit}</span>
      </span>
    </span>
  );
}

export type TemplatesTreeProps = {
  templates: EstimateTemplate[];
  searchQuery: string;
  expandedNodeIds: string[];
  onToggle: (nodeId: string) => void;
  /** Whether the workspace currently has a valid group target for templates. */
  canInsertTemplate: boolean;
  templateTargetName: string;
  onAddTemplate: (template: EstimateTemplate) => void;
  /** Inserts one group/area from inside a template, with its subtree. */
  onAddTemplateNode: (template: EstimateTemplate, node: EstimateTreeNode) => void;
  onTemplateDragStart: (event: DragEvent<HTMLElement>, template: EstimateTemplate) => void;
  /** Dragging a category header carries every template inside it. */
  onCategoryDragStart: (event: DragEvent<HTMLElement>, category: string, templates: EstimateTemplate[]) => void;
  /** Dragging a group/area from inside a template carries that subtree. */
  onTemplateNodeDragStart: (event: DragEvent<HTMLElement>, template: EstimateTemplate, node: EstimateTreeNode) => void;
  /** Context-menu CRUD on template rows; items appear only when provided. */
  onRenameTemplate?: (template: EstimateTemplate) => void;
  onDeleteTemplate?: (template: EstimateTemplate) => void;
  /** Context-menu create on category headers (opens the new-template flow). */
  onCreateTemplate?: (category: string) => void;
  /** Component rows inside templates insert/drag exactly like library items. */
  componentAddDisabled: boolean;
  componentAddLabel: string;
  onAddComponent: (item: EstimateRowItem) => void;
  onItemDragStart: (event: DragEvent<HTMLElement>, item: EstimateRowItem) => void;
  selectable?: boolean;
  checkedIds?: string[];
  onCheckToggle?: (nodeId: string, checked: boolean) => void;
  emptyState?: React.ReactNode;
};

export function TemplatesTree({
  templates,
  searchQuery,
  expandedNodeIds,
  onToggle,
  canInsertTemplate,
  templateTargetName,
  onAddTemplate,
  onAddTemplateNode,
  onTemplateDragStart,
  onCategoryDragStart,
  onTemplateNodeDragStart,
  onRenameTemplate,
  onDeleteTemplate,
  onCreateTemplate,
  componentAddDisabled,
  componentAddLabel,
  onAddComponent,
  onItemDragStart,
  selectable = false,
  checkedIds,
  onCheckToggle,
  emptyState,
}: TemplatesTreeProps) {
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const filteredTemplates = useMemo(
    () => filterTemplatesByQuery(templates, searchQuery),
    [templates, searchQuery],
  );
  const uiNodes = useMemo(() => buildTemplatesTreeNodes(filteredTemplates), [filteredTemplates]);
  const nodeById = useMemo(() => {
    const map = new Map<string, UiTreeNode>();
    function visit(node: UiTreeNode) {
      map.set(node.id, node);
      node.children?.forEach(visit);
    }
    uiNodes.forEach(visit);
    return map;
  }, [uiNodes]);
  const searchActive = searchQuery.trim().length > 0;
  // Active searches reveal every match instead of hiding hits under
  // collapsed categories or template roots.
  const effectiveExpandedIds = useMemo(
    () => (searchActive ? getTemplatesTreeAllNodeIds(uiNodes) : expandedNodeIds),
    [searchActive, uiNodes, expandedNodeIds],
  );

  const templatesByCategory = useCallback(
    (category: string) => filteredTemplates.filter((template) => template.category === category),
    [filteredTemplates],
  );

  // Every row drags: categories carry their templates, templates carry
  // themselves, inner nodes carry their subtree, components are row items.
  const handleCanDrag = useCallback(() => true, []);

  const handleNodeDragStart = useCallback(
    (nodeId: string, event: DragEvent<HTMLElement>) => {
      const datum = nodeById.get(nodeId) ? getTemplatesTreeDatum(nodeById.get(nodeId)!) : undefined;
      if (datum?.type === "template") onTemplateDragStart(event, datum.template);
      if (datum?.type === "template-row") onItemDragStart(event, datum.item);
      if (datum?.type === "category") onCategoryDragStart(event, datum.category, templatesByCategory(datum.category));
      if (datum?.type === "template-node") onTemplateNodeDragStart(event, datum.template, datum.node);
    },
    [nodeById, onCategoryDragStart, onItemDragStart, onTemplateDragStart, onTemplateNodeDragStart, templatesByCategory],
  );

  const handleRowClick = useCallback(
    (nodeId: string, node: UiTreeNode) => {
      const datum = getTemplatesTreeDatum(node);
      // Leaf component rows have nothing to toggle; everything else folds.
      if (datum?.type === "template-row") return;
      if (node.children?.length || node.isLeaf === false) onToggle(nodeId);
    },
    [onToggle],
  );

  const handleTreeContextMenu = useCallback((nodeId: string) => {
    setContextMenuNodeId(nodeId);
  }, []);

  const contextMenuGroups = useMemo<ActionMenuGroup[]>(() => {
    const contextNode = contextMenuNodeId ? nodeById.get(contextMenuNodeId) : undefined;
    const datum = contextNode ? getTemplatesTreeDatum(contextNode) : undefined;
    if (!contextNode || !datum) return [];

    const expanded = effectiveExpandedIds.includes(contextNode.id);
    const toggleItem = contextNode.children?.length
      ? [{
          id: expanded ? "collapse" : "expand",
          label: expanded ? "Collapse" : "Expand",
          icon: expanded
            ? <CaretDown size={12} weight="regular" aria-hidden="true" />
            : <CaretRight size={12} weight="regular" aria-hidden="true" />,
          onSelect: () => onToggle(contextNode.id),
        }]
      : [];

    if (datum.type === "template") {
      return [
        {
          id: "template-actions",
          items: [
            {
              id: "add-template",
              label: canInsertTemplate ? `Add to ${templateTargetName}` : "Add to estimate",
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              disabled: !canInsertTemplate,
              disabledReason: "Select a Group Node before adding this template.",
              onSelect: () => onAddTemplate(datum.template),
            },
            ...toggleItem,
          ],
        },
        {
          id: "template-edit",
          items: onRenameTemplate
            ? [
                {
                  id: "rename-template",
                  label: "Rename",
                  icon: <PencilSimple size={12} weight="regular" aria-hidden="true" />,
                  onSelect: () => onRenameTemplate(datum.template),
                },
              ]
            : [],
        },
        {
          id: "template-danger",
          items: onDeleteTemplate
            ? [
                {
                  id: "delete-template",
                  label: "Delete",
                  icon: <Trash size={12} weight="regular" aria-hidden="true" />,
                  tone: "destructive" as const,
                  onSelect: () => onDeleteTemplate(datum.template),
                },
              ]
            : [],
        },
      ];
    }
    if (datum.type === "template-node") {
      return [
        {
          id: "template-node-actions",
          items: [
            {
              id: "add-template-node",
              label: canInsertTemplate ? `Add to ${templateTargetName}` : "Add to estimate",
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              disabled: !canInsertTemplate,
              disabledReason: "Select a Group Node before adding this node.",
              onSelect: () => onAddTemplateNode(datum.template, datum.node),
            },
            ...toggleItem,
          ],
        },
      ];
    }
    if (datum.type === "template-row") {
      return [
        {
          id: "template-component-actions",
          items: [
            {
              id: "add-component",
              label: componentAddDisabled ? "Add component" : componentAddLabel,
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              disabled: componentAddDisabled,
              disabledReason: "Select an Area Node before adding this component.",
              onSelect: () => onAddComponent(datum.item),
            },
          ],
        },
      ];
    }
    if (datum.type === "category") {
      const categoryTemplates = templatesByCategory(datum.category);
      return [
        {
          id: "template-category-create",
          items: onCreateTemplate
            ? [
                {
                  id: "new-template-in-category",
                  label: "New Template",
                  icon: <StackPlus size={12} weight="regular" aria-hidden="true" />,
                  onSelect: () => onCreateTemplate(datum.category),
                },
              ]
            : [],
        },
        {
          id: "template-category-actions",
          items: [
            {
              id: "add-category-templates",
              label: canInsertTemplate
                ? `Add ${categoryTemplates.length} ${categoryTemplates.length === 1 ? "template" : "templates"} to ${templateTargetName}`
                : "Add all to estimate",
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              disabled: !canInsertTemplate || categoryTemplates.length === 0,
              disabledReason: "Select a Group Node before adding these templates.",
              onSelect: () => categoryTemplates.forEach((template) => onAddTemplate(template)),
            },
            ...toggleItem,
          ],
        },
      ];
    }
    return toggleItem.length ? [{ id: "template-folder-actions", items: toggleItem }] : [];
  }, [
    canInsertTemplate,
    componentAddDisabled,
    componentAddLabel,
    contextMenuNodeId,
    effectiveExpandedIds,
    nodeById,
    onAddComponent,
    onAddTemplate,
    onAddTemplateNode,
    onCreateTemplate,
    onDeleteTemplate,
    onRenameTemplate,
    onToggle,
    templatesByCategory,
    templateTargetName,
  ]);

  const renderTemplatesRowLabel = useCallback(
    (treeNode: UiTreeNode) => {
      const datum = getTemplatesTreeDatum(treeNode);
      if (datum?.type === "category") {
        return (
          <TemplateNodeRowContent
            label={datum.category}
            total={templatesByCategory(datum.category).reduce(
              (sum, template) => sum + summarizeEstimateTemplate(template).total,
              0,
            )}
          />
        );
      }
      if (datum?.type === "template") {
        return <TemplateNodeRowContent label={datum.template.name} total={summarizeEstimateTemplate(datum.template).total} />;
      }
      if (datum?.type === "template-node") {
        return <TemplateNodeRowContent label={datum.node.name} total={computeTemplateNodeTotal(datum.node)} />;
      }
      if (datum?.type === "template-row") {
        return <TemplateComponentRowContent item={datum.item} />;
      }
      return <span className="min-w-0 flex-1 truncate">{treeNode.label}</span>;
    },
    [templatesByCategory],
  );

  if (templates.length === 0) {
    return (
      <>
        {emptyState ?? (
          <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/30 p-2 text-[10px] leading-4 text-tertiary">
            No templates yet. Select a Group or Area Node in the estimate tree, then use Add Template to save its structure for reuse.
          </div>
        )}
      </>
    );
  }

  if (uiNodes.length === 0) {
    return (
      <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
        No templates match &quot;{searchQuery}&quot;.
      </div>
    );
  }

  return (
    <ContextMenu onOpenChange={setContextMenuOpen}>
      <ContextMenuTrigger asChild>
        <div
          className="block w-full"
          onContextMenu={(event) => {
            // Only rows open the menu; right-clicks on empty tree space keep
            // the menu closed.
            if (!(event.target instanceof Element) || !event.target.closest("[data-tree-row]")) {
              event.preventDefault();
            }
          }}
        >
          <Tree
            nodes={uiNodes}
            ariaLabel="Estimate templates"
            className="relative min-h-7 overflow-visible"
            expandedIds={effectiveExpandedIds}
            onToggle={(nodeId) => onToggle(nodeId)}
            selectable={selectable}
            selectedIds={selectable ? (checkedIds ?? []) : []}
            onCheckboxToggle={
              selectable && onCheckToggle ? (nodeId, checked) => onCheckToggle(nodeId, checked) : undefined
            }
            railsPinned={contextMenuOpen}
            draggable
            canDrag={handleCanDrag}
            onNodeDragStart={handleNodeDragStart}
            onRowClick={handleRowClick}
            onContextMenu={handleTreeContextMenu}
            renderRow={renderTemplatesRowLabel}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent data-templates-tree-context-menu="true" alignOffset={4}>
        <ContextActionMenuContent groups={contextMenuGroups} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
