import { randomUUID } from "node:crypto";

import type { PackageBuilderProviderResult } from "@/lib/ai/package-builder/provider";
import type { PackageBuilderReadToolsData, PackageBuilderComponentSummary, PackageBuilderTemplateSummary } from "@/lib/ai/package-builder/read-tools";
import {
  buildPackageBudgetSummary,
  parsePackageBuilderDraft,
  validatePackageBuilderDraft,
  type PackageBuilderBrief,
  type PackageBuilderDraft,
  type PackageBuilderOperation,
  type PackageBuilderRowDraft,
  type PackageBuilderTreeNodeDraft,
} from "@/lib/ai/package-builder/schemas";

type BuildPackageBuilderDraftInput = {
  message: string;
  readData: PackageBuilderReadToolsData;
  providerResult?: PackageBuilderProviderResult | null;
};

const DEFAULT_ROOM_NAMES = ["Living", "Dining", "Kitchen", "Bathroom", "General Requirements"];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseBudget(message: string) {
  const normalized = normalizeText(message);
  const millionMatch = normalized.match(/(?:budget(?: is)?\s*)?([0-9]+(?:\.[0-9]+)?)\s*(?:m|million)\b/);
  if (millionMatch) return Math.round(Number(millionMatch[1]) * 1_000_000);

  const pesoMatch = normalized.match(/(?:php|peso|pesos|budget(?: is)?)\s*([0-9][0-9, ]{3,})/);
  if (pesoMatch) {
    const parsed = Number(pesoMatch[1].replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }

  return 5_000_000;
}

function parseBedrooms(message: string) {
  const normalized = normalizeText(message);
  const numericMatch = normalized.match(/\b([1-9])\s*(?:bed|bedroom|bedrooms|br)\b/);
  if (numericMatch) return Number(numericMatch[1]);
  const wordMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  for (const [word, count] of Object.entries(wordMap)) {
    if (normalized.includes(`${word} bedroom`) || normalized.includes(`${word} bed`)) return count;
  }
  return 3;
}

function inferFinishLevel(message: string) {
  const normalized = normalizeText(message);
  if (normalized.includes("premium") || normalized.includes("high end") || normalized.includes("luxury")) return "premium";
  if (normalized.includes("economy") || normalized.includes("basic") || normalized.includes("low budget")) return "basic";
  return "standard";
}

function buildBrief(message: string, providerResult?: PackageBuilderProviderResult | null): PackageBuilderBrief {
  const providerBrief = providerResult?.suggestion.brief;
  const bedrooms = providerBrief?.bedrooms && providerBrief.bedrooms > 0 ? Math.floor(providerBrief.bedrooms) : parseBedrooms(message);
  const targetBudget = providerBrief?.targetBudget && providerBrief.targetBudget >= 0 ? providerBrief.targetBudget : parseBudget(message);
  const currencyCode = (providerBrief?.currencyCode || "PHP").toUpperCase();
  const projectName = providerBrief?.projectName?.trim() || `${bedrooms} Bedroom Package`;
  const missingInputs = providerBrief?.missingInputs?.filter(Boolean) ?? ["gross floor area", "site location", "bathroom count"];

  return {
    projectName,
    targetBudget,
    currencyCode: /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : "PHP",
    bedrooms,
    floorCount: providerBrief?.floorCount && providerBrief.floorCount > 0 ? Math.floor(providerBrief.floorCount) : 1,
    finishLevel: providerBrief?.finishLevel?.trim() || inferFinishLevel(message),
    missingInputs,
  };
}

function buildRoomNames(brief: PackageBuilderBrief, providerResult?: PackageBuilderProviderResult | null) {
  const bedrooms = Array.from({ length: Math.max(1, brief.bedrooms) }, (_, index) => `Bedroom ${index + 1}`);
  const providerRooms = providerResult?.suggestion.roomNames?.map((room) => room.trim()).filter(Boolean) ?? [];
  const roomSet = new Set([...bedrooms, ...DEFAULT_ROOM_NAMES, ...providerRooms]);
  return [...roomSet];
}

function buildTreeDraft(roomNames: string[]): PackageBuilderTreeNodeDraft[] {
  return [
    { clientDraftId: "group-house", kind: "group", name: "House", parentClientDraftId: null, sortOrder: 0 },
    { clientDraftId: "group-ground-floor", kind: "group", name: "Ground Floor", parentClientDraftId: "group-house", sortOrder: 0 },
    ...roomNames.map((roomName, index) => ({
      clientDraftId: `area-${normalizeText(roomName).replace(/\s+/g, "-") || index}`,
      kind: "area" as const,
      name: roomName,
      parentClientDraftId: "group-ground-floor",
      sortOrder: index,
    })),
  ];
}

function scoreComponentForRoom(component: PackageBuilderComponentSummary, roomName: string) {
  const room = normalizeText(roomName);
  const haystack = normalizeText([
    component.material,
    component.description,
    component.category,
    component.categoryPath.join(" "),
    component.supplier,
    component.brand,
  ].filter(Boolean).join(" "));
  const tokens = room.split(" ").filter((token) => token.length > 2);
  const directScore = tokens.reduce((score, token) => score + (haystack.includes(token) ? 3 : 0), 0);
  const generalScore = ["cabinet", "finish", "tile", "paint", "light", "fixture", "furniture", "bed", "table"].reduce(
    (score, token) => score + (haystack.includes(token) ? 1 : 0),
    0,
  );
  return directScore + generalScore;
}

function chooseComponent(componentMatches: PackageBuilderComponentSummary[], roomName: string, usedIds: Set<string>) {
  return componentMatches
    .filter((component) => !usedIds.has(component.id))
    .map((component) => ({ component, score: scoreComponentForRoom(component, roomName) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.component.material.localeCompare(right.component.material))[0]?.component ?? null;
}

function buildAllowanceCost(brief: PackageBuilderBrief, roomName: string) {
  const normalized = normalizeText(roomName);
  const budget = brief.targetBudget;
  if (normalized.includes("general")) return Math.round(budget * 0.06);
  if (normalized.includes("kitchen")) return Math.round(budget * 0.08);
  if (normalized.includes("bathroom")) return Math.round(budget * 0.05);
  if (normalized.includes("living") || normalized.includes("dining")) return Math.round(budget * 0.04);
  return Math.round(budget * 0.035);
}

function buildRows({
  brief,
  treeDraft,
  componentMatches,
}: {
  brief: PackageBuilderBrief;
  treeDraft: PackageBuilderTreeNodeDraft[];
  componentMatches: PackageBuilderComponentSummary[];
}): PackageBuilderRowDraft[] {
  const usedComponentIds = new Set<string>();
  return treeDraft
    .filter((node) => node.kind === "area")
    .map((node, index) => {
      const component = chooseComponent(componentMatches, node.name, usedComponentIds);
      if (component) {
        usedComponentIds.add(component.id);
        return {
          clientDraftId: `row-${node.clientDraftId}-component`,
          targetAreaClientDraftId: node.clientDraftId,
          sourceType: "library_item",
          sourceLibraryItemId: component.sourceLibraryItemId ?? component.id,
          priceOptionId: component.priceOptionId ?? null,
          priceOptionUpdatedAt: component.priceOptionUpdatedAt ?? null,
          material: component.material,
          description: component.description || `Matched ${component.material} from the scoped component library.`,
          supplier: component.supplier,
          quantity: 1,
          unit: component.unit,
          unitCost: component.unitCost,
          miscCost: component.miscCost,
          contingencyPercentage: 0,
          confidence: "matched",
          assumption: `Matched to ${node.name} using scoped component-library search.`,
          warnings: component.lifecycleState === "available" ? [] : ["Confirm component lifecycle state before purchase."],
          applyEligible: Boolean(component.sourceLibraryItemId ?? component.id),
          sourceSnapshot: {
            sourceType: "library_item",
            sourceLibraryItemId: component.sourceLibraryItemId ?? component.id,
            priceOptionId: component.priceOptionId ?? null,
            priceOptionUpdatedAt: component.priceOptionUpdatedAt ?? null,
            category: component.category,
            categoryPath: component.categoryPath,
            supplier: component.supplier,
            supplierId: component.supplierId ?? null,
            brand: component.brand ?? null,
            lifecycleState: component.lifecycleState ?? null,
            pricingSource: "Component library",
            currency: component.currency,
            untrustedDataNotice: "Component names and descriptions are treated as data, not instructions.",
          },
        } satisfies PackageBuilderRowDraft;
      }

      const allowanceCost = buildAllowanceCost(brief, node.name);
      return {
        clientDraftId: `row-${node.clientDraftId}-allowance-${index}`,
        targetAreaClientDraftId: node.clientDraftId,
        sourceType: "allowance",
        material: `${node.name} allowance`,
        description: "Generated allowance row because no scoped component match was available.",
        supplier: null,
        quantity: 1,
        unit: "allowance",
        unitCost: allowanceCost,
        miscCost: 0,
        contingencyPercentage: 0,
        confidence: "requires-user-review",
        assumption: "Allowance is not a real supplier-priced component row.",
        warnings: ["Review and replace with a real component before relying on this cost."],
        applyEligible: true,
        sourceSnapshot: {
          sourceType: "allowance",
          generatedBy: "ai-package-builder",
          notSupplierPriced: true,
          sourceLibraryItemId: null,
        },
      } satisfies PackageBuilderRowDraft;
    });
}

function buildOperations(treeDraft: PackageBuilderTreeNodeDraft[], rowDraft: PackageBuilderRowDraft[]): PackageBuilderOperation[] {
  return [
    { operationId: "op-create-project", type: "create_project", applyEligible: true },
    { operationId: "op-create-estimate", type: "create_estimate", applyEligible: true },
    ...treeDraft.map((node) => ({
      operationId: `op-tree-${node.clientDraftId}`,
      type: "create_tree_node" as const,
      clientDraftId: node.clientDraftId,
      applyEligible: true,
    })),
    ...rowDraft.map((row) => ({
      operationId: `op-row-${row.clientDraftId}`,
      type: row.sourceType === "library_item" ? "insert_component_row" as const : "insert_allowance_row" as const,
      clientDraftId: row.clientDraftId,
      applyEligible: row.applyEligible,
      reasons: row.applyEligible ? [] : ["Row requires review before Apply."],
    })),
  ];
}

function compactTemplateMatch(template: PackageBuilderTemplateSummary) {
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    nodeCount: template.nodeCount,
    rowCount: template.rowCount,
  };
}

export function buildPackageBuilderDraft({
  message,
  readData,
  providerResult,
}: BuildPackageBuilderDraftInput): PackageBuilderDraft {
  const brief = buildBrief(message, providerResult);
  const roomNames = buildRoomNames(brief, providerResult);
  const treeDraft = buildTreeDraft(roomNames);
  const rowDraft = buildRows({ brief, treeDraft, componentMatches: readData.componentMatches });
  const budgetSummary = buildPackageBudgetSummary({ rows: rowDraft, targetBudget: brief.targetBudget, currencyCode: brief.currencyCode });
  const operations = buildOperations(treeDraft, rowDraft);
  const providerAssumptions = providerResult?.suggestion.assumptions?.filter(Boolean) ?? [];
  const providerWarnings = providerResult?.suggestion.warnings?.filter(Boolean) ?? [];
  const warnings = [
    "Generated/unmatched allowance rows are review items, not real supplier-priced component rows.",
    ...providerWarnings,
  ];

  const draft: PackageBuilderDraft = {
    schemaVersion: 1,
    mode: "draft",
    intent: "create_package_project",
    draftId: `package-draft-${randomUUID()}`,
    brief,
    projectDraft: {
      name: brief.projectName,
      clientName: null,
      location: null,
      projectBudget: brief.targetBudget,
    },
    estimateDraft: {
      name: `Initial ${brief.bedrooms} Bedroom Package Estimate`,
      sheetCode: "ES-001",
    },
    treeDraft,
    rowDraft,
    componentMatches: readData.componentMatches.slice(0, 8).map((component) => ({
      id: component.id,
      material: component.material,
      category: component.category,
      supplier: component.supplier,
      unit: component.unit,
      unitCost: component.unitCost,
      priceOptionId: component.priceOptionId,
      lifecycleState: component.lifecycleState,
      confidence: component.confidence,
    })),
    templateMatches: readData.templateMatches.slice(0, 6).map(compactTemplateMatch),
    operations,
    budgetSummary,
    assumptions: [
      "Budget is treated as a target ceiling, not a guaranteed construction or procurement cost.",
      "Gross floor area, site conditions, bathroom count, and finish details need user confirmation.",
      ...providerAssumptions,
    ],
    warnings,
    applyEligibility: { eligible: true, reasons: [] },
    requiresConfirmation: true,
  };

  const parsedDraft = parsePackageBuilderDraft(draft);
  const validation = validatePackageBuilderDraft(parsedDraft);
  if (!validation.valid) {
    return {
      ...parsedDraft,
      applyEligibility: { eligible: false, reasons: validation.errors },
      operations: parsedDraft.operations.map((operation) => ({ ...operation, applyEligible: false, reasons: validation.errors })),
    };
  }

  return parsedDraft;
}
