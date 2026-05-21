import type {
  ComponentLibraryManagerItem,
  LibraryItemKind,
  LibraryPriceHealth,
  ManagerFacetValue,
  ManagerFacets,
  ManagerFilters,
  ManagerGroupBy,
  ManagerSortBy,
} from "./types";

export const pesoFormatter = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const healthLabelMap: Record<LibraryPriceHealth, string> = {
  current: "Current",
  "needs-review": "Needs review",
  stale: "Stale",
  missing: "Missing",
};

const kindLabelMap: Record<LibraryItemKind, string> = {
  material: "Material",
  labor: "Labor",
  equipment: "Equipment",
  subcontract: "Subcontract",
  assembly: "Assembly",
  allowance: "Allowance",
};

export function getHealthLabel(health: LibraryPriceHealth) {
  return healthLabelMap[health];
}

export function getKindLabel(kind: LibraryItemKind | string) {
  return kindLabelMap[kind as LibraryItemKind] ?? kind;
}

export function formatMoney(value: number | null) {
  return value === null ? "-" : pesoFormatter.format(value);
}

export function formatCompactDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function includesQuery(value: unknown, query: string) {
  return normalized(value).includes(query);
}

function scoreItem(item: ComponentLibraryManagerItem, query: string) {
  if (!query) return 1;
  const name = normalized(item.name);
  if (name === query) return 100;
  if (name.startsWith(query)) return 85;
  if (name.includes(query)) return 70;
  if ([item.supplier, item.rawSupplier, item.category].some((value) => includesQuery(value, query))) return 55;
  if ([item.brand, item.sku, item.unit, item.discipline, item.designation].some((value) => includesQuery(value, query))) return 40;
  if ([item.description, item.pricingSource, item.notes, ...(item.tags ?? [])].some((value) => includesQuery(value, query))) return 25;
  return 0;
}

export function searchManagerItems(items: ComponentLibraryManagerItem[], query: string) {
  const q = normalized(query);
  if (!q) return [...items];
  return items
    .map((item) => ({ item, score: scoreItem(item, q) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map((result) => result.item);
}

function matchesAny<T extends string>(value: T, selected: T[]) {
  return selected.length === 0 || selected.includes(value);
}

export function filterManagerItems(items: ComponentLibraryManagerItem[], filters: ManagerFilters) {
  return items.filter((item) => {
    if (filters.status === "needs-review" && item.health === "current") return false;
    if (filters.status === "missing-price" && !item.healthIssues.includes("missing-price")) return false;
    if (filters.status === "missing-source" && !item.healthIssues.includes("missing-source")) return false;
    if (!matchesAny(item.category, filters.categories)) return false;
    if (!matchesAny(item.supplier, filters.suppliers)) return false;
    if (!matchesAny(item.kind, filters.kinds)) return false;
    if (!matchesAny(item.unit, filters.units)) return false;
    if (!matchesAny(item.health, filters.health)) return false;
    return true;
  });
}

export function sortManagerItems(items: ComponentLibraryManagerItem[], sortBy: ManagerSortBy) {
  return [...items].sort((a, b) => {
    if (sortBy === "category") return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
    if (sortBy === "supplier") return a.supplier.localeCompare(b.supplier) || a.name.localeCompare(b.name);
    if (sortBy === "unitCostAsc") return (a.unitCost ?? Number.POSITIVE_INFINITY) - (b.unitCost ?? Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name);
    if (sortBy === "unitCostDesc") return (b.unitCost ?? Number.NEGATIVE_INFINITY) - (a.unitCost ?? Number.NEGATIVE_INFINITY) || a.name.localeCompare(b.name);
    if (sortBy === "pricingDate") return normalized(b.pricingDate).localeCompare(normalized(a.pricingDate)) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}

export function groupManagerItems(items: ComponentLibraryManagerItem[], groupBy: ManagerGroupBy): [string, ComponentLibraryManagerItem[]][] {
  if (groupBy === "none") return [["All components", items]];
  const groups = new Map<string, ComponentLibraryManagerItem[]>();
  for (const item of items) {
    const key = groupBy === "category" ? item.category : groupBy === "supplier" ? item.supplier : groupBy === "kind" ? getKindLabel(item.kind) : getHealthLabel(item.health);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function countBy<T extends string>(items: ComponentLibraryManagerItem[], getValue: (item: ComponentLibraryManagerItem) => T) {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(getValue(item), (counts.get(getValue(item)) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]): ManagerFacetValue => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function getManagerFacets(items: ComponentLibraryManagerItem[]): ManagerFacets {
  return {
    total: items.length,
    needsReview: items.filter((item) => item.health !== "current").length,
    missingPrice: items.filter((item) => item.healthIssues.includes("missing-price")).length,
    missingSource: items.filter((item) => item.healthIssues.includes("missing-source")).length,
    categories: countBy(items, (item) => item.category),
    suppliers: countBy(items, (item) => item.supplier),
    kinds: countBy(items, (item) => item.kind),
    units: countBy(items, (item) => item.unit),
    health: countBy(items, (item) => item.health),
  };
}
