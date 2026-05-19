"use client";

import {
  type Dispatch,
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
  SquaresFour,
  X,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/ui/cn";
import { estimateLibraryItems, type EstimateRowItem } from "../estimate-tree-data";
import { ResizableSidePanel } from "../ResizableSidePanel";
import { LibraryItemCard } from "./ComponentCard";
import { NewComponentForm } from "./NewComponentForm";
import type { ComponentFilters, LibraryFacets, LibraryGroupBy, LibrarySortMode, LibraryViewMode, NewComponentForm as NewComponentFormType } from "./types";
import {
  createComponent,
  defaultFilters,
  defaultForm,
  filterComponents,
  getComponentDesignation,
  getComponentDiscipline,
  getComponentImageUrl,
  getComponentName,
  getComponentPrice,
  groupComponents,
  LIBRARY_FAVORITES_KEY,
  LIBRARY_PREFS_KEY,
  LIBRARY_RECENTS_KEY,
  pesoFormatter,
  readJsonStorage,
  readLibraryPreferences,
  searchComponents,
  sortComponents,
  unique,
} from "./helpers";

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
  onDuplicate,
  onFavorite,
  onDelete,
}: {
  item: EstimateRowItem;
  onClose: () => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}) {
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
        <div className="mt-2 grid grid-cols-4 gap-1">
          <Button onClick={onAdd} className="h-6 min-h-6 text-[9px]">
            Add
          </Button>
          <Button variant="secondary" onClick={onDuplicate} className="h-6 min-h-6 text-[9px]">
            Duplicate
          </Button>
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

/* ─── Main Sidebar ─── */

export function EstimateRightSidebar({ onInsertComponent }: { onInsertComponent?: (item: EstimateRowItem) => void } = {}) {
  const prefs = useMemo(() => readLibraryPreferences(), []);
  const [recentIds, setRecentIds] = useState<string[]>(() => readJsonStorage<string[]>(LIBRARY_RECENTS_KEY, []));
  const [libraryItems, setLibraryItems] = useState<EstimateRowItem[]>(() => {
    const favoriteIds = readJsonStorage<string[]>(LIBRARY_FAVORITES_KEY, []);
    const storedRecentIds = readJsonStorage<string[]>(LIBRARY_RECENTS_KEY, []);
    return estimateLibraryItems.map((item, index) => ({
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
  const [groupBy, setGroupBy] = useState<LibraryGroupBy>(prefs.groupBy ?? "category");
  const [viewMode] = useState<LibraryViewMode>(prefs.viewMode ?? "compact");
  const [sortMode] = useState<LibrarySortMode>(prefs.sortMode ?? "relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [showNewComponent, setShowNewComponent] = useState(false);
  const [form, setForm] = useState<NewComponentFormType>(defaultForm);
  const [formError, setFormError] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<EstimateRowItem | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(LIBRARY_PREFS_KEY, JSON.stringify({ viewMode, groupBy, sortMode }));
  }, [viewMode, groupBy, sortMode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        if (showFilters) setShowFilters(false);
        else if (searchQuery) setSearchQuery("");
        else if (previewItemId) setPreviewItemId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchQuery, showFilters, previewItemId]);

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

  const persistFavorites = useCallback((items: EstimateRowItem[]) => {
    localStorage.setItem(LIBRARY_FAVORITES_KEY, JSON.stringify(items.filter((item) => item.isFavorite).map((item) => item.id)));
  }, []);

  const addComponent = useCallback(
    (item: EstimateRowItem) => {
      const recents = [item.id, ...recentIds.filter((id) => id !== item.id)].slice(0, 12);
      setRecentIds(recents);
      localStorage.setItem(LIBRARY_RECENTS_KEY, JSON.stringify(recents));
      setLibraryItems((items) => items.map((row) => (row.id === item.id ? { ...row, lastUsedAt: new Date().toISOString() } : row)));
      if (onInsertComponent) onInsertComponent(item);
      else window.dispatchEvent(new CustomEvent("archestimator:add-library-item", { detail: item }));
    },
    [recentIds, onInsertComponent],
  );

  const duplicateItem = useCallback((item: EstimateRowItem) => {
    const now = new Date().toISOString();
    setLibraryItems((items) => [
      { ...item, id: `custom-copy-${Date.now()}`, material: `${getComponentName(item)} copy`, name: `${getComponentName(item)} copy`, isCustom: true, createdAt: now, updatedAt: now },
      ...items,
    ]);
  }, []);

  const toggleFavorite = useCallback(
    (item: EstimateRowItem) => {
      setLibraryItems((items) => {
        const next = items.map((row) => (row.id === item.id ? { ...row, isFavorite: !row.isFavorite } : row));
        persistFavorites(next);
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

  const saveNewComponent = useCallback(
    (addNow = false) => {
      const result = createComponent(form);
      if (result.error || !result.component) {
        setFormError(result.error ?? "Could not save component.");
        return;
      }
      setLibraryItems((items) => [result.component!, ...items]);
      setShowNewComponent(false);
      setForm(defaultForm);
      setFormError("");
      setPreviewItemId(result.component.id);
      if (addNow) addComponent(result.component);
    },
    [form, addComponent],
  );

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
    <ResizableSidePanel side="right" ariaLabel="Component library" storageKey="estimate_component_library_width_v2" defaultWidth={380} minWidth={360} maxWidth={560}>
      <aside className="flex h-full min-h-0 min-w-[320px] flex-col border-l border-hairline bg-white !text-[10px]">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 shrink-0 border-b border-hairline bg-white">
          {/* Title bar */}
          <div className="flex h-10 items-center justify-between border-b border-hairline pl-4 pr-2">
            <h2 className="text-[9px] font-bold uppercase tracking-[0.14em] text-tertiary">Component library</h2>
          </div>
          <div className="flex items-center p-2">
            <SearchInput
              ref={searchRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search component library"
              aria-label="Search component library"
              onClear={() => setSearchQuery("")}
              wrapperClassName="h-8 w-full"
            />
          </div>

          <HeaderIconToolbar
            ariaLabel="Component library tools"
            labelPrefix="component library"
            onFilter={() => setShowFilters((value) => !value)}
            onGroup={() => setGroupBy((value) => (value === "category" ? "supplier" : "category"))}
          />

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
        </div>

        {/* Scrollable list */}
        <div className="min-h-0 flex-1 overflow-auto px-2 py-1.5">
          {!libraryItems.length ? (
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
            <div className="space-y-1">
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
                            onAdd={() => addComponent(item)}
                            onFavorite={() => toggleFavorite(item)}
                            onDuplicate={() => duplicateItem(item)}
                            onDelete={() => setDeleteCandidate(item)}
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
            onAdd={() => addComponent(previewItem)}
            onDuplicate={() => duplicateItem(previewItem)}
            onFavorite={() => toggleFavorite(previewItem)}
            onDelete={() => setDeleteCandidate(previewItem)}
          />
        ) : null}

        {/* New component form */}
        {showNewComponent ? (
          <NewComponentForm
            form={form}
            formError={formError}
            onChange={setForm}
            onSave={() => saveNewComponent(false)}
            onSaveAndAdd={() => saveNewComponent(true)}
            onCancel={() => {
              setShowNewComponent(false);
              setForm(defaultForm);
              setFormError("");
            }}
          />
        ) : null}

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
                <Button variant="danger" size="sm" className="h-6 min-h-6 text-[9px]" onClick={() => { setLibraryItems((items) => items.filter((item) => item.id !== deleteCandidate.id)); setDeleteCandidate(null); }}>
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
