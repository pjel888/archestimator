import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";

import type { ComponentLibraryManagerItem, ComponentLibraryManagerItemDraft, LibraryHealthIssue, LibraryPriceHealth } from "./types";

const REVIEW_THRESHOLD_DAYS = 90;

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysBetween(startValue: string, endValue: string) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

export function deriveHealth(
  item: ComponentLibraryManagerItemDraft,
  now: Date = new Date(),
): {
  health: LibraryPriceHealth;
  healthIssues: LibraryHealthIssue[];
} {
  const issues: LibraryHealthIssue[] = [];

  if (item.unitCost === null || item.unitCost === 0) issues.push("missing-price");
  if (!item.pricingSource?.trim()) issues.push("missing-source");
  if (!item.pricingDate?.trim()) issues.push("missing-date");
  if (item.confidence === "low" || !item.confidence?.trim()) issues.push("low-confidence");

  if (item.pricingDate && daysBetween(item.pricingDate, now.toISOString()) > REVIEW_THRESHOLD_DAYS) {
    issues.push("stale-price");
  }

  if (issues.includes("missing-price")) return { health: "missing", healthIssues: issues };
  if (issues.includes("missing-source") || issues.includes("missing-date")) return { health: "needs-review", healthIssues: issues };
  if (issues.includes("stale-price") || issues.includes("low-confidence")) return { health: "stale", healthIssues: issues };
  return { health: "current", healthIssues: issues };
}

export function adaptEstimateRowItemToManagerItem(item: EstimateRowItem, now?: Date): ComponentLibraryManagerItem {
  const rawSupplier = item.supplier?.trim() ? item.supplier : null;
  const draft: ComponentLibraryManagerItemDraft = {
    id: item.id,
    name: item.name?.trim() || item.material,
    kind: "material",
    category: item.category?.trim() || "Uncategorized",
    supplier: rawSupplier ?? "No supplier",
    rawSupplier,
    sku: item.sku,
    unit: item.unit?.trim() || "unit",
    unitCost: typeof item.price === "number" ? item.price : typeof item.itemCost === "number" ? item.itemCost : null,
    laborCost: typeof item.laborCost === "number" ? item.laborCost : null,
    supplementaryCost: typeof item.supplementaryCosts === "number" ? item.supplementaryCosts : null,
    pricingSource: item.pricingSource,
    pricingDate: item.pricingDate,
    confidence: item.confidence,
    description: item.description ?? "",
    thumbnailPath: item.imageUrl,
    updatedAt: item.updatedAt ?? item.createdAt,
    discipline: item.discipline,
    designation: item.designation,
    tags: item.tags,
    isCustom: item.isCustom ?? false,
    sourceUrl: item.sourceUrl,
    notes: item.notes,
  };
  const health = deriveHealth(draft, now);
  return { ...draft, ...health };
}
