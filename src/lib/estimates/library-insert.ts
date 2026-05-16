import { nanoid } from "nanoid";
import type { CostLibraryItem, EstimateLineItem } from "@/lib/local-data/schemas";

export function createLineItemFromLibraryItem(
  item: CostLibraryItem,
  sectionId: string,
  proposalSectionId?: string,
): EstimateLineItem {
  return {
    id: `line_${nanoid(10)}`,
    sectionId,
    proposalSectionId,
    itemName: item.name,
    description: item.source ? `From ${item.source}` : undefined,
    quantity: 1,
    unit: item.unit,
    materialUnitCost: item.itemType === "labor" ? undefined : item.defaultUnitCost,
    laborUnitCost: item.itemType === "labor" ? item.defaultUnitCost : item.defaultLaborUnitCost,
    scopeStatus: "included",
    sourceLibraryItemId: item.id,
    linkState: "linked-clean",
    pricingDate: item.pricingDate,
    wastePercent: item.defaultWastePercent,
  };
}

export function detectLinkStateAfterEdit(
  line: EstimateLineItem,
  changedField: keyof EstimateLineItem,
): EstimateLineItem["linkState"] {
  if (!line.sourceLibraryItemId) return "manual";
  if (line.linkState === "detached" || line.linkState === "source-changed") return line.linkState;

  const fieldsThatOverrideLibrary = new Set<keyof EstimateLineItem>([
    "itemName",
    "unit",
    "unitCost",
    "materialUnitCost",
    "laborUnitCost",
    "pricingDate",
  ]);

  if (fieldsThatOverrideLibrary.has(changedField)) return "linked-overridden";
  return line.linkState;
}
