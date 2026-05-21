"use client";

import { type CSSProperties, useMemo, useState } from "react";
import {
  CaretDown,
  CaretRight,
  FolderSimple,
  Package,
  SquaresFour,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import {
  componentCategoryTaxonomyVersion,
  componentCategoryTree,
  type ComponentLibraryTaxonomyNode,
} from "@/lib/component-library/taxonomy";
import { cn } from "@/lib/ui/cn";

type LibraryTreeTab = "categories" | "suppliers";

type LibraryTreeNode = ComponentLibraryTaxonomyNode;

type ComponentLibraryItem = {
  id: string;
  name: string;
  supplier: string;
  discipline: string;
  subdiscipline: string;
  designation: string;
  unit: string;
  itemCost: number;
  otherCost: number;
  laborCost: number;
  pricingHealth: "quoted" | "verify" | "allowance";
  checkedAt: string;
  categoryNodeIds: string[];
  supplierNodeIds: string[];
};

const COMPONENT_LIBRARY_TREE_WIDTH = 376;
const COMPONENT_LIBRARY_TREE_LEFT_EXTENSION_WIDTH = 104;

const libraryTrees: Record<LibraryTreeTab, LibraryTreeNode[]> = {
  categories: componentCategoryTree,
  suppliers: [
    {
      id: "sup-ikea",
      label: "IKEA Philippines",
      meta: "Supplier catalog",
      children: [
        { id: "sup-ikea-furniture", label: "Furniture", meta: "Loose furniture benchmarks" },
        { id: "sup-ikea-appliances", label: "Appliances", meta: "Domestic appliance benchmarks" },
      ],
    },
    {
      id: "sup-wilcon",
      label: "Wilcon Depot",
      meta: "Supplier catalog",
      children: [
        { id: "sup-wilcon-fixtures", label: "Fixtures", meta: "Lighting, plumbing, and sanitary fixture quotes" },
        { id: "sup-wilcon-finishes", label: "Finishes", meta: "Tile, paint, and surface finish quotes" },
      ],
    },
    {
      id: "sup-boysen",
      label: "Boysen Philippines",
      meta: "Paint systems",
      children: [
        { id: "sup-boysen-paint", label: "Wall paint systems", code: "ARC-SPEC", meta: "Paint, primer, putty" },
      ],
    },
  ],
};

const componentItems: ComponentLibraryItem[] = [
  {
    id: "comp-hemlingby-loveseat",
    name: "HEMLINGBY Loveseat",
    supplier: "IKEA Philippines",
    discipline: "FUR",
    subdiscipline: "Furniture",
    designation: "Loose furniture benchmark",
    unit: "pc",
    itemCost: 7999,
    otherCost: 0,
    laborCost: 1200,
    pricingHealth: "verify",
    checkedAt: "2026-05-17",
    categoryNodeIds: ["section-objects", "furniture", "furniture-seating"],
    supplierNodeIds: ["sup-ikea", "sup-ikea-furniture"],
  },
  {
    id: "comp-sandsberg-table",
    name: "SANDSBERG Dining Table",
    supplier: "IKEA Philippines",
    discipline: "FUR",
    subdiscipline: "Furniture",
    designation: "Dining furniture allowance",
    unit: "pc",
    itemCost: 2999,
    otherCost: 2500,
    laborCost: 1200,
    pricingHealth: "quoted",
    checkedAt: "2026-05-17",
    categoryNodeIds: ["section-objects", "furniture", "furniture-dining-tables"],
    supplierNodeIds: ["sup-ikea", "sup-ikea-furniture"],
  },
  {
    id: "comp-led-downlight",
    name: "LED Downlight 18W",
    supplier: "Wilcon Depot",
    discipline: "LGT",
    subdiscipline: "LGT-FIX",
    designation: "Recessed luminaire",
    unit: "pc",
    itemCost: 620,
    otherCost: 80,
    laborCost: 250,
    pricingHealth: "allowance",
    checkedAt: "2026-05-17",
    categoryNodeIds: ["section-objects", "fixtures", "fixtures-lighting-fixtures"],
    supplierNodeIds: ["sup-wilcon", "sup-wilcon-fixtures"],
  },
  {
    id: "comp-lavatory-faucet",
    name: "Lavatory Faucet",
    supplier: "Wilcon Depot",
    discipline: "P",
    subdiscipline: "P-FIX",
    designation: "Counter-mounted faucet",
    unit: "pc",
    itemCost: 4200,
    otherCost: 250,
    laborCost: 900,
    pricingHealth: "verify",
    checkedAt: "2026-05-17",
    categoryNodeIds: ["section-objects", "fixtures", "fixtures-plumbing-fixtures"],
    supplierNodeIds: ["sup-wilcon", "sup-wilcon-fixtures"],
  },
  {
    id: "comp-structural-concrete",
    name: "Structural Concrete Class A",
    supplier: "Local ready-mix supplier",
    discipline: "STR",
    subdiscipline: "STR-CONC",
    designation: "Concrete, rebar excluded",
    unit: "m3",
    itemCost: 5650,
    otherCost: 350,
    laborCost: 1250,
    pricingHealth: "allowance",
    checkedAt: "2026-05-17",
    categoryNodeIds: ["section-structure", "concrete-work", "concrete-work-cast-in-place-concrete"],
    supplierNodeIds: [],
  },
  {
    id: "comp-permacoat",
    name: "Boysen Permacoat 4L",
    supplier: "Boysen Philippines",
    discipline: "ARC",
    subdiscipline: "ARC-SPEC",
    designation: "Wall paint system",
    unit: "gal",
    itemCost: 980,
    otherCost: 0,
    laborCost: 450,
    pricingHealth: "verify",
    checkedAt: "2026-05-17",
    categoryNodeIds: ["section-finishes", "paint", "paint-interior-paint"],
    supplierNodeIds: ["sup-boysen", "sup-boysen-paint"],
  },
];

function matchesQuery(node: LibraryTreeNode, query: string) {
  if (!query) return true;
  const haystack = [node.label, node.code, node.meta, ...(node.aliases ?? [])].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function filterTree(nodes: LibraryTreeNode[], query: string): LibraryTreeNode[] {
  if (!query.trim()) return nodes;
  return nodes.flatMap((node) => {
    const children = filterTree(node.children ?? [], query);
    if (matchesQuery(node, query) || children.length > 0) return [{ ...node, children }];
    return [];
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

function matchesComponent(item: ComponentLibraryItem, query: string) {
  if (!query.trim()) return true;
  const haystack = [
    item.name,
    item.supplier,
    item.discipline,
    item.subdiscipline,
    item.designation,
    item.unit,
    item.pricingHealth,
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function itemInScope(item: ComponentLibraryItem, activeTab: LibraryTreeTab, selectedNodeId: string) {
  if (!selectedNodeId) return true;
  const nodeIds = activeTab === "categories" ? item.categoryNodeIds : item.supplierNodeIds;
  return nodeIds.includes(selectedNodeId);
}

function findNode(nodes: LibraryTreeNode[], nodeId: string): LibraryTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = findNode(node.children ?? [], nodeId);
    if (child) return child;
  }
  return null;
}

function getAllNodeIds(nodes: LibraryTreeNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...getAllNodeIds(node.children ?? [])]);
}

function ComponentLibraryTreeRow({
  node,
  depth,
  selectedNodeId,
  expandedNodeIds,
  onSelect,
  onToggle,
}: {
  node: LibraryTreeNode;
  depth: number;
  selectedNodeId: string;
  expandedNodeIds: string[];
  onSelect: (nodeId: string) => void;
  onToggle: (nodeId: string) => void;
}) {
  const hasChildren = Boolean(node.children?.length);
  const expanded = expandedNodeIds.includes(node.id);
  const selected = selectedNodeId === node.id;
  const Icon = hasChildren ? FolderSimple : Package;

  return (
    <li role="none">
      <div className="relative">
        <button
          type="button"
          role="treeitem"
          aria-label={node.label}
          aria-selected={selected}
          aria-expanded={hasChildren ? expanded : undefined}
          data-component-library-tree-node-id={node.id}
          className={cn(
            "group flex min-h-7 w-full items-center gap-1 rounded-sm px-1.5 text-left !text-[10px] font-semibold leading-4 text-ink outline-none transition hover:bg-surfaceMuted focus-visible:ring-2 focus-visible:ring-focus",
            "bg-white",
            selected ? "bg-accent-soft text-accent-dark" : null,
          )}
          style={{ paddingLeft: `${Math.min(depth * 20, 140)}px` }}
          onClick={() => onSelect(node.id)}
        >
          <span
            className="grid size-4 shrink-0 place-items-center rounded-sm text-tertiary hover:bg-white"
            onClick={(event) => {
              if (!hasChildren) return;
              event.stopPropagation();
              onToggle(node.id);
            }}
          >
            {hasChildren ? (
              expanded ? <CaretDown size={11} weight="bold" aria-hidden="true" /> : <CaretRight size={11} weight="bold" aria-hidden="true" />
            ) : null}
          </span>
          <Icon size={12} weight="bold" className="shrink-0 text-tertiary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
        </button>
      </div>
      {hasChildren && expanded ? (
        <ul role="group">
          {node.children?.map((child) => (
            <ComponentLibraryTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              expandedNodeIds={expandedNodeIds}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ComponentLibraryTreePanel({
  activeTab,
  selectedNodeId,
  onTabChange,
  onSelectNode,
}: {
  activeTab: LibraryTreeTab;
  selectedNodeId: string;
  onTabChange: (tab: LibraryTreeTab) => void;
  onSelectNode: (nodeId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const activeNodes = libraryTrees[activeTab];
  const filteredNodes = filterTree(activeNodes, searchQuery);
  const [expandedNodeIds, setExpandedNodeIds] = useState(() => getAllNodeIds(activeNodes));

  function handleTabChange(tab: LibraryTreeTab) {
    onTabChange(tab);
    setExpandedNodeIds(getAllNodeIds(libraryTrees[tab]));
  }

  function toggleNode(nodeId: string) {
    setExpandedNodeIds((current) => current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId]);
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
            shortcutKey="/"
          />
          <HeaderIconToolbar
            ariaLabel="Component tree tools"
            labelPrefix="component tree"
            onExpandAll={() => setExpandedNodeIds(getAllNodeIds(activeNodes))}
            onCollapseAll={() => setExpandedNodeIds([])}
            addActions={[]}
          />
          <div className="flex h-[30px] items-center gap-1 border-y border-hairline bg-white px-2" role="tablist" aria-label="Component library tree views">
            {([
              ["categories", "Categories"],
              ["suppliers", "Suppliers"],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={cn(
                  "h-5 rounded-sm px-1.5 !text-[9px] font-bold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  activeTab === tab ? "bg-ink text-white" : "bg-surfaceMuted text-tertiary hover:text-ink",
                )}
                onClick={() => handleTabChange(tab)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {filteredNodes.length > 0 ? (
            <ul role="tree" aria-label={`${activeTab === "categories" ? "Categories" : "Suppliers"} component library tree`} className="space-y-0.5">
              {filteredNodes.map((node) => (
                <ComponentLibraryTreeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedNodeId={selectedNodeId}
                  expandedNodeIds={expandedNodeIds}
                  onSelect={onSelectNode}
                  onToggle={toggleNode}
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed border-hairline bg-surface-muted p-2 text-[10px] leading-4 text-tertiary">
              No tree matches for &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>
      </div>
    </ResizableSidePanel>
  );
}

function ComponentLibrarySheet({
  activeTab,
  selectedNode,
  selectedNodeId,
}: {
  activeTab: LibraryTreeTab;
  selectedNode: LibraryTreeNode | null;
  selectedNodeId: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const visibleItems = componentItems.filter((item) => itemInScope(item, activeTab, selectedNodeId) && matchesComponent(item, searchQuery));
  const totalValue = visibleItems.reduce((total, item) => total + item.itemCost + item.otherCost + item.laborCost, 0);

  return (
    <section
      id="component-library-sheet-center-column"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white"
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
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        <div className="mb-2 flex min-h-10 items-center justify-between gap-2 border border-hairline bg-surface-muted px-2 py-1">
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-tertiary">
              {activeTab === "categories" ? "Category scope" : "Supplier scope"}
            </p>
            <h2 className="truncate text-[12px] font-bold leading-4 tracking-[-0.01em] text-ink">
              {selectedNode?.label ?? "All custom components"}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge tone="neutral" size="xs">{visibleItems.length} rows</Badge>
            <Badge tone="accent" size="xs">{formatCurrency(totalValue)}</Badge>
          </div>
        </div>

        {visibleItems.length > 0 ? (
          <>
          <div className="hidden overflow-hidden border border-hairline bg-white md:block">
            <table className="w-full table-fixed border-collapse text-left text-[10px]" aria-label="Custom user components">
              <thead className="bg-surface-muted text-[8px] font-bold uppercase tracking-[0.12em] text-tertiary">
                <tr className="border-b border-hairline">
                  <th className="w-[22%] px-2 py-1">Component</th>
                  <th className="w-[16%] px-2 py-1">Supplier</th>
                  <th className="w-[14%] px-2 py-1">Class</th>
                  <th className="w-[14%] px-2 py-1">Designation</th>
                  <th className="w-[8%] px-2 py-1">Unit</th>
                  <th className="w-[10%] px-2 py-1 text-right">Item</th>
                  <th className="w-[8%] px-2 py-1 text-right">Labor</th>
                  <th className="w-[8%] px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const total = item.itemCost + item.otherCost + item.laborCost;
                  return (
                    <tr key={item.id} className="border-b border-hairline last:border-b-0 hover:bg-surface-muted/70">
                      <td className="min-w-0 px-2 py-1 align-top">
                        <p className="truncate font-bold text-ink">{item.name}</p>
                        <p className="truncate text-[9px] leading-3 text-tertiary">{item.checkedAt} - {item.pricingHealth}</p>
                      </td>
                      <td className="truncate px-2 py-1 align-top text-tertiary">{item.supplier}</td>
                      <td className="px-2 py-1 align-top">
                        <span className="font-bold text-ink">{item.discipline}</span>
                        <span className="ml-1 text-tertiary">{item.subdiscipline}</span>
                      </td>
                      <td className="truncate px-2 py-1 align-top text-tertiary">{item.designation}</td>
                      <td className="px-2 py-1 align-top font-bold text-ink">{item.unit}</td>
                      <td className="px-2 py-1 text-right align-top font-mono text-[10px] font-bold tabular-nums">{formatCurrency(item.itemCost)}</td>
                      <td className="px-2 py-1 text-right align-top font-mono text-[10px] font-bold tabular-nums">{formatCurrency(item.laborCost)}</td>
                      <td className="px-2 py-1 text-right align-top font-mono text-[10px] font-bold tabular-nums text-ink">{formatCurrency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-1 md:hidden" aria-label="Custom user component cards">
            {visibleItems.map((item) => {
              const total = item.itemCost + item.otherCost + item.laborCost;
              return (
                <article key={item.id} className="border border-hairline bg-white p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-[11px] font-bold leading-4 text-ink">{item.name}</h3>
                      <p className="truncate text-[9px] leading-3 text-tertiary">{item.supplier}</p>
                    </div>
                    <p className="shrink-0 font-mono text-[10px] font-bold tabular-nums text-ink">{formatCurrency(total)}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-[9px] leading-3">
                    <div className="min-w-0">
                      <p className="font-bold uppercase text-tertiary">Class</p>
                      <p className="truncate font-bold text-ink">{item.discipline} {item.subdiscipline}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold uppercase text-tertiary">Unit</p>
                      <p className="truncate font-bold text-ink">{item.unit}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold uppercase text-tertiary">Labor</p>
                      <p className="truncate font-mono font-bold tabular-nums text-ink">{formatCurrency(item.laborCost)}</p>
                    </div>
                  </div>
                  <p className="mt-2 truncate text-[9px] leading-3 text-tertiary">{item.designation}</p>
                </article>
              );
            })}
          </div>
          </>
        ) : (
          <div className="flex min-h-40 items-center justify-center border border-dashed border-hairline bg-surface-muted/60 p-2 text-center">
            <div>
              <SquaresFour size={18} weight="bold" className="mx-auto mb-2 text-tertiary" aria-hidden="true" />
              <p className="text-[11px] font-bold leading-4 text-ink">No custom components found</p>
              <p className="mt-0.5 max-w-56 text-[9px] leading-4 text-tertiary">
                Adjust the tree selection or sheet search to find reusable components.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function ComponentLibraryManager() {
  const [activeTab, setActiveTab] = useState<LibraryTreeTab>("categories");
  const [selectedNodeIdByTab, setSelectedNodeIdByTab] = useState<Record<LibraryTreeTab, string>>({
    categories: "fixtures",
    suppliers: "sup-ikea",
  });
  const selectedNodeId = selectedNodeIdByTab[activeTab];
  const selectedNode = useMemo(() => findNode(libraryTrees[activeTab], selectedNodeId), [activeTab, selectedNodeId]);

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
          >
            <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-tertiary">Component Library</p>
          </div>
          <div
            className="absolute inset-y-0 left-0 right-0 flex min-w-0 items-center lg:left-[var(--component-library-tree-width)]"
            data-component-library-center-header="true"
          >
            <div className="grid h-full w-full grid-cols-[minmax(0,1fr)_120px_120px] items-center text-[9px] text-tertiary">
              <div className="min-w-0 border-l border-hairline px-2">
                <span className="font-bold uppercase tracking-[0.14em]">Workspace</span>
                <span className="ml-2 text-ink">Custom Components</span>
              </div>
              <div className="border-l border-hairline px-2">
                <span className="font-bold uppercase tracking-[0.14em]">View</span>
                <span className="ml-2 text-ink">{activeTab === "categories" ? "Categories" : "Suppliers"}</span>
              </div>
              <div className="border-l border-hairline px-2">
                <span className="font-bold uppercase tracking-[0.14em]">Taxonomy</span>
                <span className="ml-2 text-ink">{activeTab === "categories" ? componentCategoryTaxonomyVersion.replace("2026-05-22-", "") : componentItems.length}</span>
              </div>
            </div>
          </div>
        </div>

        <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label="Component library workspace">
          <ComponentLibraryTreePanel
            activeTab={activeTab}
            selectedNodeId={selectedNodeId}
            onTabChange={setActiveTab}
            onSelectNode={selectNode}
          />
          <ComponentLibrarySheet activeTab={activeTab} selectedNode={selectedNode} selectedNodeId={selectedNodeId} />
        </section>
      </div>
    </div>
  );
}
