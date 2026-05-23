"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Plus, WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { ControlSelect } from "@/components/ui/control-select";
import { Modal } from "@/components/ui/modal";
import {
  createCostLibraryComponent,
  type ComponentLifecycleState,
  type CreateCostLibraryComponentInput,
} from "@/lib/component-library/actions";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import { findComponentCategoryPath, type ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { EstimateRowItem } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";
import type { ComponentLibrarySupplierOption } from "../component-library/tree/buildLibraryTree";

type PriceDraft = {
  id: string;
  label: string;
  unitCost: string;
  miscCost: string;
  unit: string;
  pricingSource: string;
  pricingDate: string;
  confidence: string;
  sourceUrl: string;
  notes: string;
  isDefault: boolean;
};

type ComponentDraft = {
  name: string;
  kind: CreateCostLibraryComponentInput["kind"];
  description: string;
  unit: string;
  sku: string;
  brand: string;
  thumbnailPath: string;
  libraryFolderId: string;
  categoryNodeId: string;
  supplierId: string;
  supplierName: string;
  lifecycleState: ComponentLifecycleState;
  effectiveAt: string;
  changeReason: string;
  prices: PriceDraft[];
};

type AddComponentModalProps = {
  open: boolean;
  folders: LibraryFolderRecord[];
  categoryTree: ComponentLibraryTaxonomyNode[];
  suppliers: ComponentLibrarySupplierOption[];
  selectedFolderId: string | null;
  selectedSupplierId?: string | null;
  onOpenChange: (open: boolean) => void;
  onComponentCreated: (item: EstimateRowItem) => void;
};

const SECTIONS = ["Identity", "Classify", "Pricing", "Lifecycle", "Review"] as const;
const DEFAULT_PRICE_LABELS = ["Retail", "Supplier Quote", "Allowance", "Contractor Rate"];
const LIFECYCLE_OPTIONS: Array<{ value: ComponentLifecycleState; label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }> = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "in_production", label: "In production", tone: "info" },
  { value: "available", label: "Available", tone: "success" },
  { value: "discontinued", label: "Discontinued", tone: "warning" },
  { value: "archived", label: "Archived", tone: "danger" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function makePriceDraft(overrides: Partial<PriceDraft> = {}): PriceDraft {
  return {
    id: crypto.randomUUID(),
    label: "Retail",
    unitCost: "",
    miscCost: "0",
    unit: "unit",
    pricingSource: "",
    pricingDate: today(),
    confidence: "medium",
    sourceUrl: "",
    notes: "",
    isDefault: true,
    ...overrides,
  };
}

function flattenCategories(nodes: ComponentLibraryTaxonomyNode[], path: string[] = []): Array<{ id: string; label: string; path: string[] }> {
  return nodes.flatMap((node) => {
    const nextPath = [...path, node.label];
    return [
      { id: node.id, label: node.label, path: nextPath },
      ...flattenCategories(node.children ?? [], nextPath),
    ];
  });
}

function buildFolderPath(folders: LibraryFolderRecord[], folderId: string | null): string[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: string[] = [];
  let current = byId.get(folderId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current.name);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return path;
}

function getInitialDraft({
  folders,
  selectedFolderId,
  selectedSupplierId,
  suppliers,
}: {
  folders: LibraryFolderRecord[];
  selectedFolderId: string | null;
  selectedSupplierId?: string | null;
  suppliers: ComponentLibrarySupplierOption[];
}): ComponentDraft {
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) ?? folders[0];
  const supplier = selectedSupplierId ? suppliers.find((entry) => entry.id === selectedSupplierId) : undefined;
  return {
    name: "",
    kind: "material",
    description: "",
    unit: "unit",
    sku: "",
    brand: "",
    thumbnailPath: "",
    libraryFolderId: selectedFolder?.id ?? "",
    categoryNodeId: selectedFolder?.source_category_node_id ?? "",
    supplierId: supplier?.id ?? "",
    supplierName: supplier?.name ?? "",
    lifecycleState: "available",
    effectiveAt: today(),
    changeReason: "Component created from workshop library.",
    prices: [makePriceDraft()],
  };
}

function parseMoney(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function fieldClassName(hasError = false) {
  return cn(
    "h-7 w-full rounded-sm border bg-white px-2 text-[10px] font-semibold leading-none text-ink outline-none transition focus:ring-2 focus:ring-focus",
    hasError ? "border-danger text-danger" : "border-hairline",
  );
}

function textAreaClassName() {
  return "min-h-14 w-full resize-none rounded-sm border border-hairline bg-white px-2 py-1.5 text-[10px] font-semibold leading-4 text-ink outline-none focus:ring-2 focus:ring-focus";
}

export function AddComponentModal({
  open,
  folders,
  categoryTree,
  suppliers,
  selectedFolderId,
  selectedSupplierId,
  onOpenChange,
  onComponentCreated,
}: AddComponentModalProps) {
  const [draft, setDraft] = useState(() => getInitialDraft({ folders, selectedFolderId, selectedSupplierId, suppliers }));
  const [activeSection, setActiveSection] = useState<(typeof SECTIONS)[number]>("Identity");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const dirtyRef = useRef(false);

  const categories = useMemo(() => flattenCategories(categoryTree), [categoryTree]);
  const selectedFolderPath = useMemo(() => buildFolderPath(folders, draft.libraryFolderId || null), [draft.libraryFolderId, folders]);
  const selectedCategoryPath = useMemo(
    () => (draft.categoryNodeId ? findComponentCategoryPath(categoryTree, draft.categoryNodeId) ?? [] : []),
    [categoryTree, draft.categoryNodeId],
  );
  const selectedSupplier = suppliers.find((supplier) => supplier.id === draft.supplierId);
  const defaultPrice = draft.prices.find((price) => price.isDefault) ?? draft.prices[0];
  const validation = useMemo(() => {
    const messages: string[] = [];
    if (!draft.name.trim()) messages.push("Name is required.");
    if (!draft.unit.trim()) messages.push("Unit is required.");
    if (!draft.libraryFolderId) messages.push("Library folder is required.");
    if (!draft.categoryNodeId) messages.push("Reporting category is required.");
    if (draft.prices.length === 0) messages.push("At least one price option is required.");
    if (draft.prices.filter((price) => price.isDefault).length !== 1) messages.push("Exactly one default price option is required.");
    draft.prices.forEach((price, index) => {
      if (!price.label.trim()) messages.push(`Price option ${index + 1} needs a label.`);
      if (!price.unit.trim()) messages.push(`Price option ${index + 1} needs a unit.`);
      if (!Number.isFinite(parseMoney(price.unitCost)) || parseMoney(price.unitCost) < 0) {
        messages.push(`Price option ${index + 1} needs a non-negative unit cost.`);
      }
      if (!Number.isFinite(parseMoney(price.miscCost)) || parseMoney(price.miscCost) < 0) {
        messages.push(`Price option ${index + 1} needs a non-negative misc cost.`);
      }
    });
    return messages;
  }, [draft]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => initialFocusRef.current?.focus());
  }, [open]);

  function updateDraft(update: Partial<ComponentDraft>) {
    dirtyRef.current = true;
    setDraft((current) => ({ ...current, ...update }));
    setSavedMessage("");
  }

  function updatePrice(priceId: string, update: Partial<PriceDraft>) {
    dirtyRef.current = true;
    setDraft((current) => ({
      ...current,
      prices: current.prices.map((price) => (price.id === priceId ? { ...price, ...update } : price)),
    }));
    setSavedMessage("");
  }

  function markDefaultPrice(priceId: string) {
    dirtyRef.current = true;
    setDraft((current) => ({
      ...current,
      prices: current.prices.map((price) => ({ ...price, isDefault: price.id === priceId })),
    }));
  }

  function addPriceOption() {
    dirtyRef.current = true;
    setDraft((current) => ({
      ...current,
      prices: [
        ...current.prices,
        makePriceDraft({
          label: DEFAULT_PRICE_LABELS[current.prices.length % DEFAULT_PRICE_LABELS.length],
          unit: current.unit || "unit",
          isDefault: false,
        }),
      ],
    }));
  }

  function duplicatePriceOption(price: PriceDraft) {
    dirtyRef.current = true;
    setDraft((current) => ({
      ...current,
      prices: [...current.prices, { ...price, id: crypto.randomUUID(), label: `${price.label} Copy`, isDefault: false }],
    }));
  }

  function removePriceOption(priceId: string) {
    dirtyRef.current = true;
    setDraft((current) => {
      const nextPrices = current.prices.filter((price) => price.id !== priceId);
      if (!nextPrices.some((price) => price.isDefault) && nextPrices[0]) nextPrices[0] = { ...nextPrices[0], isDefault: true };
      return { ...current, prices: nextPrices };
    });
  }

  function requestClose(openValue: boolean) {
    if (openValue || !dirtyRef.current) {
      onOpenChange(openValue);
      return;
    }
    if (window.confirm("Discard this component draft?")) {
      dirtyRef.current = false;
      onOpenChange(false);
    }
  }

  function buildOptimisticItem(result: { itemId?: string; versionNumber?: number; activePriceOptionId?: string }): EstimateRowItem {
    const price = defaultPrice;
    const itemCost = parseMoney(price?.unitCost ?? "0");
    const miscCost = parseMoney(price?.miscCost ?? "0");
    const supplierName = selectedSupplier?.name ?? draft.supplierName;
    const category = selectedCategoryPath.at(-1) ?? "General";
    return {
      id: result.itemId ?? crypto.randomUUID(),
      material: draft.name.trim(),
      name: draft.name.trim(),
      description: draft.description,
      supplier: supplierName,
      supplierId: draft.supplierId || undefined,
      source: "library",
      unit: price?.unit || draft.unit,
      itemCost,
      price: itemCost,
      currency: "PHP",
      quantity: 1,
      subTotal: itemCost,
      miscCost,
      miscCostDefault: miscCost,
      totalItemCosts: itemCost + miscCost,
      imageUrl: draft.thumbnailPath || undefined,
      category,
      categoryNodeId: draft.categoryNodeId || undefined,
      categoryPath: selectedCategoryPath,
      libraryFolderId: draft.libraryFolderId,
      sku: draft.sku || undefined,
      sourceUrl: price?.sourceUrl || undefined,
      sourceLibraryItemId: result.itemId,
      componentVersionNumber: result.versionNumber,
      priceOptionId: result.activePriceOptionId,
      priceOptionLabel: price?.label,
      priceOptions: result.activePriceOptionId && price ? [{
        id: result.activePriceOptionId,
        label: price.label,
        unit: price.unit,
        unitCost: itemCost,
        miscCost,
        currency: "PHP",
        pricingSource: price.pricingSource,
        pricingDate: price.pricingDate,
        confidence: price.confidence,
        sourceUrl: price.sourceUrl,
        notes: price.notes,
        supplierId: draft.supplierId || null,
        isActive: true,
        isDefault: true,
      }] : [],
      lifecycleState: draft.lifecycleState,
      lifecycleStateChangedAt: draft.effectiveAt,
      history: [{
        id: `optimistic-${result.itemId ?? "component"}`,
        type: "version",
        label: `v${result.versionNumber ?? 1}`,
        summary: "Component created",
        effectiveAt: draft.effectiveAt,
        createdAt: new Date().toISOString(),
        versionNumber: result.versionNumber ?? 1,
      }],
      notes: draft.changeReason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pricingSource: price?.pricingSource || supplierName || "Component library",
      pricingDate: price?.pricingDate || today(),
      confidence: price?.confidence || undefined,
      isCustom: true,
    };
  }

  function submit(addAnother: boolean) {
    if (validation.length > 0 || isPending) {
      setError(validation[0] ?? "Please resolve validation errors before saving.");
      return;
    }

    const payload: CreateCostLibraryComponentInput = {
      kind: draft.kind,
      name: draft.name,
      description: draft.description,
      category: selectedCategoryPath.at(-1) ?? "General",
      categoryNodeId: draft.categoryNodeId,
      supplier: selectedSupplier?.name ?? draft.supplierName,
      supplierId: draft.supplierId || null,
      brand: draft.brand || null,
      sku: draft.sku || null,
      unit: draft.unit,
      thumbnailPath: draft.thumbnailPath || null,
      libraryFolderId: draft.libraryFolderId,
      lifecycleState: draft.lifecycleState,
      effectiveAt: draft.effectiveAt,
      changeReason: draft.changeReason,
      priceOptions: draft.prices.map((price) => ({
        label: price.label,
        unit: price.unit || draft.unit,
        unitCost: parseMoney(price.unitCost),
        miscCost: parseMoney(price.miscCost),
        currency: "PHP",
        pricingSource: price.pricingSource,
        pricingDate: price.pricingDate,
        confidence: price.confidence,
        sourceUrl: price.sourceUrl,
        notes: price.notes,
        supplierId: draft.supplierId || null,
        isDefault: price.isDefault,
        isActive: true,
        effectiveAt: draft.effectiveAt,
        changeReason: draft.changeReason,
      })),
    };

    startTransition(async () => {
      setError("");
      try {
        const result = await createCostLibraryComponent(payload);
        onComponentCreated(buildOptimisticItem(result));
        dirtyRef.current = false;
        if (addAnother) {
          const nextDraft = getInitialDraft({ folders, selectedFolderId: draft.libraryFolderId, selectedSupplierId: draft.supplierId, suppliers });
          setDraft(nextDraft);
          setActiveSection("Identity");
          setSavedMessage("Component saved. Ready for another.");
          requestAnimationFrame(() => initialFocusRef.current?.focus());
        } else {
          onOpenChange(false);
        }
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not save component.");
      }
    });
  }

  return (
    <Modal
      open={open}
      title="Add Component"
      description="Create a persisted, versioned library component."
      onOpenChange={requestClose}
      className="max-w-3xl"
      bodyClassName="p-0"
      closeLabel="Close add component modal"
    >
      <div className="flex max-h-[calc(100dvh-92px)] min-h-[520px] flex-col">
        <div className="border-b border-hairline bg-surfaceMuted px-3 py-2">
          <div className="grid grid-cols-5 gap-1" role="tablist" aria-label="Add component sections">
            {SECTIONS.map((section) => (
              <button
                key={section}
                type="button"
                role="tab"
                aria-selected={activeSection === section}
                onClick={() => setActiveSection(section)}
                className={cn(
                  "h-7 rounded-sm px-2 text-[9px] font-bold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  activeSection === section ? "bg-white text-ink shadow-sm" : "text-tertiary hover:bg-white/70 hover:text-ink",
                )}
              >
                {section}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          {activeSection === "Identity" ? (
            <div className="grid gap-2 md:grid-cols-2">
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                Name
                <input ref={initialFocusRef} value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} className={fieldClassName(!draft.name.trim())} />
              </label>
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                Kind
                <ControlSelect value={draft.kind} onChange={(event) => updateDraft({ kind: event.target.value as ComponentDraft["kind"] })} wrapperClassName="h-7 rounded-sm border border-hairline bg-white px-2">
                  {["material", "labor", "equipment", "subcontract", "assembly", "allowance"].map((kind) => (
                    <option key={kind} value={kind}>{kind}</option>
                  ))}
                </ControlSelect>
              </label>
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                Unit
                <input
                  value={draft.unit}
                  onChange={(event) => {
                    const nextUnit = event.target.value;
                    updateDraft({
                      unit: nextUnit,
                      prices: draft.prices.map((price) => ({ ...price, unit: price.unit && price.unit !== draft.unit ? price.unit : nextUnit })),
                    });
                  }}
                  className={fieldClassName(!draft.unit.trim())}
                />
              </label>
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                SKU / Reference
                <input value={draft.sku} onChange={(event) => updateDraft({ sku: event.target.value })} className={fieldClassName()} />
              </label>
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                Brand
                <input value={draft.brand} onChange={(event) => updateDraft({ brand: event.target.value })} className={fieldClassName()} />
              </label>
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                Image URL / Path
                <input value={draft.thumbnailPath} onChange={(event) => updateDraft({ thumbnailPath: event.target.value })} className={fieldClassName()} />
              </label>
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary md:col-span-2">
                Description
                <textarea value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} className={textAreaClassName()} />
              </label>
            </div>
          ) : null}

          {activeSection === "Classify" ? (
            <div className="grid gap-3">
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                Library folder
                <ControlSelect
                  value={draft.libraryFolderId}
                  onChange={(event) => {
                    const folder = folders.find((entry) => entry.id === event.target.value);
                    updateDraft({
                      libraryFolderId: event.target.value,
                      categoryNodeId: folder?.source_category_node_id ?? draft.categoryNodeId,
                    });
                  }}
                  wrapperClassName="h-7 rounded-sm border border-hairline bg-white px-2"
                >
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{buildFolderPath(folders, folder.id).join(" / ")}</option>
                  ))}
                </ControlSelect>
                <span className="truncate text-[9px] normal-case tracking-normal text-tertiary">{selectedFolderPath.join(" / ") || "No folder selected"}</span>
              </label>
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                Reporting category
                <ControlSelect value={draft.categoryNodeId} onChange={(event) => updateDraft({ categoryNodeId: event.target.value })} wrapperClassName="h-7 rounded-sm border border-hairline bg-white px-2">
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.path.join(" / ")}</option>
                  ))}
                </ControlSelect>
                <span className="truncate text-[9px] normal-case tracking-normal text-tertiary">
                  {selectedCategoryPath.join(" / ") || "Choose a reporting category"}
                </span>
              </label>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                  Supplier
                  <ControlSelect
                    value={draft.supplierId}
                    onChange={(event) => {
                      const supplier = suppliers.find((entry) => entry.id === event.target.value);
                      updateDraft({ supplierId: event.target.value, supplierName: supplier?.name ?? draft.supplierName });
                    }}
                    wrapperClassName="h-7 rounded-sm border border-hairline bg-white px-2"
                  >
                    <option value="">No supplier / create from name</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </ControlSelect>
                </label>
                <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                  New supplier name
                  <input value={draft.supplierName} onChange={(event) => updateDraft({ supplierName: event.target.value, supplierId: "" })} className={fieldClassName()} />
                </label>
              </div>
            </div>
          ) : null}

          {activeSection === "Pricing" ? (
            <div className="grid gap-2">
              {draft.prices.map((price, index) => (
                <div key={price.id} className="rounded-md border border-hairline bg-white p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1">
                      <Badge tone={price.isDefault ? "success" : "neutral"} size="xs">{price.isDefault ? "Default" : `Option ${index + 1}`}</Badge>
                      <span className="truncate text-[10px] font-bold text-ink">{price.label || "Unnamed price option"}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => markDefaultPrice(price.id)} className="h-6 rounded-sm border border-hairline px-2 text-[9px] font-bold text-ink disabled:opacity-50" disabled={price.isDefault}>Default</button>
                      <button type="button" onClick={() => duplicatePriceOption(price)} className="h-6 rounded-sm border border-hairline px-2 text-[9px] font-bold text-ink">Duplicate</button>
                      <button type="button" onClick={() => removePriceOption(price.id)} className="h-6 rounded-sm border border-dangerSoft px-2 text-[9px] font-bold text-danger" disabled={draft.prices.length === 1}>Remove</button>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-4">
                    <input aria-label={`Price option ${index + 1} label`} value={price.label} onChange={(event) => updatePrice(price.id, { label: event.target.value })} className={fieldClassName(!price.label.trim())} />
                    <input aria-label={`Price option ${index + 1} unit cost`} inputMode="decimal" value={price.unitCost} onChange={(event) => updatePrice(price.id, { unitCost: event.target.value })} className={fieldClassName(!Number.isFinite(parseMoney(price.unitCost)))} placeholder="Unit cost" />
                    <input aria-label={`Price option ${index + 1} misc cost`} inputMode="decimal" value={price.miscCost} onChange={(event) => updatePrice(price.id, { miscCost: event.target.value })} className={fieldClassName(!Number.isFinite(parseMoney(price.miscCost)))} placeholder="Misc" />
                    <input aria-label={`Price option ${index + 1} unit`} value={price.unit} onChange={(event) => updatePrice(price.id, { unit: event.target.value })} className={fieldClassName(!price.unit.trim())} />
                    <input aria-label={`Price option ${index + 1} source`} value={price.pricingSource} onChange={(event) => updatePrice(price.id, { pricingSource: event.target.value })} className={fieldClassName()} placeholder="Source" />
                    <input aria-label={`Price option ${index + 1} date`} type="date" value={price.pricingDate} onChange={(event) => updatePrice(price.id, { pricingDate: event.target.value })} className={fieldClassName()} />
                    <ControlSelect aria-label={`Price option ${index + 1} confidence`} value={price.confidence} onChange={(event) => updatePrice(price.id, { confidence: event.target.value })} wrapperClassName="h-7 rounded-sm border border-hairline bg-white px-2">
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </ControlSelect>
                    <input aria-label={`Price option ${index + 1} source URL`} value={price.sourceUrl} onChange={(event) => updatePrice(price.id, { sourceUrl: event.target.value })} className={fieldClassName()} placeholder="Source URL" />
                  </div>
                  <textarea aria-label={`Price option ${index + 1} notes`} value={price.notes} onChange={(event) => updatePrice(price.id, { notes: event.target.value })} className={cn(textAreaClassName(), "mt-2 min-h-10")} placeholder="Notes" />
                </div>
              ))}
              <button type="button" onClick={addPriceOption} className="inline-flex h-7 w-fit items-center gap-1 rounded-sm border border-hairline px-2 text-[9px] font-bold text-ink">
                <Plus size={11} weight="bold" aria-hidden="true" />
                Add price option
              </button>
            </div>
          ) : null}

          {activeSection === "Lifecycle" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                Component state
                <ControlSelect value={draft.lifecycleState} onChange={(event) => updateDraft({ lifecycleState: event.target.value as ComponentLifecycleState })} wrapperClassName="h-7 rounded-sm border border-hairline bg-white px-2">
                  {LIFECYCLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </ControlSelect>
              </label>
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary">
                Effective date
                <input type="date" value={draft.effectiveAt} onChange={(event) => updateDraft({ effectiveAt: event.target.value })} className={fieldClassName()} />
              </label>
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-tertiary md:col-span-2">
                Change note
                <textarea value={draft.changeReason} onChange={(event) => updateDraft({ changeReason: event.target.value })} className={textAreaClassName()} />
              </label>
            </div>
          ) : null}

          {activeSection === "Review" ? (
            <div className="grid gap-2">
              <div className="rounded-md border border-hairline bg-surfaceMuted p-2">
                <p className="text-[11px] font-bold text-ink">{draft.name || "Unnamed component"}</p>
                <p className="mt-1 text-[9px] leading-4 text-tertiary">{selectedFolderPath.join(" / ") || "No folder"} / {selectedCategoryPath.join(" / ") || "No category"}</p>
                <p className="text-[9px] leading-4 text-tertiary">{selectedSupplier?.name ?? (draft.supplierName || "No supplier")} / {defaultPrice?.label ?? "No price"} / PHP {defaultPrice?.unitCost || "0"} per {defaultPrice?.unit || draft.unit}</p>
                <div className="mt-2">
                  <Badge tone={LIFECYCLE_OPTIONS.find((option) => option.value === draft.lifecycleState)?.tone ?? "neutral"}>{draft.lifecycleState.replaceAll("_", " ")}</Badge>
                </div>
              </div>
              {validation.length > 0 ? (
                <div className="rounded-md border border-warning/25 bg-warning/10 p-2 text-[10px] leading-4 text-warning">
                  <div className="mb-1 flex items-center gap-1 font-bold"><WarningCircle size={12} weight="bold" /> Resolve before saving</div>
                  <ul className="list-inside list-disc">
                    {validation.map((message) => <li key={message}>{message}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 z-10 flex min-h-11 items-center justify-between gap-2 border-t border-hairline bg-white px-3 py-2">
          <div className="min-w-0 text-[9px] font-semibold leading-4 text-tertiary" aria-live="polite">
            {error ? <span className="text-danger">{error}</span> : savedMessage || `${validation.length} validation issue${validation.length === 1 ? "" : "s"}`}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => requestClose(false)} className="h-7 rounded-sm border border-hairline px-2 text-[9px] font-bold text-ink" disabled={isPending}>Cancel</button>
            <button type="button" onClick={() => submit(true)} className="h-7 rounded-sm border border-hairline px-2 text-[9px] font-bold text-ink disabled:opacity-50" disabled={isPending || validation.length > 0}>Save and add another</button>
            <button type="button" onClick={() => submit(false)} className="h-7 rounded-sm bg-ink px-2 text-[9px] font-bold text-white disabled:opacity-50" disabled={isPending || validation.length > 0}>{isPending ? "Saving..." : "Save"}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
