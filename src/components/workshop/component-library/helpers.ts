import type { EstimateRowItem } from "../estimate-tree-data";
import type {
  ComponentFilters,
  LibraryBundle,
  LibraryBundleKind,
  LibraryGroupBy,
  LibraryImportResult,
  LibrarySortMode,
  NewComponentForm,
  SearchResult,
} from "./types";

export const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const componentImageFallbacks: Record<string, string> = {
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
  cabinetry: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=600&q=80",
  finishes: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80",
  "wall paints / interior finishes": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80",
  "electrical fixtures": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80",
  "lighting fixtures": "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?auto=format&fit=crop&w=600&q=80",
  "plumbing fixtures": "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80",
  "kitchen fixtures": "https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=600&q=80",
  outdoor: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
};

export function getComponentImageUrl(item: EstimateRowItem) {
  if (item.imageUrl) return item.imageUrl;
  const category = item.category?.toLowerCase();
  if (category && componentImageFallbacks[category]) return componentImageFallbacks[category];
  const material = (item.material ?? "").toLowerCase();
  if (material.includes("paint") || material.includes("skimcoat") || material.includes("wallpaper")) return componentImageFallbacks["wall paints / interior finishes"];
  if (material.includes("light") || material.includes("outlet") || material.includes("switch") || material.includes("led")) return componentImageFallbacks["electrical fixtures"];
  if (material.includes("toilet") || material.includes("lavatory") || material.includes("vanity") || material.includes("sink")) return componentImageFallbacks["plumbing fixtures"];
  if (material.includes("tile") || material.includes("floor")) return componentImageFallbacks.finishes;
  if (material.includes("wardrobe") || material.includes("cabinet")) return componentImageFallbacks.cabinetry;
  return componentImageFallbacks.furniture;
}

export function getComponentName(item: EstimateRowItem) {
  return item.name ?? item.material;
}

export function getComponentPrice(item: EstimateRowItem) {
  return item.price ?? item.itemCost;
}

export function getComponentDiscipline(item: EstimateRowItem) {
  if (item.discipline) return item.discipline;
  const category = (item.category ?? "").toLowerCase();
  if (category.includes("electrical") || category.includes("lighting")) return "Electrical";
  if (category.includes("plumbing") || category.includes("kitchen")) return "Plumbing";
  if (category.includes("cabinetry")) return "Millwork";
  if (category.includes("outdoor") || category.includes("site")) return "Sitework";
  if (category.includes("furniture")) return "Furniture";
  return "Architectural";
}

export function getComponentDesignation(item: EstimateRowItem) {
  if (item.designation) return item.designation;
  const text = `${item.material ?? ""} ${item.category ?? ""} ${item.description ?? ""}`.toLowerCase();
  if (/\blights?\b|\blighting\b|\bdownlight\b|\bceiling\b/.test(text)) return "Ceiling";
  if (/\bwall\b|\bpaint\b|\bwallpaper\b|\bskimcoat\b/.test(text)) return "Wall";
  if (/\bfloor\b|\btile\b|\bcarpet\b|\bvinyl\b/.test(text)) return "Floor";
  if (/\bcounter\b|\bcabinet\b|\bwardrobe\b|\bmillwork\b/.test(text)) return "Millwork";
  if (/\bplumbing\b|\bfixture\b|\bfaucet\b|\bsink\b|\btoilet\b|\blavatory\b/.test(text)) return "Plumbing";
  if (/\bdoor\b|\bwindow\b|\bopening\b/.test(text)) return "Opening";
  return "General";
}

export function daysAgo(date: string) {
  const time = new Date(date).getTime();
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

export function itemCreatedAt(item: EstimateRowItem) {
  return item.createdAt ?? item.pricingDate ?? new Date(0).toISOString();
}

export function itemLastUsedAt(item: EstimateRowItem, recentIds: string[]) {
  return item.lastUsedAt ?? (recentIds.includes(item.id) ? new Date().toISOString() : "");
}

export function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function safeSetJsonStorage<T>(key: string, data: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn(`[EstimateRightSidebar] Failed to persist ${key}:`, error);
    return false;
  }
}

export function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function normalizeForSearch(value: string) {
  return value.toLowerCase().trim();
}

export function searchComponents(items: EstimateRowItem[], query: string): SearchResult[] {
  const q = normalizeForSearch(query);
  if (!q) return items.map((item, index) => ({ item, score: 0, index }));
  return items
    .map((item, index) => {
      const name = normalizeForSearch(getComponentName(item));
      const supplier = normalizeForSearch(item.supplier ?? "");
      const category = normalizeForSearch(item.category ?? "");
      const description = normalizeForSearch(item.description ?? "");
      const tags = normalizeForSearch((item.tags ?? []).join(" "));
      const discipline = normalizeForSearch(getComponentDiscipline(item));
      const designation = normalizeForSearch(getComponentDesignation(item));
      const unit = normalizeForSearch(item.unit ?? "");
      const notes = normalizeForSearch(item.notes ?? item.pricingSource ?? "");
      let score = -1;
      if (name === q) score = 1000;
      else if (name.startsWith(q)) score = 800;
      else if (name.includes(q)) score = 650;
      else if (supplier.includes(q) || category.includes(q)) score = 520;
      else if (discipline.includes(q) || designation.includes(q) || unit.includes(q)) score = 430;
      else if (description.includes(q) || tags.includes(q) || notes.includes(q)) score = 300;
      return { item, score, index };
    })
    .filter((result) => result.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

export function filterComponents(
  items: EstimateRowItem[],
  filters: ComponentFilters,
  favoriteIds: string[] = [],
  recentIds: string[] = [],
) {
  const minPrice = filters.minPrice ? Number(filters.minPrice) : Number.NEGATIVE_INFINITY;
  const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : Number.POSITIVE_INFINITY;
  return items.filter((item) => {
    const price = getComponentPrice(item);
    if (filters.categories.length && !filters.categories.includes(item.category)) return false;
    if (filters.suppliers.length && !filters.suppliers.includes(item.supplier)) return false;
    if (filters.disciplines.length && !filters.disciplines.includes(getComponentDiscipline(item))) return false;
    if (filters.designations.length && !filters.designations.includes(getComponentDesignation(item))) return false;
    if (filters.units.length && !filters.units.includes(item.unit)) return false;
    if (price < minPrice || price > maxPrice) return false;
    if (filters.favoritesOnly && !favoriteIds.includes(item.id) && !item.isFavorite) return false;
    if (filters.recentOnly && !recentIds.includes(item.id) && !item.lastUsedAt) return false;
    if (filters.customOnly && !item.isCustom) return false;
    if (filters.imageState === "has" && !item.imageUrl) return false;
    if (filters.imageState === "none" && item.imageUrl) return false;
    if (filters.supplierState === "has" && !item.supplier) return false;
    if (filters.supplierState === "none" && item.supplier) return false;
    return true;
  });
}

export function sortComponents(results: SearchResult[], sortMode: LibrarySortMode, recentIds: string[] = []) {
  const sorted = [...results];
  sorted.sort((a, b) => {
    if (sortMode === "relevance") return b.score - a.score || a.index - b.index;
    if (sortMode === "name") return getComponentName(a.item).localeCompare(getComponentName(b.item));
    if (sortMode === "priceAsc") return getComponentPrice(a.item) - getComponentPrice(b.item);
    if (sortMode === "priceDesc") return getComponentPrice(b.item) - getComponentPrice(a.item);
    if (sortMode === "supplier") return (a.item.supplier ?? "").localeCompare(b.item.supplier ?? "") || getComponentName(a.item).localeCompare(getComponentName(b.item));
    if (sortMode === "recentUsed") return (itemLastUsedAt(b.item, recentIds) || "").localeCompare(itemLastUsedAt(a.item, recentIds) || "");
    if (sortMode === "recentAdded") return itemCreatedAt(b.item).localeCompare(itemCreatedAt(a.item));
    return 0;
  });
  return sorted.map((result) => result.item);
}

export function groupComponents(items: EstimateRowItem[], groupBy: LibraryGroupBy, recentIds: string[] = []): [string, EstimateRowItem[]][] {
  if (groupBy === "none") return [["All components", items]];
  const groups = items.reduce<Record<string, EstimateRowItem[]>>((acc, item) => {
    const key =
      groupBy === "supplier"
        ? item.supplier || "No supplier"
        : groupBy === "discipline"
          ? getComponentDiscipline(item)
          : groupBy === "recent"
            ? recentIds.includes(item.id) || item.lastUsedAt
              ? "Recently used"
              : "Not recently used"
            : groupBy === "room"
              ? getComponentDesignation(item)
              : item.category || "General";
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function parseRequiredNonNegative(value: string, label: string): { value?: number; error?: string } {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return { error: `${label} must be a valid non-negative number.` };
  return { value: number };
}

function parseOptionalNonNegative(value: string, label: string): { value?: number; error?: string } {
  if (!value.trim()) return { value: 0 };
  return parseRequiredNonNegative(value, label);
}

export function createComponent(form: NewComponentForm): { component?: EstimateRowItem; error?: string } {
  if (!form.material.trim()) return { error: "Component name is required." };
  if (!form.category.trim()) return { error: "Category is required." };
  if (!form.unit.trim()) return { error: "Unit is required." };
  const itemCostResult = parseRequiredNonNegative(form.itemCost, "Base price");
  if (itemCostResult.error) return { error: itemCostResult.error };
  const miscCostResult = parseOptionalNonNegative(form.miscCost, "Misc cost default");
  if (miscCostResult.error) return { error: miscCostResult.error };
  const itemCost = itemCostResult.value ?? 0;
  const miscCost = miscCostResult.value ?? 0;
  const subTotal = itemCost;
  const now = new Date().toISOString();
  return {
    component: {
      id: `custom-${Date.now()}`,
      material: form.material.trim(),
      name: form.material.trim(),
      category: form.category.trim(),
      supplier: form.supplier.trim(),
      unit: form.unit.trim(),
      itemCost,
      price: itemCost,
      currency: form.currency || "PHP",
      quantity: 1,
      subTotal,
      contingencyPercentage: 0,
      contingencyValue: 0,
      miscCost,
      miscCostDefault: miscCost,
      totalItemCosts: subTotal + miscCost,
      description: form.description.trim(),
      source: "library",
      discipline: form.discipline,
      designation: form.designation,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      imageUrl: form.imageUrl.trim() || getComponentImageUrl({
        material: form.material.trim(),
        category: form.category.trim(),
        supplier: form.supplier.trim(),
        source: "library",
        unit: form.unit.trim(),
        itemCost,
        quantity: 1,
        miscCost,
        subTotal,
        contingencyPercentage: 0,
        contingencyValue: 0,
        totalItemCosts: subTotal + miscCost,
        description: form.description.trim(),
        id: "component-image-preview",
        pricingSource: "User-created component",
        pricingDate: now.slice(0, 10),
      }),
      sku: form.sku.trim() || undefined,
      sourceUrl: form.sourceUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
      pricingSource: form.sourceUrl.trim() || "User-created component",
      pricingDate: now.slice(0, 10),
    },
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

function parseImportNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/[^0-9.-]/g, "");
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeRecordKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function firstValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key] ?? record[normalizeRecordKey(key)];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = firstValue(record, [key]);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function normalizeImportRecord(record: Record<string, unknown>, index: number, sourceLabel: string): { item?: EstimateRowItem; error?: string } {
  const material = firstString(record, ["material", "name", "component", "item", "component name"]);
  const category = firstString(record, ["category", "type", "group"]);
  const unit = firstString(record, ["unit", "uom"]);
  const itemCost = parseImportNumber(firstValue(record, ["itemCost", "price", "cost", "item cost", "base price"]), Number.NaN);

  if (!material) return { error: `Row ${index + 1}: component name is required.` };
  if (!category) return { error: `Row ${index + 1}: category is required.` };
  if (!unit) return { error: `Row ${index + 1}: unit is required.` };
  if (!Number.isFinite(itemCost)) return { error: `Row ${index + 1}: price is required.` };

  const quantity = Math.max(1, parseImportNumber(firstValue(record, ["quantity"]), 1));
  const miscCost = parseImportNumber(firstValue(record, ["miscCost", "misc cost", "misc"]), 0);
  const subTotal = itemCost * quantity;
  const now = new Date().toISOString();
  const tagsValue = firstValue(record, ["tags"]);
  const tags = Array.isArray(tagsValue)
    ? tagsValue.map(String).map((tag) => tag.trim()).filter(Boolean)
    : firstString(record, ["tags"])
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

  const item: EstimateRowItem = {
    id: firstString(record, ["id"]) || `import-${slugify(material) || "component"}-${Date.now()}-${index}`,
    material,
    name: material,
    description: firstString(record, ["description", "notes", "scope"]),
    supplier: firstString(record, ["supplier", "vendor", "brand"]),
    source: "library",
    unit,
    itemCost,
    price: itemCost,
    currency: firstString(record, ["currency"]) || "PHP",
    quantity,
    subTotal,
    miscCost,
    miscCostDefault: miscCost,
    totalItemCosts: subTotal + miscCost,
    imageUrl: firstString(record, ["imageUrl", "image url", "image", "thumbnail"]) || undefined,
    category,
    discipline: firstString(record, ["discipline"]) || undefined,
    designation: firstString(record, ["designation", "room", "location"]) || undefined,
    tags,
    sku: firstString(record, ["sku", "code"]) || undefined,
    sourceUrl: firstString(record, ["sourceUrl", "source url", "url"]) || undefined,
    notes: firstString(record, ["notes"]) || undefined,
    isCustom: true,
    createdAt: now,
    updatedAt: now,
    pricingSource: firstString(record, ["pricingSource", "pricing source"]) || sourceLabel,
    pricingDate: firstString(record, ["pricingDate", "pricing date", "date"]) || now.slice(0, 10),
  };

  return { item };
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(header: string) {
  return normalizeRecordKey(header);
}

export function parseLibraryCsv(text: string): LibraryImportResult {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return { items: [], bundles: [], errors: ["CSV import requires a header row and at least one component row."] };
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const items: EstimateRowItem[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, rowIndex) => {
    const cells = splitCsvLine(line);
    const record = headers.reduce<Record<string, unknown>>((acc, header, index) => {
      acc[header] = cells[index] ?? "";
      return acc;
    }, {});
    const result = normalizeImportRecord(record, rowIndex, "CSV import");
    if (result.item) items.push(result.item);
    if (result.error) errors.push(result.error);
  });

  return { items, bundles: [], errors };
}

export function parseLibraryJson(text: string): LibraryImportResult {
  try {
    const parsed = JSON.parse(text) as unknown;
    const records = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { items?: unknown }).items)
        ? (parsed as { items: unknown[] }).items
        : null;
    if (!records) return { items: [], bundles: [], errors: ["JSON import must be an array or an object with an items array."] };

    const items: EstimateRowItem[] = [];
    const errors: string[] = [];
    records.forEach((record, index) => {
      if (typeof record !== "object" || record === null) {
        errors.push(`Row ${index + 1}: expected an object.`);
        return;
      }
      const result = normalizeImportRecord(record as Record<string, unknown>, index, "JSON import");
      if (result.item) items.push(result.item);
      if (result.error) errors.push(result.error);
    });
    const bundles = typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { bundles?: unknown }).bundles)
      ? normalizeImportedBundles((parsed as { bundles: unknown[] }).bundles)
      : [];
    return { items, bundles, errors };
  } catch {
    return { items: [], bundles: [], errors: ["JSON import could not be parsed."] };
  }
}

export function parseLibraryImportText(text: string, fileName: string): LibraryImportResult {
  return fileName.toLowerCase().endsWith(".json") ? parseLibraryJson(text) : parseLibraryCsv(text);
}

export function exportLibraryItemsToJson(items: EstimateRowItem[], bundles: LibraryBundle[] = []) {
  return JSON.stringify(
    {
      schema: "archestimator.component-library.v1",
      exportedAt: new Date().toISOString(),
      items,
      bundles,
    },
    null,
    2,
  );
}

const CSV_FORMULA_PREFIX_PATTERN = /^[\t\n\r ]*[=+\-@]/;

function escapeCsvFormulaCell(text: string) {
  return CSV_FORMULA_PREFIX_PATTERN.test(text) ? `'${text}` : text;
}

function csvCell(value: unknown) {
  const text = escapeCsvFormulaCell(Array.isArray(value) ? value.join(", ") : String(value ?? ""));
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

export function exportLibraryItemsToCsv(items: EstimateRowItem[]) {
  const headers = [
    "id",
    "material",
    "category",
    "unit",
    "itemCost",
    "quantity",
    "supplier",
    "discipline",
    "designation",
    "miscCost",
    "pricingSource",
    "pricingDate",
    "tags",
    "sku",
    "sourceUrl",
    "notes",
    "imageUrl",
  ];
  const rows = items.map((item) => [
    item.id,
    getComponentName(item),
    item.category,
    item.unit,
    getComponentPrice(item),
    item.quantity,
    item.supplier,
    getComponentDiscipline(item),
    getComponentDesignation(item),
    item.miscCost,
    item.pricingSource,
    item.pricingDate,
    item.tags ?? [],
    item.sku ?? "",
    item.sourceUrl ?? "",
    item.notes ?? "",
    item.imageUrl ?? "",
  ]);

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function normalizeImportedBundles(values: unknown[]) {
  return values
    .map((value, index): LibraryBundle | null => {
      if (typeof value !== "object" || value === null) return null;
      const record = value as Record<string, unknown>;
      const kind = record.kind === "template" ? "template" : record.kind === "assembly" ? "assembly" : null;
      const name = typeof record.name === "string" && record.name.trim() ? record.name.trim() : "";
      const entries = Array.isArray(record.items)
        ? record.items
            .map((entry): { itemId: string; quantity: number } | null => {
              if (typeof entry !== "object" || entry === null) return null;
              const itemId = firstString(entry as Record<string, unknown>, ["itemId", "item id", "id"]);
              if (!itemId) return null;
              return { itemId, quantity: Math.max(1, parseImportNumber((entry as Record<string, unknown>).quantity, 1)) };
            })
            .filter((entry): entry is { itemId: string; quantity: number } => Boolean(entry))
        : [];
      if (!kind || !name || !entries.length) return null;
      const tagsValue = record.tags;
      return {
        id: firstString(record, ["id"]) || `imported-bundle-${Date.now()}-${index}`,
        kind,
        name,
        description: firstString(record, ["description"]) || `Imported ${kind}.`,
        items: entries,
        tags: Array.isArray(tagsValue) ? tagsValue.map(String).filter(Boolean) : undefined,
        isCustom: true,
        createdAt: firstString(record, ["createdAt", "created at"]) || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    })
    .filter((bundle): bundle is LibraryBundle => Boolean(bundle));
}

function bundleItem(itemId: string, quantity: number) {
  return { itemId, quantity };
}

export function createDefaultLibraryBundles(items: EstimateRowItem[]): LibraryBundle[] {
  const byCategory = (category: string) => items.filter((item) => item.category.toLowerCase().includes(category)).slice(0, 4);
  const furniture = byCategory("furniture");
  const lighting = items.filter((item) => getComponentDiscipline(item) === "Electrical").slice(0, 4);
  const plumbing = items.filter((item) => getComponentDiscipline(item) === "Plumbing").slice(0, 4);
  const finishes = byCategory("finishes");

  const make = (kind: LibraryBundleKind, id: string, name: string, description: string, sourceItems: EstimateRowItem[], quantity = 1): LibraryBundle | null => {
    if (!sourceItems.length) return null;
    return {
      id,
      kind,
      name,
      description,
      items: sourceItems.map((item) => bundleItem(item.id, quantity)),
      tags: sourceItems.map((item) => item.category).filter(Boolean).slice(0, 3),
      createdAt: "2026-05-21T00:00:00.000Z",
    };
  };

  return [
    make("assembly", "assembly-loose-furniture", "Loose furniture set", "Starter furniture package for a room allowance.", furniture),
    make("assembly", "assembly-lighting-basic", "Basic lighting set", "Electrical lighting allowance with common fixtures.", lighting),
    make("assembly", "assembly-bath-fixtures", "Bath fixture set", "Plumbing fixture package for a bathroom area.", plumbing),
    make("template", "template-bedroom-starter", "Bedroom starter template", "Furniture and finish rows commonly needed for a bedroom.", [...furniture.slice(0, 3), ...finishes.slice(0, 2)]),
    make("template", "template-finish-check", "Finish check template", "Floor and wall finish rows for quick area takeoff.", finishes, 5),
  ].filter((bundle): bundle is LibraryBundle => Boolean(bundle));
}

export function expandLibraryBundle(bundle: LibraryBundle, items: EstimateRowItem[]) {
  return bundle.items
    .map((entry) => {
      const item = items.find((candidate) => candidate.id === entry.itemId);
      return item ? { ...item, quantity: Math.max(1, entry.quantity) } : null;
    })
    .filter((item): item is EstimateRowItem => Boolean(item));
}

export function getLibraryRowTotal(item: EstimateRowItem) {
  const subTotal = getComponentPrice(item) * Math.max(1, item.quantity || 1);
  return subTotal + (item.miscCost ?? 0) + (subTotal * (item.contingencyPercentage ?? 0)) / 100;
}

export function getLibraryBundleTotal(bundle: LibraryBundle, items: EstimateRowItem[]) {
  return expandLibraryBundle(bundle, items).reduce((total, item) => total + getLibraryRowTotal(item), 0);
}

export const defaultFilters: ComponentFilters = {
  categories: [],
  suppliers: [],
  disciplines: [],
  designations: [],
  units: [],
  minPrice: "",
  maxPrice: "",
  favoritesOnly: false,
  recentOnly: false,
  customOnly: false,
  imageState: "all",
  supplierState: "all",
};

export const defaultForm: NewComponentForm = {
  material: "",
  category: "",
  supplier: "",
  unit: "pc",
  itemCost: "",
  currency: "PHP",
  discipline: "Architectural",
  designation: "Floor",
  description: "",
  tags: "",
  imageUrl: "",
  miscCost: "0",
  sku: "",
  sourceUrl: "",
  notes: "",
};

export const LIBRARY_PREFS_KEY = "archestimator_component_library_preferences_v1";
export const LIBRARY_FAVORITES_KEY = "archestimator_component_library_favorites_v1";
export const LIBRARY_RECENTS_KEY = "archestimator_component_library_recents_v1";

export function readLibraryPreferences() {
  return readJsonStorage<{ viewMode?: "compact" | "detailed" | "grid"; groupBy?: LibraryGroupBy; sortMode?: LibrarySortMode }>(LIBRARY_PREFS_KEY, {});
}

export function getStalenessTone(pricingDate?: string): "success" | "warning" | "danger" | undefined {
  if (!pricingDate) return undefined;
  const elapsedDays = daysAgo(pricingDate);
  if (elapsedDays > 180) return "danger";
  if (elapsedDays > 90) return "warning";
  return "success";
}

export function getStalenessLabel(pricingDate?: string) {
  if (!pricingDate) return null;
  const elapsedDays = daysAgo(pricingDate);
  if (!Number.isFinite(elapsedDays)) return null;
  return elapsedDays > 30 ? `${elapsedDays}d ago` : "Recent";
}

export function isFormDirty(form: NewComponentForm) {
  return (Object.keys(defaultForm) as Array<keyof NewComponentForm>).some((key) => form[key] !== defaultForm[key]);
}
