"use client";

import { type CSSProperties, useMemo, useState } from "react";
import { SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import { WorkshopTreeTabs } from "@/components/workshop/workshop-tree";
import {
  componentCategoryTree,
  type ComponentLibraryTaxonomyNode,
} from "@/lib/component-library/taxonomy";
import { cn } from "@/lib/ui/cn";
import { estimateLibraryItems, type EstimateRowItem } from "../estimate-tree-data";
import {
  buildComponentLibraryNavigationTree,
  filterTree,
  getLibraryItemsForTreeNode,
  getAllNodeIds,
  LibraryTree,
} from "../component-library/tree";
import {
  getComponentName,
  getComponentPrice,
  pesoFormatter,
} from "../component-library/helpers";
import type { LibraryTreeNode, LibraryTreeTab } from "../component-library/tree/types";
import type { ComponentLibrarySupplierOption } from "../component-library/tree/buildLibraryTree";
import {
  buildTemplateNavigationTree,
  getTemplatesForTreeNode,
  summarizeEstimateTemplate,
  type EstimateTemplate,
} from "../component-library/templates";

const COMPONENT_LIBRARY_TREE_WIDTH = 376;
const COMPONENT_LIBRARY_TREE_LEFT_EXTENSION_WIDTH = 104;
const LIBRARY_TREE_TABS = [
  { id: "categories", label: "Categories" },
  { id: "suppliers", label: "Suppliers" },
  { id: "custom", label: "Custom" },
  { id: "templates", label: "Templates" },
] as const;
type ComponentLibraryManagerTab = (typeof LIBRARY_TREE_TABS)[number]["id"];

function findNode(nodes: LibraryTreeNode[], nodeId: string): LibraryTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = findNode(node.children ?? [], nodeId);
    if (child) return child;
  }
  return null;
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function itemMatchesSheetQuery(item: EstimateRowItem, query: string): boolean {
  const normalizedQuery = normalizeLabel(query);
  if (!normalizedQuery) return true;

  return [
    getComponentName(item),
    item.supplier,
    item.category,
    item.unit,
    item.description,
    ...(item.categoryPath ?? []),
  ]
    .filter(Boolean)
    .some((value) => normalizeLabel(value).includes(normalizedQuery));
}

function ComponentLibraryTreePanel({
  activeTab,
  activeNodes,
  selectedNodeId,
  onTabChange,
  onSelectNode,
}: {
  activeTab: ComponentLibraryManagerTab;
  activeNodes: LibraryTreeNode[];
  selectedNodeId: string;
  onTabChange: (tab: ComponentLibraryManagerTab) => void;
  onSelectNode: (nodeId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredNodes = filterTree(activeNodes, searchQuery);
  const [expandedNodeIds, setExpandedNodeIds] = useState(() => getAllNodeIds(activeNodes));

  function handleTabChange(tab: ComponentLibraryManagerTab) {
    onTabChange(tab);
    setSearchQuery("");
  }

  function toggleNode(nodeId: string) {
    setExpandedNodeIds((current) =>
      current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
    );
  }

  return (
    <ResizableSidePanel
      side="left"
      ariaLabel="Component library tree"
      storageKey="component_library_tree_width"
      defaultWidth={272}
      minWidth={216}
      maxWidth={432}
      widthOffset={COMPONENT_LIBRARY_TREE_LEFT_EXTENSION_WIDTH}
    >
      <div className="flex h-full flex-col overflow-hidden border-r border-hairline bg-white" data-component-library-tree-panel="true">
        <div className="sticky top-0 z-20 shrink-0 bg-white">
          <SearchInput
            placeholder="Search Library Tree"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
            aria-label="Search component library tree"
            wrapperClassName="w-full"
          />
          <HeaderIconToolbar
            ariaLabel="Component tree tools"
            labelPrefix="component tree"
            onExpandAll={() => setExpandedNodeIds(getAllNodeIds(activeNodes))}
            onCollapseAll={() => setExpandedNodeIds([])}
            addActions={[]}
          />
          <WorkshopTreeTabs
            tabs={LIBRARY_TREE_TABS}
            activeTab={activeTab}
            ariaLabel="Component library tree views"
            onTabChange={handleTabChange}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          <div className="h-6" />
          {filteredNodes.length > 0 ? (
            <LibraryTree
              nodes={filteredNodes}
              selectedNodeId={selectedNodeId}
              expandedNodeIds={expandedNodeIds}
              searchQuery={searchQuery}
              onSelect={(nodeId) => onSelectNode(nodeId)}
              onToggle={toggleNode}
            />
          ) : (
            <div className="rounded-md border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
              No tree matches for &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>
      </div>
    </ResizableSidePanel>
  );
}

function ComponentLibrarySheet({
  selectedNode,
  activeTab,
  libraryItems,
  categoryTree,
  suppliers,
}: {
  selectedNode: LibraryTreeNode | null;
  activeTab: LibraryTreeTab;
  libraryItems: EstimateRowItem[];
  categoryTree: ComponentLibraryTaxonomyNode[];
  suppliers: ComponentLibrarySupplierOption[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const sheetItems = useMemo(
    () => getLibraryItemsForTreeNode(activeTab, selectedNode?.id ?? null, libraryItems, [], [], { categoryTree, suppliers }),
    [activeTab, categoryTree, libraryItems, selectedNode, suppliers],
  );
  const visibleItems = useMemo(
    () => sheetItems.filter((item) => itemMatchesSheetQuery(item, searchQuery)),
    [searchQuery, sheetItems],
  );
  const selectedLabel = selectedNode?.label ?? "All components";

  return (
    <section
      id="component-library-sheet-center-column"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white !text-[10px]"
      data-component-library-sheet="true"
      aria-label="Custom component sheet"
    >
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur" aria-label="Component sheet controls">
        <div className="flex h-[38px] items-center">
          <SearchInput
            wrapperClassName="w-full"
            placeholder="Search Component Sheet"
            aria-label="Search component sheet"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
        <HeaderIconToolbar ariaLabel="Component sheet tools" labelPrefix="component sheet" />
        <div className="flex h-[32px] items-end gap-0 border-b border-hairline bg-surfaceMuted" role="tablist" aria-label="Component sheet tabs">
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className={cn(
              "relative h-full rounded-t-md border border-b-0 px-3 text-[10px] font-bold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              "z-10 bg-white text-ink border-hairline -mb-px",
            )}
          >
            {selectedLabel}
          </button>
          <span className="ml-auto self-center pr-2 text-[9px] font-bold text-tertiary">
            {visibleItems.length} / {sheetItems.length}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {visibleItems.length > 0 ? (
          <ul className="space-y-1" aria-label={`${selectedLabel} component rows`}>
            {visibleItems.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-hairline px-2 py-1.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold leading-4 text-ink">{getComponentName(item)}</p>
                  <p className="truncate text-[9px] font-semibold leading-3 text-tertiary">
                    {item.supplier || "No supplier"} / {item.category}
                  </p>
                </div>
                <span className="font-mono text-[10px] font-bold tabular-nums text-ink">
                  {pesoFormatter.format(getComponentPrice(item))}
                </span>
                <span className="text-[9px] font-semibold text-tertiary">/{item.unit}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-full items-center justify-center bg-white p-2 text-center">
            <div>
              <SquaresFour size={18} weight="bold" className="mx-auto mb-2 text-tertiary" aria-hidden="true" />
              <p className="text-[11px] font-bold leading-4 text-ink">{selectedLabel}</p>
              <p className="mt-0.5 max-w-56 text-[9px] leading-4 text-tertiary">
                {searchQuery ? `No components match "${searchQuery}".` : "No components in this folder yet."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
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
      id="component-library-sheet-center-column"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white !text-[10px]"
      data-component-library-sheet="true"
      aria-label="Custom component sheet"
    >
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur" aria-label="Component sheet controls">
        <div className="flex h-[38px] items-center">
          <SearchInput
            wrapperClassName="w-full"
            placeholder="Search Template Sheet"
            aria-label="Search component sheet"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
        <HeaderIconToolbar ariaLabel="Component sheet tools" labelPrefix="component sheet" />
        <div className="flex h-[32px] items-end gap-0 border-b border-hairline bg-surfaceMuted" role="tablist" aria-label="Component sheet tabs">
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className={cn(
              "relative h-full rounded-t-md border border-b-0 px-3 text-[10px] font-bold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              "z-10 bg-white text-ink border-hairline -mb-px",
            )}
          >
            {selectedLabel}
          </button>
          <span className="ml-auto self-center pr-2 text-[9px] font-bold text-tertiary">
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
                    <p className="truncate text-[10px] font-bold leading-4 text-ink">{template.name}</p>
                    <p className="truncate text-[9px] font-semibold leading-3 text-tertiary">
                      {summary.groupCount} groups / {summary.areaCount} areas / {summary.rowCount} rows
                    </p>
                    <p className="truncate text-[9px] leading-3 text-tertiary/80">{template.description}</p>
                  </div>
                  <span className="font-mono text-[10px] font-bold tabular-nums text-ink">
                    {pesoFormatter.format(summary.total)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-full items-center justify-center bg-white p-2 text-center">
            <div>
              <SquaresFour size={18} weight="bold" className="mx-auto mb-2 text-tertiary" aria-hidden="true" />
              <p className="text-[11px] font-bold leading-4 text-ink">{selectedLabel}</p>
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

export function ComponentLibraryManager({
  categoryTree = componentCategoryTree,
  suppliers = [],
  libraryItems = estimateLibraryItems,
  templates = [],
}: {
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  libraryItems?: EstimateRowItem[];
  templates?: EstimateTemplate[];
} = {}) {
  const [activeTab, setActiveTab] = useState<ComponentLibraryManagerTab>("categories");
  const [selectedNodeIdByTab, setSelectedNodeIdByTab] = useState<Record<ComponentLibraryManagerTab, string>>({
    categories: "all-components",
    suppliers: "all-suppliers",
    custom: "custom-root",
    templates: "all-templates",
  });
  const libraryTrees = useMemo<Record<ComponentLibraryManagerTab, LibraryTreeNode[]>>(() => ({
    categories: buildComponentLibraryNavigationTree("categories", libraryItems, [], [], { categoryTree, suppliers }),
    suppliers: buildComponentLibraryNavigationTree("suppliers", libraryItems, [], [], { categoryTree, suppliers }),
    custom: buildComponentLibraryNavigationTree("custom", libraryItems, [], [], { categoryTree, suppliers }),
    templates: buildTemplateNavigationTree(templates),
  }), [categoryTree, libraryItems, suppliers, templates]);
  const selectedNodeId = selectedNodeIdByTab[activeTab];
  const selectedNode = useMemo(() => findNode(libraryTrees[activeTab], selectedNodeId) ?? libraryTrees[activeTab][0] ?? null, [activeTab, libraryTrees, selectedNodeId]);

  function selectNode(nodeId: string) {
    setSelectedNodeIdByTab((current) => ({ ...current, [activeTab]: nodeId }));
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-hairline bg-white" data-component-library-workspace="true">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <div
          className="relative h-10 shrink-0 border-b border-hairline bg-white"
          data-workshop-layout="component-library-workspace-header-row"
          style={{ "--component-library-tree-width": `${COMPONENT_LIBRARY_TREE_WIDTH}px` } as CSSProperties}
        >
          <div
            className="absolute inset-y-0 left-0 hidden items-center pl-4 pr-2 lg:flex"
            style={{ width: `${COMPONENT_LIBRARY_TREE_WIDTH}px` }}
          />
          <div
            className="absolute inset-y-0 left-0 right-0 flex min-w-0 items-center lg:left-[var(--component-library-tree-width)]"
            data-component-library-center-header="true"
          />
        </div>

        <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label="Component library workspace">
          <ComponentLibraryTreePanel
            key={activeTab}
            activeTab={activeTab}
            activeNodes={libraryTrees[activeTab]}
            selectedNodeId={selectedNodeId}
            onTabChange={setActiveTab}
            onSelectNode={selectNode}
          />
          {activeTab === "templates" ? (
            <TemplateLibrarySheet selectedNode={selectedNode} templates={templates} />
          ) : (
            <ComponentLibrarySheet
              selectedNode={selectedNode}
              activeTab={activeTab as LibraryTreeTab}
              libraryItems={libraryItems}
              categoryTree={categoryTree}
              suppliers={suppliers}
            />
          )}
        </section>
      </div>
    </div>
  );
}
