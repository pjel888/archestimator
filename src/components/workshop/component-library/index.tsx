"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { resolveEstimateWorkspaceSelection, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { componentCategoryTree, type ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { cn } from "@/lib/ui/cn";
import { estimateLibraryItems, findEstimateNode, type EstimateRowItem, type EstimateTreeNode } from "../estimate-tree-data";
import { ResizableSidePanel } from "../ResizableSidePanel";
import { WorkshopTreeTabs } from "../workshop-tree";
import { ComponentViewControls, type ComponentViewMode } from "../component-library-manager/LibraryFolderTree";
import { NewComponentForm } from "./NewComponentForm";
import {
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  summarizeEstimateTemplate,
  type EstimateTemplate,
} from "./templates";
import type { NewComponentForm as NewComponentFormType } from "./types";
import {
  buildLibraryTreeWithComponentRows,
  filterTree,
  getAllNodeIds,
  LibraryTree,
} from "./tree";
import type { ComponentLibraryBrandOption, ComponentLibrarySupplierOption } from "./tree/buildLibraryTree";
import {
  createComponent,
  defaultForm,
  getComponentDesignation,
  getComponentDiscipline,
  getComponentImageUrl,
  getComponentName,
  getComponentPrice,
  getStalenessLabel,
  getStalenessTone,
  isFormDirty,
  LIBRARY_FAVORITES_KEY,
  LIBRARY_PREFS_KEY,
  LIBRARY_RECENTS_KEY,
  pesoFormatter,
  readJsonStorage,
  safeSetJsonStorage,
  sanitizeComponentSourceUrl,
} from "./helpers";

const LIBRARY_TREE_TABS = [
  { id: "components", label: "Components" },
  { id: "templates", label: "Templates" },
] as const;

type EstimateLibraryTab = (typeof LIBRARY_TREE_TABS)[number]["id"];
type EstimateComponentTreeTab = "categories" | "suppliers" | "brands";

function getComponentTreeTab(mode: ComponentViewMode): EstimateComponentTreeTab {
  if (mode === "brand") return "brands";
  return mode === "suppliers" ? "suppliers" : "categories";
}

/* ─── Preview Panel ─── */

function PreviewPanel({
  item,
  onClose,
  onAdd,
  onEdit,
  onDuplicate,
  onFavorite,
  onDelete,
  addDisabled,
  addLabel,
  insertQuantity,
  onInsertQuantityChange,
}: {
  item: EstimateRowItem;
  onClose: () => void;
  onAdd: (quantity?: number) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  addDisabled: boolean;
  addLabel: string;
  insertQuantity: number;
  onInsertQuantityChange: (quantity: number) => void;
}) {
  const stalenessTone = getStalenessTone(item.pricingDate);
  const stalenessLabel = getStalenessLabel(item.pricingDate);
  const sourceHref = sanitizeComponentSourceUrl(item.sourceUrl);
  const stalenessClass =
    stalenessTone === "danger"
      ? "text-danger"
      : stalenessTone === "warning"
        ? "text-warning"
        : stalenessTone === "success"
          ? "text-success"
          : "text-tertiary";

  return (
    <div className="shrink-0 border-t border-hairline bg-white">
      <div className="flex items-start gap-2 p-2">
        <span
          className="block size-14 shrink-0 overflow-hidden border border-hairline bg-surfaceMuted bg-cover bg-center"
          style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <h3 className="truncate text-[11px] font-medium text-ink">{getComponentName(item)}</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 shrink-0 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
              aria-label="Close component preview"
              onClick={onClose}
            >
              <X size={11} />
            </Button>
          </div>
          <p className="text-[9px] font-medium text-tertiary">
            {item.category} · {item.supplier || "No supplier"}
          </p>
          <p className="mt-0.5 font-sans text-[10px] font-medium tabular-nums text-ink">
            {pesoFormatter.format(getComponentPrice(item))} / {item.unit}
          </p>
          <p className={cn("mt-0.5 truncate text-[8px] font-medium leading-3", stalenessClass)}>
            {item.pricingSource || item.supplier || "Library"}
            {stalenessLabel ? ` · ${stalenessLabel}` : ""}
          </p>
        </div>
      </div>
      <div className="px-2 pb-2">
        <p className="line-clamp-3 text-[9px] leading-4 text-secondary/70">{item.description || "No description."}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge size="xs">
            {getComponentDiscipline(item)}
          </Badge>
          <Badge size="xs">
            {getComponentDesignation(item)}
          </Badge>
          {item.isCustom ? <Badge size="xs" tone="accent">Custom</Badge> : null}
          {item.tags?.map((tag) => (
            <Badge key={tag} size="xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-[44px_1fr_1fr_1fr] gap-1">
          <input
            type="number"
            min={1}
            value={insertQuantity}
            aria-label="Insert quantity"
            onChange={(event) => onInsertQuantityChange(Math.max(1, Number.parseInt(event.target.value, 10) || 1))}
            className="h-6 border border-hairline bg-white px-1 text-center text-[9px] font-medium tabular-nums text-ink outline-none focus:border-accent"
          />
          <Button onClick={() => onAdd(insertQuantity)} disabled={addDisabled} aria-label={addLabel} title={addLabel} className="h-6 min-h-6 text-[9px]">
            {addDisabled ? "Select area" : `Add ×${insertQuantity}`}
          </Button>
          <Button variant="secondary" onClick={onEdit} className="h-6 min-h-6 text-[9px]">
            Edit
          </Button>
          <Button variant="secondary" onClick={onDuplicate} className="h-6 min-h-6 text-[9px]">
            Duplicate
          </Button>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <Button variant="secondary" onClick={onFavorite} className="h-6 min-h-6 text-[9px]">
            {item.isFavorite ? "Unfavorite" : "Favorite"}
          </Button>
          <Button variant="danger" onClick={onDelete} className="h-6 min-h-6 text-[9px]">
            Delete
          </Button>
        </div>
        {item.notes || sourceHref ? (
          <p className="mt-1.5 text-[9px] leading-3 text-tertiary">
            {item.notes} {sourceHref ? <a href={sourceHref} target="_blank" rel="noreferrer" className="text-accent hover:underline">Source</a> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function templateMatchesQuery(template: EstimateTemplate, query: string) {
  if (!query.trim()) return true;
  const normalizedQuery = query.trim().toLowerCase();
  const nodeNames: string[] = [];

  function visit(node: EstimateTreeNode) {
    nodeNames.push(node.name);
    node.children?.forEach(visit);
  }

  template.nodes.forEach(visit);
  return [template.name, template.description, template.category, ...nodeNames]
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

function TemplateSidebarList({
  templates,
  searchQuery,
  canInsertTemplate,
  targetName,
  onAddTemplate,
  onTemplateDragStart,
}: {
  templates: EstimateTemplate[];
  searchQuery: string;
  canInsertTemplate: boolean;
  targetName: string;
  onAddTemplate: (template: EstimateTemplate) => void;
  onTemplateDragStart: (event: React.DragEvent<HTMLElement>, template: EstimateTemplate) => void;
}) {
  const filteredTemplates = templates.filter((template) => templateMatchesQuery(template, searchQuery));
  const categories = Array.from(new Set(filteredTemplates.map((template) => template.category))).sort();

  if (!filteredTemplates.length) {
    return (
      <div className="flex min-h-24 items-center justify-center border border-dashed border-hairline bg-surfaceMuted/30 px-3 text-center text-[10px] font-medium text-tertiary">
        No templates match this search.
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label="Estimate templates">
      {categories.map((category) => (
        <section key={category} className="space-y-1" aria-label={`${category} templates`}>
          <p className="px-1 text-[8px] font-medium uppercase tracking-normal text-tertiary">{category}</p>
          {filteredTemplates.filter((template) => template.category === category).map((template) => {
            const summary = summarizeEstimateTemplate(template);
            return (
              <div
                key={template.id}
                draggable
                onDragStart={(event) => onTemplateDragStart(event, template)}
                className="group border border-hairline bg-white p-2 text-left transition hover:bg-surfaceMuted/40"
                aria-label={`${template.name} estimate template`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-ink">{template.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-[9px] leading-3 text-tertiary">{template.description}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-6 min-h-6 shrink-0 px-2 text-[9px]"
                    disabled={!canInsertTemplate}
                    aria-label={`Add template ${template.name} to ${targetName}`}
                    onClick={() => onAddTemplate(template)}
                  >
                    Add
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-medium uppercase tracking-normal text-tertiary">
                  <span>{summary.groupCount} groups</span>
                  <span>{summary.areaCount} areas</span>
                  <span>{summary.rowCount} rows</span>
                </div>
                <p className="mt-1 font-sans text-[10px] font-medium tabular-nums text-ink">
                  {pesoFormatter.format(summary.total)}
                </p>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/* ─── Main Sidebar ─── */

type EstimateRightSidebarProps = {
  onInsertComponent?: (item: EstimateRowItem) => boolean | void;
  onInsertTemplate?: (template: EstimateTemplate) => boolean | void;
  estimateId?: string;
  selectedNodeId?: string | null;
  selectedNodeKind?: EstimateTreeNode["kind"] | null;
  selectedNodeName?: string | null;
  templateTargetName?: string | null;
  canInsertTemplate?: boolean;
  nodes?: EstimateTreeNode[];
  initialLibraryItems?: EstimateRowItem[];
  templates?: EstimateTemplate[];
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  brands?: ComponentLibraryBrandOption[];
};

function componentToForm(item: EstimateRowItem): NewComponentFormType {
  return {
    material: getComponentName(item),
    category: item.category ?? "",
    supplier: item.supplier ?? "",
    unit: item.unit ?? "pc",
    itemCost: String(getComponentPrice(item)),
    currency: item.currency ?? "PHP",
    discipline: getComponentDiscipline(item),
    designation: getComponentDesignation(item),
    description: item.description ?? "",
    tags: (item.tags ?? []).join(", "),
    imageUrl: item.imageUrl ?? "",
    miscCost: String(item.miscCost ?? 0),
    sku: item.sku ?? "",
    sourceUrl: item.sourceUrl ?? "",
    notes: item.notes ?? "",
  };
}

export function EstimateRightSidebar({
  onInsertComponent,
  onInsertTemplate,
  estimateId,
  selectedNodeId = null,
  selectedNodeKind,
  selectedNodeName,
  templateTargetName,
  canInsertTemplate: canInsertTemplateProp,
  nodes,
  initialLibraryItems = estimateLibraryItems,
  templates = [],
  categoryTree = componentCategoryTree,
  suppliers = [],
  brands = [],
}: EstimateRightSidebarProps = {}) {
  const { selectedNodeId: activeSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId);
  const [recentIds, setRecentIds] = useState<string[]>(() => readJsonStorage<string[]>(LIBRARY_RECENTS_KEY, []));
  const [libraryItems, setLibraryItems] = useState<EstimateRowItem[]>(() => {
    const favoriteIds = readJsonStorage<string[]>(LIBRARY_FAVORITES_KEY, []);
    const storedRecentIds = readJsonStorage<string[]>(LIBRARY_RECENTS_KEY, []);
    return initialLibraryItems.map((item, index) => ({
      ...item,
      createdAt: item.createdAt ?? new Date(Date.now() - (index % 18) * 86400000).toISOString(),
      discipline: getComponentDiscipline(item),
      designation: getComponentDesignation(item),
      tags: item.tags ?? [item.category, item.supplier, getComponentDiscipline(item)].filter(Boolean),
      isFavorite: item.isFavorite || favoriteIds.includes(item.id),
      lastUsedAt: storedRecentIds.includes(item.id) ? new Date().toISOString() : item.lastUsedAt,
    }));
  });

  const [activeTab, setActiveTab] = useState<EstimateLibraryTab>(() => {
    if (typeof window === "undefined") return "components";
    const storedPrefs = readJsonStorage<{ activeTab?: string }>(LIBRARY_PREFS_KEY, {});
    const legacyStoredTab = localStorage.getItem("estimate_library_active_tab");
    const stored = storedPrefs.activeTab ?? legacyStoredTab;
    return stored === "templates" && templates.length ? "templates" : "components";
  });
  const [componentViewMode, setComponentViewMode] = useState<ComponentViewMode>(() => {
    if (typeof window === "undefined") return "default";
    const storedPrefs = readJsonStorage<{ componentViewMode?: string }>(LIBRARY_PREFS_KEY, {});
    const legacyStoredTab = localStorage.getItem("estimate_library_active_tab");
    if (storedPrefs.componentViewMode === "brand" || legacyStoredTab === "brand") return "brand";
    return storedPrefs.componentViewMode === "suppliers" || legacyStoredTab === "suppliers" ? "suppliers" : "default";
  });
  const [expandedNodeIdsByViewMode, setExpandedNodeIdsByViewMode] = useState<Record<ComponentViewMode, string[]>>(() => {
    const favoriteIds = readJsonStorage<string[]>(LIBRARY_FAVORITES_KEY, []);
    const storedRecentIds = readJsonStorage<string[]>(LIBRARY_RECENTS_KEY, []);

    return {
      default: getAllNodeIds(buildLibraryTreeWithComponentRows("categories", initialLibraryItems, favoriteIds, storedRecentIds, { categoryTree, suppliers })),
      suppliers: [],
      brand: getAllNodeIds(buildLibraryTreeWithComponentRows("brands", initialLibraryItems, favoriteIds, storedRecentIds, { categoryTree, suppliers, brands })),
    };
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [showNewComponent, setShowNewComponent] = useState(false);
  const [form, setForm] = useState<NewComponentFormType>(defaultForm);
  const [formError, setFormError] = useState("");
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<EstimateRowItem | null>(null);
  const [deletedItems, setDeletedItems] = useState<EstimateRowItem[]>([]);
  const [insertQuantity, setInsertQuantity] = useState(1);
  const [lastActionMessage, setLastActionMessage] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const deleteUndoTimerRef = useRef<number | null>(null);

  const selectedTargetNode = useMemo(() => {
    if (!nodes?.length || !activeSelectedNodeId) return null;
    return resolveEstimateWorkspaceSelection({
      selectedNodeId: activeSelectedNodeId,
      fallbackNode: nodes[0],
      findNode: (nodeId) => findEstimateNode(nodes, nodeId),
    }).selectedNode;
  }, [activeSelectedNodeId, nodes]);

  const effectiveSelectedKind = selectedTargetNode?.kind ?? selectedNodeKind;
  const effectiveSelectedName = selectedTargetNode?.name ?? selectedNodeName ?? "";
  const hasTargetContext = Boolean(nodes || selectedNodeKind !== undefined || selectedNodeName !== undefined);
  const canInsert = !hasTargetContext || effectiveSelectedKind === "area";
  const canInsertTemplate = canInsertTemplateProp ?? (!hasTargetContext || effectiveSelectedKind === "group");
  const effectiveTemplateTargetName = templateTargetName ?? (effectiveSelectedKind === "group" ? effectiveSelectedName : "") ?? "";
  const targetLabel = canInsert
    ? effectiveSelectedName
      ? `Add to ${effectiveSelectedName}`
      : "Add to selected area"
    : "Select an area";

  const resetComponentForm = useCallback(() => {
    setForm(defaultForm);
    setFormError("");
    setEditItemId(null);
  }, []);

  const closeNewComponent = useCallback(() => {
    if (isFormDirty(form) && !window.confirm("Discard component changes?")) return;
    setShowNewComponent(false);
    resetComponentForm();
  }, [form, resetComponentForm]);

  useEffect(() => {
    safeSetJsonStorage(LIBRARY_PREFS_KEY, { activeTab, componentViewMode });
  }, [activeTab, componentViewMode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const activeTag = document.activeElement?.tagName;
      if (
        event.key === "/" &&
        !showNewComponent &&
        !deleteCandidate &&
        activeTag !== "INPUT" &&
        activeTag !== "TEXTAREA" &&
        activeTag !== "SELECT"
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        if (deleteCandidate) setDeleteCandidate(null);
        else if (showNewComponent) closeNewComponent();
        else if (searchQuery) setSearchQuery("");
        else if (previewItemId) setPreviewItemId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeNewComponent, deleteCandidate, previewItemId, searchQuery, showNewComponent]);

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === LIBRARY_FAVORITES_KEY) {
        const favoriteIds = readJsonStorage<string[]>(LIBRARY_FAVORITES_KEY, []);
        setLibraryItems((items) => items.map((item) => ({ ...item, isFavorite: favoriteIds.includes(item.id) })));
      }
      if (event.key === LIBRARY_RECENTS_KEY) {
        setRecentIds(readJsonStorage<string[]>(LIBRARY_RECENTS_KEY, []));
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (deleteUndoTimerRef.current) window.clearTimeout(deleteUndoTimerRef.current);
    };
  }, []);

  const favoriteIds = useMemo(() => libraryItems.filter((item) => item.isFavorite).map((item) => item.id), [libraryItems]);
  const componentTreeTab = getComponentTreeTab(componentViewMode);
  const visibleTreeTabs = useMemo(
    () => LIBRARY_TREE_TABS.filter((tab) => tab.id === "components" || templates.length > 0),
    [templates.length],
  );

  const treeNodes = useMemo(() => {
    if (activeTab === "templates") return [];
    const tree = buildLibraryTreeWithComponentRows(componentTreeTab, libraryItems, favoriteIds, recentIds, { categoryTree, suppliers, brands });
    return tree;
  }, [activeTab, brands, categoryTree, componentTreeTab, favoriteIds, libraryItems, recentIds, suppliers]);

  const filteredTreeNodes = useMemo(() => filterTree(treeNodes, searchQuery), [treeNodes, searchQuery]);

  const previewItem = libraryItems.find((item) => item.id === previewItemId) ?? null;

  const persistFavorites = useCallback((items: EstimateRowItem[]) => {
    safeSetJsonStorage(LIBRARY_FAVORITES_KEY, items.filter((item) => item.isFavorite).map((item) => item.id));
  }, []);

  const insertLibraryItems = useCallback(
    (itemsToInsert: EstimateRowItem[], sourceItems = itemsToInsert) => {
      if (!canInsert) {
        setLastActionMessage("Select an Area Node before adding library components.");
        return false;
      }
      if (!itemsToInsert.length) return false;

      const insertedItems = itemsToInsert.filter((item) => {
        const insertItem = { ...item, quantity: Math.max(1, item.quantity) };
        return onInsertComponent
          ? onInsertComponent(insertItem) !== false
          : window.dispatchEvent(new CustomEvent("archestimator:add-library-item", { detail: insertItem }));
      });

      if (!insertedItems.length) {
        setLastActionMessage(`${itemsToInsert.length === 1 ? getComponentName(itemsToInsert[0]) : "Selected components"} was not inserted. Select an Area Node and try again.`);
        return false;
      }

      const recentSourceIds = Array.from(new Set(sourceItems.map((item) => item.id)));
      setRecentIds((current) => {
        const recents = [...recentSourceIds, ...current.filter((id) => !recentSourceIds.includes(id))].slice(0, 12);
        safeSetJsonStorage(LIBRARY_RECENTS_KEY, recents);
        return recents;
      });
      setLibraryItems((items) =>
        items.map((row) => (recentSourceIds.includes(row.id) ? { ...row, lastUsedAt: new Date().toISOString() } : row)),
      );
      setLastActionMessage(
        insertedItems.length === 1
          ? `${getComponentName(insertedItems[0])} added${effectiveSelectedName ? ` to ${effectiveSelectedName}` : ""}.`
          : `${insertedItems.length} components added${effectiveSelectedName ? ` to ${effectiveSelectedName}` : ""}.`,
      );
      return true;
    },
    [canInsert, effectiveSelectedName, onInsertComponent],
  );

  const addComponent = useCallback(
    (item: EstimateRowItem, quantity = 1) => {
      return insertLibraryItems([{ ...item, quantity: Math.max(1, quantity) }], [item]);
    },
    [insertLibraryItems],
  );

  const addTemplate = useCallback(
    (template: EstimateTemplate) => {
      if (!canInsertTemplate) {
        setLastActionMessage("Select a Group Node before adding estimate templates.");
        return false;
      }

      const didInsert = onInsertTemplate
        ? onInsertTemplate(template) !== false
        : window.dispatchEvent(new CustomEvent("archestimator:add-estimate-template", { detail: template }));
      if (!didInsert) {
        setLastActionMessage(`${template.name} was not inserted. Select a Group Node and try again.`);
        return false;
      }

      setLastActionMessage(`${template.name} added${effectiveTemplateTargetName ? ` to ${effectiveTemplateTargetName}` : ""}.`);
      return true;
    },
    [canInsertTemplate, effectiveTemplateTargetName, onInsertTemplate],
  );

  const duplicateItem = useCallback((item: EstimateRowItem) => {
    const now = new Date().toISOString();
    setLibraryItems((items) => [
      { ...item, id: `custom-copy-${Date.now()}`, material: `${getComponentName(item)} copy`, name: `${getComponentName(item)} copy`, isCustom: true, createdAt: now, updatedAt: now },
      ...items,
    ]);
    setLastActionMessage(`${getComponentName(item)} duplicated.`);
  }, []);

  const toggleFavorite = useCallback(
    (item: EstimateRowItem) => {
      setLibraryItems((items) => {
        const next = items.map((row) => (row.id === item.id ? { ...row, isFavorite: !row.isFavorite } : row));
        persistFavorites(next);
        setLastActionMessage(`${getComponentName(item)} ${item.isFavorite ? "removed from" : "added to"} favorites.`);
        return next;
      });
    },
    [persistFavorites],
  );

  const startNewComponent = useCallback(() => {
    resetComponentForm();
    setShowNewComponent(true);
  }, [resetComponentForm]);

  const startEditComponent = useCallback((item: EstimateRowItem) => {
    setForm(componentToForm(item));
    setFormError("");
    setEditItemId(item.id);
    setShowNewComponent(true);
  }, []);

  const saveNewComponent = useCallback(
    (addNow = false) => {
      const result = createComponent(form);
      if (result.error || !result.component) {
        setFormError(result.error ?? "Could not save component.");
        return;
      }
      const nextComponent = editItemId
        ? {
            ...result.component,
            id: editItemId,
            isCustom: true,
            createdAt: libraryItems.find((item) => item.id === editItemId)?.createdAt ?? result.component.createdAt,
            updatedAt: new Date().toISOString(),
          }
        : result.component;
      setLibraryItems((items) => (editItemId ? items.map((item) => (item.id === editItemId ? nextComponent : item)) : [nextComponent, ...items]));
      setShowNewComponent(false);
      resetComponentForm();
      setPreviewItemId(nextComponent.id);
      setLastActionMessage(`${getComponentName(nextComponent)} ${editItemId ? "updated" : "created"}.`);
      if (addNow) addComponent(nextComponent);
    },
    [addComponent, editItemId, form, libraryItems, resetComponentForm],
  );

  const deleteLibraryItem = useCallback((item: EstimateRowItem) => {
    setLibraryItems((items) => items.filter((entry) => entry.id !== item.id));
    setDeleteCandidate(null);
    setDeletedItems([item]);
    setLastActionMessage(`${getComponentName(item)} deleted. Undo is available.`);
    if (deleteUndoTimerRef.current) window.clearTimeout(deleteUndoTimerRef.current);
    deleteUndoTimerRef.current = window.setTimeout(() => setDeletedItems([]), 5000);
  }, []);

  const undoDelete = useCallback(() => {
    if (!deletedItems.length) return;
    setLibraryItems((items) => [...deletedItems, ...items]);
    setLastActionMessage(deletedItems.length === 1 ? `${getComponentName(deletedItems[0])} restored.` : `${deletedItems.length} components restored.`);
    setDeletedItems([]);
    if (deleteUndoTimerRef.current) window.clearTimeout(deleteUndoTimerRef.current);
  }, [deletedItems]);

  const handleTabChange = useCallback((tab: EstimateLibraryTab) => {
    setActiveTab(tab);
    setSearchQuery("");
    setPreviewItemId(null);
  }, []);

  const handleComponentViewModeChange = useCallback((mode: ComponentViewMode) => {
    setComponentViewMode(mode);
    setActiveTab("components");
    setSearchQuery("");
    setPreviewItemId(null);
  }, []);

  const handleToggleNode = useCallback((nodeId: string) => {
    setExpandedNodeIdsByViewMode((current) => {
      const ids = current[componentViewMode];
      const next = ids.includes(nodeId) ? ids.filter((id) => id !== nodeId) : [...ids, nodeId];
      return { ...current, [componentViewMode]: next };
    });
  }, [componentViewMode]);

  const handleExpandAll = useCallback(() => {
    setExpandedNodeIdsByViewMode((current) => ({
      ...current,
      [componentViewMode]: getAllNodeIds(treeNodes),
    }));
  }, [componentViewMode, treeNodes]);

  const handleCollapseAll = useCallback(() => {
    setExpandedNodeIdsByViewMode((current) => ({
      ...current,
      [componentViewMode]: [],
    }));
  }, [componentViewMode]);

  const handleItemDragStart = useCallback((event: React.DragEvent<HTMLElement>, item: EstimateRowItem | undefined) => {
    if (!item) return;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-archestimator-library-item", JSON.stringify(item));
    event.dataTransfer.setData("text/plain", getComponentName(item));

    const dragGhost = document.createElement("div");
    dragGhost.className = "fixed -top-96 left-0 flex items-center gap-2 border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-ink shadow-lg";
    dragGhost.textContent = `${getComponentName(item)} · ${pesoFormatter.format(getComponentPrice(item))}`;
    document.body.appendChild(dragGhost);
    event.dataTransfer.setDragImage(dragGhost, 12, 12);
    window.setTimeout(() => dragGhost.remove(), 0);
  }, []);

  const handleTemplateDragStart = useCallback((event: React.DragEvent<HTMLElement>, template: EstimateTemplate) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, JSON.stringify({ templateId: template.id }));
    event.dataTransfer.setData("text/plain", template.name);

    const dragGhost = document.createElement("div");
    dragGhost.className = "fixed -top-96 left-0 border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-ink shadow-lg";
    dragGhost.textContent = `${template.name} · estimate template`;
    document.body.appendChild(dragGhost);
    event.dataTransfer.setDragImage(dragGhost, 12, 12);
    window.setTimeout(() => dragGhost.remove(), 0);
  }, []);

  return (
    <ResizableSidePanel side="right" ariaLabel="Library" storageKey="estimate_component_library_width_v2" defaultWidth={380} minWidth={360} maxWidth={560}>
      <aside className="flex h-full min-h-0 min-w-[320px] flex-col border-l border-hairline bg-white !text-[10px]">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 shrink-0 border-b border-hairline bg-white">
          <div className="flex h-[38px] items-center">
            <SearchInput
              ref={searchRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Library Tree"
              aria-label="Search Library Tree"
              onClear={() => setSearchQuery("")}
              wrapperClassName="w-full"
            />
          </div>

          <HeaderIconToolbar
            ariaLabel="Library tree tools"
            labelPrefix="library tree"
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            onAdd={startNewComponent}
          />

          <WorkshopTreeTabs
            tabs={visibleTreeTabs}
            activeTab={activeTab}
            ariaLabel="Library tree views"
            onTabChange={handleTabChange}
          />
          {activeTab === "components" ? (
            <ComponentViewControls
              mode={componentViewMode}
              ariaLabel="Component view mode"
              onModeChange={handleComponentViewModeChange}
            />
          ) : null}
        </div>

        {/* Scrollable tree */}
        <div className="min-h-0 flex-1 overflow-auto p-2">
          <div className="h-6" />
          {activeTab === "templates" ? (
            <TemplateSidebarList
              templates={templates}
              searchQuery={searchQuery}
              canInsertTemplate={canInsertTemplate}
              targetName={effectiveTemplateTargetName || "selected group"}
              onAddTemplate={addTemplate}
              onTemplateDragStart={handleTemplateDragStart}
            />
          ) : (
            <LibraryTree
              nodes={filteredTreeNodes}
              selectedNodeId={previewItemId}
              expandedNodeIds={expandedNodeIdsByViewMode[componentViewMode]}
              searchQuery={searchQuery}
              onSelect={(nodeId) => handleToggleNode(nodeId)}
              onToggle={handleToggleNode}
              onItemAdd={(item) => { if (item) addComponent(item); }}
              onItemPreview={(itemId) => setPreviewItemId(itemId)}
              addDisabled={!canInsert}
              addLabel={targetLabel}
              onItemDragStart={handleItemDragStart}
            />
          )}
        </div>

        {/* Preview panel */}
        {previewItem ? (
          <PreviewPanel
            item={previewItem}
            onClose={() => setPreviewItemId(null)}
            onAdd={(quantity) => addComponent(previewItem, quantity ?? insertQuantity)}
            onEdit={() => startEditComponent(previewItem)}
            onDuplicate={() => duplicateItem(previewItem)}
            onFavorite={() => toggleFavorite(previewItem)}
            onDelete={() => setDeleteCandidate(previewItem)}
            addDisabled={!canInsert}
            addLabel={targetLabel}
            insertQuantity={insertQuantity}
            onInsertQuantityChange={setInsertQuantity}
          />
        ) : null}

        {/* New component form */}
        <Modal
          open={showNewComponent}
          title={editItemId ? "Edit component" : "New component"}
          description={editItemId ? "Update this reusable cost component in the local library." : "Add a reusable cost component to the local library."}
          closeLabel="Cancel new component"
          className="max-w-3xl"
          onOpenChange={(open) => {
            if (open) setShowNewComponent(true);
            else closeNewComponent();
          }}
        >
          <NewComponentForm
            form={form}
            formError={formError}
            onChange={setForm}
            onSave={() => saveNewComponent(false)}
            onSaveAndAdd={() => saveNewComponent(true)}
            onCancel={closeNewComponent}
          />
        </Modal>

        {deletedItems.length ? (
          <div className="absolute right-2 bottom-2 z-30 max-w-72 border border-hairline bg-white p-2 shadow-xl">
            <p className="text-[9px] font-medium text-ink">
              {deletedItems.length === 1 ? `${getComponentName(deletedItems[0])} deleted.` : `${deletedItems.length} components deleted.`}
            </p>
            <Button type="button" variant="secondary" size="sm" className="mt-1 h-6 min-h-6 text-[9px]" onClick={undoDelete}>
              Undo
            </Button>
          </div>
        ) : null}

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {lastActionMessage}
        </div>

        {/* Delete confirmation */}
        {deleteCandidate ? (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/25 p-4">
            <div role="alertdialog" aria-modal="true" className="w-full max-w-72 border border-hairline bg-white p-3 shadow-xl">
              <h3 className="text-[11px] font-medium text-ink">Delete component?</h3>
              <p className="mt-1 text-[9px] leading-4 text-tertiary">
                Remove {getComponentName(deleteCandidate)} from this local library view. Existing estimate rows stay unchanged.
              </p>
              <div className="mt-3 flex justify-end gap-1">
                <Button variant="secondary" size="sm" className="h-6 min-h-6 text-[9px]" onClick={() => setDeleteCandidate(null)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" className="h-6 min-h-6 text-[9px]" onClick={() => deleteLibraryItem(deleteCandidate)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </ResizableSidePanel>
  );
}
