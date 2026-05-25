"use client";

import { useMemo, useState } from "react";
import { CaretDown, CaretRight, FolderSimple, SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import { WORKSHOP_TREE_ICON_SLOT_CLASS } from "@/components/workshop/tree-visual-style";
import { WorkshopTree, WorkshopTreeRow, WorkshopTreeTabs } from "@/components/workshop/workshop-tree";
import { cn } from "@/lib/ui/cn";
import { pesoFormatter } from "../component-library/helpers";
import {
  buildTemplateNavigationTree,
  getTemplatesForTreeNode,
  summarizeEstimateTemplate,
  toTemplateTreeItemId,
  type EstimateTemplate,
} from "../component-library/templates";
import {
  filterTree,
  findNode,
  getAllNodeIds,
} from "../component-library/tree";
import type { LibraryTreeNode } from "../component-library/tree/types";

const TEMPLATE_LIBRARY_TREE_WIDTH_OFFSET = 104;
const TEMPLATE_LIBRARY_TABS = [{ id: "templates", label: "Templates" }] as const;

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function templateMatchesSheetQuery(template: EstimateTemplate, query: string): boolean {
  const normalizedQuery = normalizeLabel(query);
  if (!normalizedQuery) return true;

  return [
    template.name,
    template.description,
    template.category,
    ...template.nodes.flatMap((node) => [
      node.name,
      ...(node.children ?? []).map((child) => child.name),
    ]),
  ]
    .filter(Boolean)
    .some((value) => normalizeLabel(value).includes(normalizedQuery));
}

function TemplateLibrarySheet({
  selectedNode,
  templates,
}: {
  selectedNode: LibraryTreeNode | null;
  templates: EstimateTemplate[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const sheetTemplates = useMemo(
    () => getTemplatesForTreeNode(selectedNode?.id ?? null, templates),
    [selectedNode, templates],
  );
  const visibleTemplates = useMemo(
    () => sheetTemplates.filter((template) => templateMatchesSheetQuery(template, searchQuery)),
    [searchQuery, sheetTemplates],
  );
  const selectedLabel = selectedNode?.label ?? "All Templates";

  return (
    <section
      id="template-library-sheet-center-column"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white !text-[10px]"
      data-template-library-sheet="true"
      aria-label="Template sheet"
    >
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur" aria-label="Template sheet controls">
        <div className="flex h-[38px] items-center">
          <SearchInput
            wrapperClassName="w-full"
            placeholder="Search Template Sheet"
            aria-label="Search template sheet"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
        <HeaderIconToolbar ariaLabel="Template sheet tools" labelPrefix="template sheet" addActions={[]} />
        <div className="flex h-[32px] items-end gap-0 border-b border-hairline bg-surfaceMuted" role="tablist" aria-label="Template sheet tabs">
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className={cn(
              "relative h-full rounded-xs border border-b-0 px-3 text-[10px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              "z-10 -mb-px border-hairline bg-white text-ink",
            )}
          >
            {selectedLabel}
          </button>
          <span className="ml-auto self-center pr-2 text-[9px] font-medium text-tertiary">
            {visibleTemplates.length} / {sheetTemplates.length}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {visibleTemplates.length > 0 ? (
          <ul className="space-y-1" aria-label={`${selectedLabel} template rows`}>
            {visibleTemplates.map((template) => {
              const summary = summarizeEstimateTemplate(template);
              return (
                <li
                  key={template.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-hairline px-2 py-1.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium leading-4 text-ink">{template.name}</p>
                    <p className="truncate text-[9px] font-medium leading-3 text-tertiary">
                      {summary.groupCount} groups / {summary.areaCount} areas / {summary.rowCount} rows
                    </p>
                    <p className="truncate text-[9px] leading-3 text-tertiary/80">{template.description}</p>
                  </div>
                  <span className="font-sans text-[10px] font-medium tabular-nums text-ink">
                    {pesoFormatter.format(summary.total)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-full items-center justify-center bg-white p-2 text-center">
            <div>
              <SquaresFour size={18} weight="regular" className="mx-auto mb-2 text-tertiary" aria-hidden="true" />
              <p className="text-[11px] font-medium leading-4 text-ink">{selectedLabel}</p>
              <p className="mt-0.5 max-w-56 text-[9px] leading-4 text-tertiary">
                {searchQuery ? `No templates match "${searchQuery}".` : "No templates in this folder yet."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TemplateLibraryTreePanel({
  nodes,
  templates,
  selectedNodeId,
  onSelectNode,
}: {
  nodes: LibraryTreeNode[];
  templates: EstimateTemplate[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredNodes = filterTree(nodes, searchQuery);
  const [expandedNodeIds, setExpandedNodeIds] = useState(() => getAllNodeIds(nodes));
  const templatesByTreeItemId = useMemo(
    () => new Map(templates.map((template) => [toTemplateTreeItemId(template.id), template])),
    [templates],
  );

  function toggleNode(nodeId: string) {
    setExpandedNodeIds((current) =>
      current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
    );
  }

  return (
    <ResizableSidePanel
      side="right"
      ariaLabel="Template library tree"
      storageKey="template_library_tree_width"
      defaultWidth={272}
      minWidth={216}
      maxWidth={432}
      widthOffset={TEMPLATE_LIBRARY_TREE_WIDTH_OFFSET}
    >
      <div className="flex h-full flex-col overflow-hidden border-l border-hairline bg-white" data-template-library-tree-panel="true">
        <div className="sticky top-0 z-20 shrink-0 bg-white">
          <SearchInput
            placeholder="Search Template Tree"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
            aria-label="Search template library tree"
            wrapperClassName="w-full"
          />
          <HeaderIconToolbar
            ariaLabel="Template tree tools"
            labelPrefix="template tree"
            onExpandAll={() => setExpandedNodeIds(getAllNodeIds(nodes))}
            onCollapseAll={() => setExpandedNodeIds([])}
            addActions={[]}
          />
          <WorkshopTreeTabs
            tabs={TEMPLATE_LIBRARY_TABS}
            activeTab="templates"
            ariaLabel="Library views"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          <div className="h-6" />
          {filteredNodes.length > 0 ? (
            <WorkshopTree
              nodes={filteredNodes}
              selectedNodeId={selectedNodeId}
              expandedNodeIds={expandedNodeIds}
              getNodeId={(node) => node.id}
              getChildren={(node) => node.children}
              renderNode={({ node, depth, selected, expanded, hasChildren, children }) => {
                const template = templatesByTreeItemId.get(node.id);
                const summary = template ? summarizeEstimateTemplate(template) : null;

                if (node.kind === "template") {
                  return (
                    <li role="none">
                      <WorkshopTreeRow
                        as="div"
                        role="treeitem"
                        aria-label={node.label}
                        aria-selected={selected}
                        data-template-library-tree-item-id={node.id}
                        depth={depth}
                        selected={selected}
                        className="cursor-pointer gap-1.5"
                        onClick={() => onSelectNode(node.id)}
                      >
                        <SquaresFour size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[10px] font-medium leading-4 text-ink">{node.label}</span>
                            <span className="truncate text-[9px] leading-3 text-tertiary">{node.meta}</span>
                          </div>
                          {summary ? (
                            <span className="font-sans text-[9px] font-medium tabular-nums text-ink">
                              {pesoFormatter.format(summary.total)}
                            </span>
                          ) : null}
                        </div>
                      </WorkshopTreeRow>
                    </li>
                  );
                }

                return (
                  <li role="none">
                    <WorkshopTreeRow
                      role="treeitem"
                      aria-label={node.label}
                      aria-selected={selected}
                      aria-expanded={hasChildren ? expanded : undefined}
                      data-template-library-tree-node-id={node.id}
                      depth={depth}
                      selected={selected}
                      className="gap-1"
                      onClick={() => onSelectNode(node.id)}
                    >
                      <span
                        className={cn(WORKSHOP_TREE_ICON_SLOT_CLASS, "hover:bg-white")}
                        onClick={(event) => {
                          if (!hasChildren) return;
                          event.stopPropagation();
                          toggleNode(node.id);
                        }}
                      >
                        {hasChildren ? (
                          expanded ? (
                            <CaretDown size={11} weight="regular" aria-hidden="true" />
                          ) : (
                            <CaretRight size={11} weight="regular" aria-hidden="true" />
                          )
                        ) : null}
                      </span>
                      <FolderSimple size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{node.label}</span>
                    </WorkshopTreeRow>
                    {children}
                  </li>
                );
              }}
            />
          ) : (
            <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
              No templates match &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>
      </div>
    </ResizableSidePanel>
  );
}

export function TemplateLibraryManager({ templates = [] }: { templates?: EstimateTemplate[] } = {}) {
  const templateTree = useMemo(() => buildTemplateNavigationTree(templates), [templates]);
  const [selectedTemplateNodeId, setSelectedTemplateNodeId] = useState("all-templates");
  const selectedTemplateNode = useMemo(
    () => findNode(templateTree, selectedTemplateNodeId) ?? templateTree[0] ?? null,
    [selectedTemplateNodeId, templateTree],
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xs border border-hairline bg-white" data-template-library-workspace="true">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <div
          className="relative h-10 shrink-0 border-b border-hairline bg-white"
          data-workshop-layout="template-library-workspace-header-row"
        >
          <div
            className="absolute inset-y-0 left-0 right-0 flex min-w-0 items-center"
            data-template-library-center-header="true"
          />
        </div>

        <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label="Template library workspace">
          <div className="flex min-h-0 min-w-0 flex-1" data-component-library-sheet-panel="true">
            <TemplateLibrarySheet selectedNode={selectedTemplateNode} templates={templates} />
          </div>
          <TemplateLibraryTreePanel
            nodes={templateTree}
            templates={templates}
            selectedNodeId={selectedTemplateNode?.id ?? "all-templates"}
            onSelectNode={setSelectedTemplateNodeId}
          />
        </section>
      </div>
    </div>
  );
}
