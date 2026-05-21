"use client";

import {
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CaretDown,
  Check,
  DownloadSimple,
  ListBullets,
  SquaresFour,
  TextAlignLeft,
  UploadSimple,
  X,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ControlSelect } from "@/components/ui/control-select";
import { EmptyState } from "@/components/ui/empty-state";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { resolveEstimateWorkspaceSelection, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { cn } from "@/lib/ui/cn";
import { estimateLibraryItems, findEstimateNode, type EstimateRowItem, type EstimateTreeNode } from "../estimate-tree-data";
import { ResizableSidePanel } from "../ResizableSidePanel";
import { LibraryItemCard } from "./ComponentCard";
import { NewComponentForm } from "./NewComponentForm";
import type {
  ComponentFilters,
  LibraryBundle,
  LibraryFacets,
  LibraryGroupBy,
  LibraryPanelTab,
  LibrarySortMode,
  LibraryViewMode,
  NewComponentForm as NewComponentFormType,
} from "./types";
import {
  createDefaultLibraryBundles,
  createComponent,
  defaultFilters,
  defaultForm,
  exportLibraryItemsToCsv,
  expandLibraryBundle,
  exportLibraryItemsToJson,
  filterComponents,
  getComponentDesignation,
  getComponentDiscipline,
  getComponentImageUrl,
  getLibraryBundleTotal,
  getComponentName,
  getComponentPrice,
  getStalenessLabel,
  getStalenessTone,
  groupComponents,
  isFormDirty,
  LIBRARY_FAVORITES_KEY,
  LIBRARY_PREFS_KEY,
  LIBRARY_RECENTS_KEY,
  pesoFormatter,
  readJsonStorage,
  readLibraryPreferences,
  parseLibraryImportText,
  safeSetJsonStorage,
  searchComponents,
  sortComponents,
  unique,
} from "./helpers";

const groupOptions: Array<{ value: LibraryGroupBy; label: string }> = [
  { value: "category", label: "Category" },
  { value: "supplier", label: "Supplier" },
  { value: "discipline", label: "Discipline" },
  { value: "room", label: "Designation" },
  { value: "recent", label: "Recent" },
  { value: "none", label: "None" },
];

const sortOptions: Array<{ value: LibrarySortMode; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "name", label: "Name" },
  { value: "priceAsc", label: "Price ↑" },
  { value: "priceDesc", label: "Price ↓" },
  { value: "supplier", label: "Supplier" },
  { value: "recentUsed", label: "Used" },
  { value: "recentAdded", label: "Added" },
];

const viewOptions: Array<{ value: LibraryViewMode; label: string; icon: ReactNode }> = [
  { value: "compact", label: "Compact", icon: <ListBullets size={10} weight="bold" aria-hidden="true" /> },
  { value: "detailed", label: "Detail", icon: <TextAlignLeft size={10} weight="bold" aria-hidden="true" /> },
  { value: "grid", label: "Grid", icon: <SquaresFour size={10} weight="bold" aria-hidden="true" /> },
];

const panelTabs: Array<{ value: LibraryPanelTab; label: string }> = [
  { value: "components", label: "Components" },
  { value: "assemblies", label: "Assemblies" },
  { value: "templates", label: "Templates" },
];

/* ─── Filter Panel ─── */

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-tertiary">{label}</p>
      {children}
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Chip active={active} onClick={onClick}>
      {active ? <Check size={9} weight="bold" /> : null}
      {label}
    </Chip>
  );
}

function FacetToggleGroup({
  values,
  selected,
  onToggle,
}: {
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <ToggleChip key={value} label={value} active={selected.includes(value)} onClick={() => onToggle(value)} />
      ))}
    </div>
  );
}

function FilterPanel({
  facets,
  filters,
  onChange,
}: {
  facets: LibraryFacets;
  filters: ComponentFilters;
  onChange: Dispatch<SetStateAction<ComponentFilters>>;
}) {
  const toggleArray = useCallback(
    (key: "categories" | "suppliers" | "disciplines" | "designations" | "units", value: string) => {
      onChange((current) => ({
        ...current,
        [key]: current[key].includes(value) ? current[key].filter((v) => v !== value) : [...current[key], value],
      }));
    },
    [onChange],
  );

  const set = useCallback(
    (partial: Partial<ComponentFilters>) => {
      onChange((current) => ({ ...current, ...partial }));
    },
    [onChange],
  );

  return (
    <div className="border-t border-hairline bg-surfaceMuted/60 px-2 py-2">
      <div className="space-y-2.5">
        <FilterSection label="Category">
          <FacetToggleGroup values={facets.categories} selected={filters.categories} onToggle={(v) => toggleArray("categories", v)} />
        </FilterSection>
        <FilterSection label="Supplier">
          <FacetToggleGroup values={facets.suppliers} selected={filters.suppliers} onToggle={(v) => toggleArray("suppliers", v)} />
        </FilterSection>
        <FilterSection label="Discipline">
          <FacetToggleGroup values={facets.disciplines} selected={filters.disciplines} onToggle={(v) => toggleArray("disciplines", v)} />
        </FilterSection>
        <FilterSection label="Designation">
          <FacetToggleGroup values={facets.designations} selected={filters.designations} onToggle={(v) => toggleArray("designations", v)} />
        </FilterSection>
        <FilterSection label="Unit">
          <FacetToggleGroup values={facets.units} selected={filters.units} onToggle={(v) => toggleArray("units", v)} />
        </FilterSection>
        <FilterSection label="Price range">
          <div className="flex gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => set({ minPrice: e.target.value })}
              className="h-6 w-full border border-hairline bg-white px-2 text-[9px] font-bold text-ink outline-none focus:border-accent"
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => set({ maxPrice: e.target.value })}
              className="h-6 w-full border border-hairline bg-white px-2 text-[9px] font-bold text-ink outline-none focus:border-accent"
            />
          </div>
        </FilterSection>
        <FilterSection label="Show only">
          <div className="flex flex-wrap gap-1">
            <ToggleChip label="Favorites" active={filters.favoritesOnly} onClick={() => set({ favoritesOnly: !filters.favoritesOnly })} />
            <ToggleChip label="Recent" active={filters.recentOnly} onClick={() => set({ recentOnly: !filters.recentOnly })} />
            <ToggleChip label="Custom" active={filters.customOnly} onClick={() => set({ customOnly: !filters.customOnly })} />
          </div>
        </FilterSection>
        <FilterSection label="Image">
          <div className="flex flex-wrap gap-1">
            <ToggleChip label="All" active={filters.imageState === "all"} onClick={() => set({ imageState: "all" })} />
            <ToggleChip label="Has image" active={filters.imageState === "has"} onClick={() => set({ imageState: "has" })} />
            <ToggleChip label="No image" active={filters.imageState === "none"} onClick={() => set({ imageState: "none" })} />
          </div>
        </FilterSection>
        <FilterSection label="Supplier">
          <div className="flex flex-wrap gap-1">
            <ToggleChip label="All" active={filters.supplierState === "all"} onClick={() => set({ supplierState: "all" })} />
            <ToggleChip label="Has supplier" active={filters.supplierState === "has"} onClick={() => set({ supplierState: "has" })} />
            <ToggleChip label="No supplier" active={filters.supplierState === "none"} onClick={() => set({ supplierState: "none" })} />
          </div>
        </FilterSection>
      </div>
    </div>
  );
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
            <h3 className="truncate text-[11px] font-bold text-ink">{getComponentName(item)}</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 shrink-0 rounded-sm p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
              aria-label="Close component preview"
              onClick={onClose}
            >
              <X size={11} />
            </Button>
          </div>
          <p className="text-[9px] font-semibold text-tertiary">
            {item.category} · {item.supplier || "No supplier"}
          </p>
          <p className="mt-0.5 font-mono text-[10px] font-bold tabular-nums text-ink">
            {pesoFormatter.format(getComponentPrice(item))} / {item.unit}
          </p>
          <p className={cn("mt-0.5 truncate text-[8px] font-bold leading-3", stalenessClass)}>
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
            className="h-6 border border-hairline bg-white px-1 text-center text-[9px] font-bold tabular-nums text-ink outline-none focus:border-accent"
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
        {item.notes || item.sourceUrl ? (
          <p className="mt-1.5 text-[9px] leading-3 text-tertiary">
            {item.notes} {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">Source</a> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BundleCard({
  bundle,
  libraryItems,
  addDisabled,
  onAdd,
  onDelete,
}: {
  bundle: LibraryBundle;
  libraryItems: EstimateRowItem[];
  addDisabled: boolean;
  onAdd: () => void;
  onDelete?: () => void;
}) {
  const expandedItems = expandLibraryBundle(bundle, libraryItems);
  const total = getLibraryBundleTotal(bundle, libraryItems);
  return (
    <div className="border border-hairline bg-white p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold text-ink">{bundle.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[9px] leading-3 text-tertiary">{bundle.description}</p>
        </div>
        <Badge size="xs" tone={bundle.kind === "template" ? "accent" : "neutral"}>
          {bundle.kind}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {expandedItems.slice(0, 4).map((item) => (
          <Badge key={item.id} size="xs">
            {getComponentName(item)} ×{item.quantity}
          </Badge>
        ))}
        {expandedItems.length > 4 ? <Badge size="xs">+{expandedItems.length - 4}</Badge> : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] font-bold tabular-nums text-ink">{pesoFormatter.format(total)}</span>
        <div className="flex items-center gap-1">
          {onDelete ? (
            <Button type="button" variant="danger" size="sm" className="h-6 min-h-6 px-2 text-[9px]" onClick={onDelete}>
              Delete
            </Button>
          ) : null}
          <Button type="button" size="sm" className="h-6 min-h-6 px-2 text-[9px]" disabled={addDisabled || expandedItems.length === 0} onClick={onAdd}>
            Add {expandedItems.length}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Sidebar ─── */

type EstimateRightSidebarProps = {
  onInsertComponent?: (item: EstimateRowItem) => boolean | void;
  estimateId?: string;
  selectedNodeId?: string | null;
  selectedNodeKind?: EstimateTreeNode["kind"] | null;
  selectedNodeName?: string | null;
  nodes?: EstimateTreeNode[];
  initialLibraryItems?: EstimateRowItem[];
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
    laborCost: String(item.laborCost ?? 0),
    supplementaryCosts: String(item.supplementaryCosts ?? 0),
    sku: item.sku ?? "",
    sourceUrl: item.sourceUrl ?? "",
    notes: item.notes ?? "",
  };
}

export function EstimateRightSidebar({
  onInsertComponent,
  estimateId,
  selectedNodeId = null,
  selectedNodeKind,
  selectedNodeName,
  nodes,
  initialLibraryItems = estimateLibraryItems,
}: EstimateRightSidebarProps = {}) {
  const prefs = useMemo(() => readLibraryPreferences(), []);
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

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ComponentFilters>(defaultFilters);
  const [activeTab, setActiveTab] = useState<LibraryPanelTab>("components");
  const [groupBy, setGroupBy] = useState<LibraryGroupBy>(prefs.groupBy ?? "category");
  const [viewMode, setViewMode] = useState<LibraryViewMode>(prefs.viewMode ?? "compact");
  const [sortMode, setSortMode] = useState<LibrarySortMode>(prefs.sortMode ?? "relevance");
  const [libraryBundles, setLibraryBundles] = useState<LibraryBundle[]>(() => createDefaultLibraryBundles(initialLibraryItems));
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [showNewComponent, setShowNewComponent] = useState(false);
  const [form, setForm] = useState<NewComponentFormType>(defaultForm);
  const [formError, setFormError] = useState("");
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<EstimateRowItem | null>(null);
  const [deletedItems, setDeletedItems] = useState<EstimateRowItem[]>([]);
  const [insertQuantity, setInsertQuantity] = useState(1);
  const [lastActionMessage, setLastActionMessage] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
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
  const targetLabel = canInsert
    ? effectiveSelectedName
      ? `Add to ${effectiveSelectedName}`
      : "Add to selected area"
    : "Select an area";
  const targetStatus = canInsert
    ? effectiveSelectedName
      ? `Inserting into ${effectiveSelectedName}`
      : "Ready to insert"
    : effectiveSelectedName
      ? `${effectiveSelectedName} cannot receive estimate rows`
      : "Select an Area Node before inserting";

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
    safeSetJsonStorage(LIBRARY_PREFS_KEY, { viewMode, groupBy, sortMode });
  }, [viewMode, groupBy, sortMode]);

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
        else if (showFilters) setShowFilters(false);
        else if (searchQuery) setSearchQuery("");
        else if (previewItemId) setPreviewItemId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeNewComponent, deleteCandidate, previewItemId, searchQuery, showFilters, showNewComponent]);

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

  const facets = useMemo(
    () => ({
      categories: unique(libraryItems.map((i) => i.category)),
      suppliers: unique(libraryItems.map((i) => i.supplier)),
      disciplines: unique(libraryItems.map(getComponentDiscipline)),
      designations: unique(libraryItems.map(getComponentDesignation)),
      units: unique(libraryItems.map((i) => i.unit)),
    }),
    [libraryItems],
  );

  const filteredSortedItems = useMemo(
    () => sortComponents(searchComponents(filterComponents(libraryItems, filters, favoriteIds, recentIds), searchQuery), sortMode, recentIds),
    [libraryItems, filters, favoriteIds, recentIds, searchQuery, sortMode],
  );

  const groupEntries = useMemo(() => groupComponents(filteredSortedItems, groupBy, recentIds), [filteredSortedItems, groupBy, recentIds]);

  const previewItem = libraryItems.find((item) => item.id === previewItemId) ?? null;
  const selectedItems = useMemo(
    () => libraryItems.filter((item) => selectedItemIds.has(item.id)),
    [libraryItems, selectedItemIds],
  );
  const visibleItemIds = useMemo(
    () => groupEntries.flatMap(([group, items]) => (collapsedGroups.has(group) ? [] : items.map((item) => item.id))),
    [collapsedGroups, groupEntries],
  );
  const visibleFocusedItemId = focusedItemId && visibleItemIds.includes(focusedItemId) ? focusedItemId : (visibleItemIds[0] ?? null);
  const visibleBundles = useMemo(() => {
    const kind = activeTab === "assemblies" ? "assembly" : "template";
    const query = searchQuery.trim().toLowerCase();
    return libraryBundles.filter((bundle) => {
      if (bundle.kind !== kind) return false;
      if (!query) return true;
      return `${bundle.name} ${bundle.description} ${(bundle.tags ?? []).join(" ")}`.toLowerCase().includes(query);
    });
  }, [activeTab, libraryBundles, searchQuery]);

  const activeFilterCount =
    filters.categories.length +
    filters.suppliers.length +
    filters.disciplines.length +
    filters.designations.length +
    filters.units.length +
    Number(Boolean(filters.minPrice || filters.maxPrice)) +
    Number(filters.favoritesOnly) +
    Number(filters.recentOnly) +
    Number(filters.customOnly) +
    Number(filters.imageState !== "all") +
    Number(filters.supplierState !== "all");

  const recentItems = useMemo(() => {
    if (searchQuery || activeFilterCount > 0) return [];
    return recentIds
      .map((id) => libraryItems.find((item) => item.id === id))
      .filter((item): item is EstimateRowItem => Boolean(item))
      .slice(0, 8);
  }, [activeFilterCount, libraryItems, recentIds, searchQuery]);

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

  const removeFacet = useCallback((key: keyof ComponentFilters, value?: string) => {
    setFilters((current) =>
      Array.isArray(current[key])
        ? { ...current, [key]: (current[key] as string[]).filter((entry) => entry !== value) }
        : { ...current, [key]: key === "imageState" || key === "supplierState" ? "all" : false },
    );
  }, []);

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

  const toggleSelectedItem = useCallback((itemId: string) => {
    setSelectedItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const selectVisibleItems = useCallback(() => {
    setSelectedItemIds(new Set(visibleItemIds));
  }, [visibleItemIds]);

  const clearSelectedItems = useCallback(() => setSelectedItemIds(new Set()), []);

  const addSelectedItems = useCallback(() => {
    if (insertLibraryItems(selectedItems)) clearSelectedItems();
  }, [clearSelectedItems, insertLibraryItems, selectedItems]);

  const favoriteSelectedItems = useCallback(() => {
    if (!selectedItems.length) return;
    const selectedIds = new Set(selectedItems.map((item) => item.id));
    setLibraryItems((items) => {
      const next = items.map((item) => (selectedIds.has(item.id) ? { ...item, isFavorite: true } : item));
      persistFavorites(next);
      return next;
    });
    setLastActionMessage(`${selectedItems.length} components added to favorites.`);
  }, [persistFavorites, selectedItems]);

  const duplicateSelectedItems = useCallback(() => {
    if (!selectedItems.length) return;
    const now = new Date().toISOString();
    setLibraryItems((items) => [
      ...selectedItems.map((item, index) => ({
        ...item,
        id: `custom-bulk-copy-${Date.now()}-${index}`,
        material: `${getComponentName(item)} copy`,
        name: `${getComponentName(item)} copy`,
        isCustom: true,
        createdAt: now,
        updatedAt: now,
      })),
      ...items,
    ]);
    setLastActionMessage(`${selectedItems.length} components duplicated.`);
  }, [selectedItems]);

  const deleteSelectedItems = useCallback(() => {
    if (!selectedItems.length) return;
    setLibraryItems((items) => items.filter((item) => !selectedItemIds.has(item.id)));
    setDeletedItems(selectedItems);
    setSelectedItemIds(new Set());
    setLastActionMessage(`${selectedItems.length} selected components deleted.`);
    if (deleteUndoTimerRef.current) window.clearTimeout(deleteUndoTimerRef.current);
    deleteUndoTimerRef.current = window.setTimeout(() => setDeletedItems([]), 5000);
  }, [selectedItemIds, selectedItems]);

  const createBundleFromSelection = useCallback((kind: LibraryBundle["kind"]) => {
    if (!selectedItems.length) return;
    const now = new Date().toISOString();
    const name = `${selectedItems.length} item ${kind}`;
    setLibraryBundles((bundles) => [
      {
        id: `custom-${kind}-${Date.now()}`,
        kind,
        name,
        description: `Local ${kind} created from the current library selection.`,
        items: selectedItems.map((item) => ({ itemId: item.id, quantity: 1 })),
        tags: Array.from(new Set(selectedItems.map((item) => item.category).filter(Boolean))).slice(0, 3),
        isCustom: true,
        createdAt: now,
        updatedAt: now,
      },
      ...bundles,
    ]);
    setActiveTab(kind === "assembly" ? "assemblies" : "templates");
    setLastActionMessage(`${name} created.`);
  }, [selectedItems]);

  const addBundle = useCallback(
    (bundle: LibraryBundle) => {
      const expanded = expandLibraryBundle(bundle, libraryItems);
      const inserted = insertLibraryItems(expanded, expanded);
      if (inserted) setLastActionMessage(`${bundle.name} inserted with ${expanded.length} components.`);
    },
    [insertLibraryItems, libraryItems],
  );

  const deleteBundle = useCallback((bundleId: string) => {
    setLibraryBundles((bundles) => bundles.filter((bundle) => bundle.id !== bundleId));
    setLastActionMessage("Custom bundle deleted.");
  }, []);

  const exportItems = useCallback((items: EstimateRowItem[], filePrefix: string, format: "csv" | "json" = "json", bundles = libraryBundles) => {
    const content = format === "csv" ? exportLibraryItemsToCsv(items) : exportLibraryItemsToJson(items, bundles);
    if (typeof window === "undefined" || typeof URL.createObjectURL !== "function") {
      setLastActionMessage(`${filePrefix} ${format.toUpperCase()} export is ready, but this browser cannot download it.`);
      return;
    }
    const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filePrefix}-${new Date().toISOString().slice(0, 10)}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    setLastActionMessage(`${items.length} components exported as ${format.toUpperCase()}.`);
  }, [libraryBundles]);

  const handleImportFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const result = parseLibraryImportText(text, file.name);
    if (result.items.length) {
      setLibraryItems((items) => [...result.items, ...items]);
      if (result.bundles.length) setLibraryBundles((bundles) => [...result.bundles, ...bundles]);
      setLastActionMessage(
        `${result.items.length} components imported${result.bundles.length ? ` with ${result.bundles.length} bundles` : ""}${result.errors.length ? ` and ${result.errors.length} skipped rows` : ""}.`,
      );
    } else {
      setLastActionMessage(result.errors[0] ?? "No components imported.");
    }
    if (importInputRef.current) importInputRef.current.value = "";
  }, []);

  const handleCardListKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const activeButton = target?.closest<HTMLButtonElement>("[data-library-card-button='true']");
    if (!activeButton) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-library-card-button='true']"));
    const currentIndex = buttons.indexOf(activeButton);
    if (currentIndex < 0) return;

    const columnStep = viewMode === "grid" ? 2 : 1;
    const nextIndexByKey: Record<string, number> = {
      ArrowDown: Math.min(buttons.length - 1, currentIndex + columnStep),
      ArrowUp: Math.max(0, currentIndex - columnStep),
      ArrowRight: Math.min(buttons.length - 1, currentIndex + 1),
      ArrowLeft: Math.max(0, currentIndex - 1),
      Home: 0,
      End: buttons.length - 1,
    };
    const nextIndex = nextIndexByKey[event.key];
    if (nextIndex === undefined || nextIndex === currentIndex) return;
    event.preventDefault();
    const nextButton = buttons[nextIndex];
    setFocusedItemId(nextButton.dataset.libraryItemId ?? null);
    nextButton.focus();
  }, [viewMode]);

  const chipData = [
    ...filters.categories.map((value) => ["categories", value] as const),
    ...filters.suppliers.map((value) => ["suppliers", value] as const),
    ...filters.disciplines.map((value) => ["disciplines", value] as const),
    ...filters.designations.map((value) => ["designations", value] as const),
    ...filters.units.map((value) => ["units", value] as const),
  ];

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
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
              placeholder="Search Library"
              aria-label="Search Library"
              onClear={() => setSearchQuery("")}
              wrapperClassName="w-full"
            />
          </div>

          <HeaderIconToolbar
            ariaLabel="Library tools"
            labelPrefix="library"
            onFilter={() => setShowFilters((value) => !value)}
            onGroup={() => {
              const currentIndex = groupOptions.findIndex((option) => option.value === groupBy);
              setGroupBy(groupOptions[(currentIndex + 1) % groupOptions.length].value);
            }}
            onAdd={startNewComponent}
          />

          <div className="flex items-center gap-1 border-t border-hairline px-2 py-1">
            <div className="flex min-w-0 flex-1 items-center gap-1" role="tablist" aria-label="Library panel">
              {panelTabs.map((tab) => (
                <Button
                  key={tab.value}
                  type="button"
                  variant={activeTab === tab.value ? "secondary" : "ghost"}
                  size="sm"
                  className="h-5 min-h-5 px-1.5 text-[9px]"
                  role="tab"
                  aria-selected={activeTab === tab.value}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.json,application/json,text/csv"
              className="sr-only"
              aria-label="Import library file"
              onChange={(event) => void handleImportFile(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 p-0"
              aria-label="Import components"
              title="Import components"
              onClick={() => importInputRef.current?.click()}
            >
              <UploadSimple size={11} weight="bold" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 p-0"
              aria-label="Export components"
              title="Export components as JSON"
              onClick={() => exportItems(libraryItems, "component-library")}
            >
              <DownloadSimple size={11} weight="bold" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 min-h-5 px-1.5 text-[9px]"
              aria-label="Export components as CSV"
              title="Export components as CSV"
              onClick={() => exportItems(libraryItems, "component-library", "csv", [])}
            >
              CSV
            </Button>
          </div>

          <div className="flex items-center gap-1 border-t border-hairline px-2 py-1">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              {viewOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={viewMode === option.value ? "secondary" : "ghost"}
                  size="sm"
                  className="h-5 min-h-5 gap-1 px-1.5 text-[9px]"
                  aria-pressed={viewMode === option.value}
                  onClick={() => setViewMode(option.value)}
                >
                  {option.icon}
                  {option.label}
                </Button>
              ))}
            </div>
            <ControlSelect aria-label="Group library by" value={groupBy} onChange={(event) => setGroupBy(event.target.value as LibraryGroupBy)} wrapperClassName="w-[88px]">
              {groupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </ControlSelect>
            <ControlSelect aria-label="Sort library" value={sortMode} onChange={(event) => setSortMode(event.target.value as LibrarySortMode)} wrapperClassName="w-[78px]">
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </ControlSelect>
          </div>

          <div
            className={cn(
              "border-t border-hairline px-2 py-1 text-[9px] font-bold leading-3",
              canInsert ? "bg-successSoft/40 text-success" : "bg-warningSoft/60 text-warning",
            )}
          >
            {targetStatus}
          </div>

          {/* Filter panel */}
          {showFilters ? <FilterPanel facets={facets} filters={filters} onChange={setFilters} /> : null}

          {/* Active filter chips */}
          {(activeFilterCount > 0 || searchQuery) ? (
            <div className="flex flex-wrap gap-1 border-t border-hairline px-2 py-1.5">
              {searchQuery ? (
                <Chip removable onClick={() => setSearchQuery("")}>
                  Search: {searchQuery}
                </Chip>
              ) : null}
              {chipData.map(([key, value]) => (
                <Chip key={`${key}-${value}`} removable onClick={() => removeFacet(key, value)}>
                  {value}
                </Chip>
              ))}
              {filters.favoritesOnly ? (
                <Chip removable onClick={() => setFilters((f) => ({ ...f, favoritesOnly: false }))}>
                  Favorites
                </Chip>
              ) : null}
              {filters.recentOnly ? (
                <Chip removable onClick={() => setFilters((f) => ({ ...f, recentOnly: false }))}>
                  Recent
                </Chip>
              ) : null}
              {filters.customOnly ? (
                <Chip removable onClick={() => setFilters((f) => ({ ...f, customOnly: false }))}>
                  Custom
                </Chip>
              ) : null}
              {filters.imageState !== "all" ? (
                <Chip removable onClick={() => setFilters((f) => ({ ...f, imageState: "all" }))}>
                  Image: {filters.imageState}
                </Chip>
              ) : null}
              {filters.supplierState !== "all" ? (
                <Chip removable onClick={() => setFilters((f) => ({ ...f, supplierState: "all" }))}>
                  Supplier: {filters.supplierState}
                </Chip>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 min-h-5 px-1.5 text-danger hover:underline"
                onClick={() => {
                  setFilters(defaultFilters);
                  setSearchQuery("");
                }}
              >
                Clear all
              </Button>
            </div>
          ) : null}

          {activeTab === "components" ? (
            <div className="flex flex-wrap items-center gap-1 border-t border-hairline px-2 py-1">
              <span className="text-[9px] font-bold text-tertiary">{selectedItems.length} selected</span>
              <Button type="button" variant="ghost" size="sm" className="h-5 min-h-5 px-1.5 text-[9px]" onClick={selectVisibleItems} disabled={!visibleItemIds.length}>
                Select all
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-5 min-h-5 px-1.5 text-[9px]" onClick={clearSelectedItems} disabled={!selectedItems.length}>
                Clear
              </Button>
              <Button type="button" size="sm" className="h-5 min-h-5 px-1.5 text-[9px]" onClick={addSelectedItems} disabled={!selectedItems.length || !canInsert}>
                Add
              </Button>
              <Button type="button" variant="secondary" size="sm" className="h-5 min-h-5 px-1.5 text-[9px]" onClick={favoriteSelectedItems} disabled={!selectedItems.length}>
                Favorite
              </Button>
              <Button type="button" variant="secondary" size="sm" className="h-5 min-h-5 px-1.5 text-[9px]" onClick={() => createBundleFromSelection("assembly")} disabled={!selectedItems.length}>
                Save assembly
              </Button>
              <Button type="button" variant="secondary" size="sm" className="h-5 min-h-5 px-1.5 text-[9px]" onClick={() => createBundleFromSelection("template")} disabled={!selectedItems.length}>
                Save template
              </Button>
              <Button type="button" variant="secondary" size="sm" className="h-5 min-h-5 px-1.5 text-[9px]" onClick={duplicateSelectedItems} disabled={!selectedItems.length}>
                Duplicate
              </Button>
              <Button type="button" variant="secondary" size="sm" className="h-5 min-h-5 px-1.5 text-[9px]" onClick={() => exportItems(selectedItems, "component-library-selection", "json", [])} disabled={!selectedItems.length}>
                Export JSON
              </Button>
              <Button type="button" variant="secondary" size="sm" className="h-5 min-h-5 px-1.5 text-[9px]" onClick={() => exportItems(selectedItems, "component-library-selection", "csv", [])} disabled={!selectedItems.length}>
                Export CSV
              </Button>
              <Button type="button" variant="danger" size="sm" className="h-5 min-h-5 px-1.5 text-[9px]" onClick={deleteSelectedItems} disabled={!selectedItems.length}>
                Delete
              </Button>
            </div>
          ) : null}
        </div>

        {/* Scrollable list */}
        <div className="min-h-0 flex-1 overflow-auto px-2 py-1.5">
          {activeTab !== "components" ? (
            visibleBundles.length ? (
              <div className="space-y-1" role="tabpanel" aria-label={activeTab === "assemblies" ? "Assemblies" : "Templates"}>
                {visibleBundles.map((bundle) => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    libraryItems={libraryItems}
                    addDisabled={!canInsert}
                    onAdd={() => addBundle(bundle)}
                    onDelete={bundle.isCustom ? () => deleteBundle(bundle.id) : undefined}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<SquaresFour size={20} />}
                title={activeTab === "assemblies" ? "No assemblies matched" : "No templates matched"}
                description="Use selected components to save reusable bundles for repeat areas."
              />
            )
          ) : !libraryItems.length ? (
            <EmptyState
              icon={<SquaresFour size={20} />}
              title="Library is empty"
              description="Create a component to start building your estimate library."
            />
          ) : !filteredSortedItems.length ? (
            <EmptyState
              icon={<SquaresFour size={20} />}
              title="No components matched"
              description="Try clearing search or filters."
              action={(
                <Button className="h-6 min-h-6" onClick={() => { setSearchQuery(""); setFilters(defaultFilters); }}>
                  Clear search and filters
                </Button>
              )}
            />
          ) : (
            <div className="space-y-1" role="tabpanel" aria-label="Components" onKeyDown={handleCardListKeyDown}>
              {recentItems.length ? (
                <div className="overflow-hidden border border-hairline bg-white">
                  <div className="border-b border-hairline px-1.5 py-1">
                    <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-tertiary">Recently Used</p>
                  </div>
                  <div className="flex gap-1 overflow-x-auto p-1">
                    {recentItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!canInsert}
                        className="flex min-w-36 shrink-0 items-center gap-1.5 border border-hairline bg-white px-1.5 py-1 text-left transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label={canInsert ? `${targetLabel}: ${getComponentName(item)}` : `Select an area before adding ${getComponentName(item)}`}
                        onClick={() => addComponent(item)}
                      >
                        <span
                          className="block size-5 shrink-0 border border-hairline bg-surfaceMuted bg-cover bg-center"
                          style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-[9px] font-bold text-ink">{getComponentName(item)}</span>
                          <span className="block truncate text-[8px] font-bold text-tertiary">{pesoFormatter.format(getComponentPrice(item))}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {groupEntries.map(([group, items]) => {
                const collapsed = collapsedGroups.has(group);
                return (
                  <div key={group} className="overflow-hidden border border-hairline">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => toggleGroup(group)}
                      className="flex h-auto min-h-0 w-full cursor-pointer items-center justify-between rounded-none bg-white px-1.5 py-1 text-left transition hover:bg-surfaceMuted"
                      aria-expanded={!collapsed}
                    >
                      <span className="truncate text-[9px] font-bold uppercase tracking-[0.06em] text-ink">{group}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold tabular-nums text-tertiary">{items.length}</span>
                        <CaretDown size={10} weight="bold" className={cn("text-tertiary transition-transform", collapsed && "-rotate-90")} aria-hidden="true" />
                      </div>
                    </Button>
                    {!collapsed ? (
                      <div className={cn("bg-surfaceMuted/30", viewMode === "grid" ? "grid grid-cols-2 gap-1 p-1" : "space-y-1 p-1")}>
                        {items.map((item) => (
                          <LibraryItemCard
                            key={item.id}
                            item={item}
                            viewMode={viewMode}
                            query={searchQuery}
                            selected={previewItemId === item.id}
                            onPreview={() => setPreviewItemId(item.id)}
                            onEdit={() => startEditComponent(item)}
                            onAdd={() => addComponent(item)}
                            onFavorite={() => toggleFavorite(item)}
                            onDuplicate={() => duplicateItem(item)}
                            onDelete={() => setDeleteCandidate(item)}
                            addDisabled={!canInsert}
                            addLabel={canInsert ? `${targetLabel}: ${getComponentName(item)}` : `Select an area before adding ${getComponentName(item)}`}
                            bulkSelected={selectedItemIds.has(item.id)}
                            onToggleBulkSelected={() => toggleSelectedItem(item.id)}
                            previewTabIndex={visibleFocusedItemId === item.id ? 0 : -1}
                            onPreviewFocus={() => setFocusedItemId(item.id)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview panel */}
        {previewItem ? (
          <PreviewPanel
            item={previewItem}
            onClose={() => setPreviewItemId(null)}
            onAdd={(quantity) => addComponent(previewItem, quantity)}
            onEdit={() => startEditComponent(previewItem)}
            onDuplicate={() => duplicateItem(previewItem)}
            onFavorite={() => toggleFavorite(previewItem)}
            onDelete={() => setDeleteCandidate(previewItem)}
            addDisabled={!canInsert}
            addLabel={canInsert ? `${targetLabel}: ${getComponentName(previewItem)}` : `Select an area before adding ${getComponentName(previewItem)}`}
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
            <p className="text-[9px] font-bold text-ink">
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
              <h3 className="text-[11px] font-bold text-ink">Delete component?</h3>
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
