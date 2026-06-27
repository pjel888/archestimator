import { randomUUID } from "node:crypto";

import type { PackageBuilderProviderResult } from "@/lib/ai/package-builder/provider";
import type {
  PackageBuilderReadToolsData,
  PackageBuilderCompactAreaRow,
  PackageBuilderCompactTreeNode,
  PackageBuilderComparableEstimatePackage,
  PackageBuilderComparablePackageArea,
  PackageBuilderComparablePackageRowPreview,
  PackageBuilderComponentSummary,
  PackageBuilderHistoricalRowMatch,
  PackageBuilderTemplateSummary,
  PackageBuilderTemplateRowPreview,
} from "@/lib/ai/package-builder/read-tools";
import type { PackageBuilderMemoryPreferences } from "@/lib/ai/package-builder/memory";
import {
  buildPackageBudgetSummary,
  parsePackageBuilderDraft,
  validatePackageBuilderDraft,
  type PackageBuilderBrief,
  type PackageBuilderDraft,
  type PackageBuilderOperation,
  type PackageBuilderTarget,
  type PackageBuilderComponentCreateDraft,
  type PackageBuilderNodeRenameDraft,
  type PackageBuilderRowDraft,
  type PackageBuilderRowDeleteDraft,
  type PackageBuilderRowReplacementDraft,
  type PackageBuilderTemplateInsertDraft,
  type PackageBuilderTemplateRowCopyDraft,
  type PackageBuilderRowUpdateDraft,
  type PackageBuilderTreeNodeDraft,
} from "@/lib/ai/package-builder/schemas";
import { filterMap, filterMapBy } from "@/lib/util/array";

type BuildPackageBuilderDraftInput = {
  message: string;
  readData: PackageBuilderReadToolsData;
  providerResult?: PackageBuilderProviderResult | null;
  baseDraft?: PackageBuilderDraft | null;
};

const DEFAULT_ROOM_NAMES = ["Living", "Dining", "Kitchen", "Bathroom", "General Requirements"];
const MAX_PROVIDER_SEARCH_TERM_HINTS = 8;
const MAX_GENERIC_ROOM_COMPONENT_ROWS = 3;

type RoomComponentNeed = {
  id: string;
  searchTerms: string[];
  allowanceMaterial: string;
  allowanceDescription: string;
  costRatio: number;
  allowReuse: boolean;
  sourceOnly?: boolean;
};

type TemplateRowNeedMatch = {
  template: PackageBuilderTemplateSummary;
  row: PackageBuilderTemplateRowPreview;
  templateIndex: number;
  rowIndex: number;
};

type ComparableRowNeedMatch = {
  packageMatch: PackageBuilderComparableEstimatePackage;
  area: PackageBuilderComparablePackageArea;
  row: PackageBuilderComparablePackageRowPreview;
  packageIndex: number;
  areaIndex: number;
  rowIndex: number;
};

const MAX_TEMPLATE_ROW_PREVIEWS_PER_AREA = 3;
const MAX_COMPARABLE_PACKAGE_ROOMS = 24;
const MAX_COMPARABLE_ROW_PREVIEWS_PER_AREA = 3;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeRoomName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function buildComponentSearchHaystack(component: PackageBuilderComponentSummary) {
  return normalizeText([
    component.material,
    component.description,
    component.category,
    component.categoryPath.join(" "),
    component.supplier,
    component.brand,
  ].filter(Boolean).join(" "));
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
  const wordMatch = normalized.match(/\b(one|two|three|four|five)\s+(?:bed|bedroom|bedrooms)\b/);
  if (wordMatch) {
    const wordCounts: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    return wordCounts[wordMatch[1]] ?? 3;
  }
  return 3;
}

function isCondoUnitRequest(message: string) {
  const normalized = normalizeText(message);
  return /\b(condo|condominium|unit|apartment|flat)\b/.test(normalized);
}

function isFillCurrentEstimateRequest(message: string) {
  const normalized = normalizeText(message);
  return /\b(fill|populate|complete)\b.*\b(this|current|estimate|sheet)\b/.test(normalized)
    || /\b(add|insert)\b.*\b(rows?|components?|items?)\b.*\b(this|current|estimate|sheet)\b/.test(normalized);
}

function isLibraryComponentCreateRequest(message: string) {
  const normalized = normalizeText(message);
  const hasCreateVerb = /\b(add|create|draft|make|save)\b/.test(normalized);
  const namesComponent = /\b(component|item|material|product)\b/.test(normalized);
  const targetsLibrary = /\b(library|catalog|cost library|component library)\b/.test(normalized)
    || /\bto my library\b/.test(normalized);
  return hasCreateVerb && namesComponent && targetsLibrary;
}

function isUpdateCurrentEstimateRequest(message: string) {
  const normalized = normalizeText(message);
  if (/\b(set up|setup)\b/.test(normalized)) return false;
  return /\b(change|update|adjust|revise|set)\b/.test(normalized)
    && /\b(row|item|quantity|misc cost|contingency|current|estimate|sheet)\b/.test(normalized);
}

function isReplaceCurrentEstimateRequest(message: string) {
  const normalized = normalizeText(message);
  return /\b(replace|swap|switch)\b/.test(normalized)
    && /\b(row|item|component|library|current|estimate|sheet)\b/.test(normalized);
}

function isDeleteCurrentEstimateRequest(message: string) {
  const normalized = normalizeText(message);
  return /\b(delete|remove)\b/.test(normalized)
    && /\b(row|item|component|current|estimate|sheet)\b/.test(normalized);
}

function isRenameCurrentEstimateNodeRequest(message: string) {
  const normalized = normalizeText(message);
  return /\b(rename)\b/.test(normalized)
    && /\b(area|room|node|group|space|section|bedroom|toilet|bath|kitchen|living|dining|current|selected)\b/.test(normalized);
}

function isTemplateInsertCurrentEstimateRequest(message: string) {
  if (isTemplateRowCopyCurrentEstimateRequest(message)) return false;
  const normalized = normalizeText(message);
  return /\b(insert|add|apply|copy|use)\b/.test(normalized)
    && /\b(template|templates|reusable estimate|starter)\b/.test(normalized)
    && /\b(this|current|estimate|sheet)\b/.test(normalized);
}

function isTemplateRowCopyCurrentEstimateRequest(message: string) {
  const normalized = normalizeText(message);
  return /\b(copy|use|add|insert)\b/.test(normalized)
    && /\b(template|templates|starter)\b/.test(normalized)
    && /\b(rows?|items?|lines?|finish|components?)\b/.test(normalized)
    && /\b(this|current|estimate|sheet)\b/.test(normalized);
}

function inferProjectName(message: string, bedrooms: number) {
  if (isCondoUnitRequest(message)) return `${bedrooms} Bedroom Condo Unit`;
  return `${bedrooms} Bedroom Package`;
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
  const projectName = providerBrief?.projectName?.trim() || inferProjectName(message, bedrooms);
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

function buildBedroomRoomNames(brief: PackageBuilderBrief, message: string) {
  if (isCondoUnitRequest(message) && brief.bedrooms >= 2) {
    return [
      "Master Bedroom",
      ...Array.from({ length: brief.bedrooms - 1 }, (_, index) => `Bedroom ${index + 2}`),
    ];
  }
  return Array.from({ length: Math.max(1, brief.bedrooms) }, (_, index) => `Bedroom ${index + 1}`);
}

function buildBathroomRoomNames(brief: PackageBuilderBrief, message: string) {
  if (!isCondoUnitRequest(message)) return [];
  if (brief.bedrooms <= 1) return ["Toilet & Bath"];
  return ["Master Toilet & Bath", "Common Toilet & Bath"];
}

function buildTemplateRoomNames(templateMatches: PackageBuilderTemplateSummary[]) {
  return templateMatches
    .slice(0, 3)
    .flatMap((template) => template.areaNames)
    .slice(0, 24);
}

function buildComparableRoomNames(comparablePackages: PackageBuilderComparableEstimatePackage[]) {
  return comparablePackages
    .slice(0, 3)
    .flatMap((packageMatch) => packageMatch.areas.map((area) => area.areaName))
    .slice(0, MAX_COMPARABLE_PACKAGE_ROOMS);
}

function buildTemplateAssumptions(templateMatches: PackageBuilderTemplateSummary[]) {
  return templateMatches
    .filter((template) => template.areaNames.length > 0)
    .slice(0, 3)
    .map((template) => `Used matched estimate template areas from ${template.name} as draft structure hints.`);
}

function buildRoomNames(
  brief: PackageBuilderBrief,
  message: string,
  templateMatches: PackageBuilderTemplateSummary[],
  comparablePackages: PackageBuilderComparableEstimatePackage[],
  providerResult?: PackageBuilderProviderResult | null,
) {
  const bedrooms = buildBedroomRoomNames(brief, message);
  const bathrooms = buildBathroomRoomNames(brief, message);
  const templateRooms = buildTemplateRoomNames(templateMatches);
  const comparableRooms = buildComparableRoomNames(comparablePackages);
  const filteredPatternRooms = [...templateRooms, ...comparableRooms].filter((roomName) => {
    const roomId = normalizeText(roomName);
    if (bedrooms.length > 0 && roomId === "bedroom") return false;
    if (bathrooms.length > 0 && ["toilet bath", "bathroom", "bath"].includes(roomId)) return false;
    return true;
  });
  const providerRooms = providerResult?.suggestion.roomNames?.flatMap((room) => {
    const trimmed = room.trim();
    return trimmed ? [trimmed] : [];
  }) ?? [];
  const rooms: string[] = [];
  const seenRoomIds = new Set<string>();
  for (const roomName of [
    ...bedrooms,
    ...bathrooms,
    ...filteredPatternRooms,
    ...DEFAULT_ROOM_NAMES.filter((room) => room !== "Bathroom" || bathrooms.length === 0),
    ...providerRooms,
  ]) {
    const room = normalizeRoomName(roomName);
    const roomId = normalizeText(room);
    if (!roomId || seenRoomIds.has(roomId)) continue;
    seenRoomIds.add(roomId);
    rooms.push(room);
  }
  return rooms;
}

function buildTreeDraft(roomNames: string[]): PackageBuilderTreeNodeDraft[] {
  return [
    { clientDraftId: "group-house", kind: "group", name: "House", parentClientDraftId: null, sortOrder: 0 },
    { clientDraftId: "group-ground-floor", kind: "group", name: "Ground Floor", parentClientDraftId: "group-house", sortOrder: 0 },
    ...roomNames.map((roomName, index) => ({
      clientDraftId: roomClientDraftId(roomName, index),
      kind: "area" as const,
      name: roomName,
      parentClientDraftId: "group-ground-floor",
      sortOrder: index,
    })),
  ];
}

function roomClientDraftId(roomName: string, fallbackIndex: number) {
  return `area-${normalizeText(roomName).replace(/\s+/g, "-") || fallbackIndex}`;
}

function buildCurrentEstimateTargetTree(readData: PackageBuilderReadToolsData, roomNames: string[]): {
  treeDraft: PackageBuilderTreeNodeDraft[];
  target: PackageBuilderTarget | null;
  blockedReason: string | null;
} | null {
  if (!readData.projectSummary || !readData.estimateSummary) return null;

  const areaNodes = readData.estimateTree.filter((node) => node.kind === "area").slice(0, 24);
  const rootNode = readData.estimateTree.find((node) => node.kind === "group") ?? null;
  const nodeIdsByClientDraftId: Record<string, string> = {};
  if (rootNode) nodeIdsByClientDraftId["existing-estimate-root"] = rootNode.id;

  const areaNodeIdsByClientDraftId: Record<string, string> = {};
  const areaDrafts = areaNodes.map((node, index) => {
    const clientDraftId = `existing-area-${index + 1}`;
    areaNodeIdsByClientDraftId[clientDraftId] = node.id;
    nodeIdsByClientDraftId[clientDraftId] = node.id;
    return {
      clientDraftId,
      kind: "area" as const,
      name: node.name,
      parentClientDraftId: "existing-estimate-root",
      sortOrder: index,
    };
  });
  const existingAreaNames = new Set(areaNodes.flatMap((node) => {
    const normalizedName = normalizeText(node.name);
    return normalizedName ? [normalizedName] : [];
  }));
  const generatedAreaDrafts: PackageBuilderTreeNodeDraft[] = [];
  for (const roomName of roomNames) {
    const roomId = normalizeText(roomName);
    if (!roomId || existingAreaNames.has(roomId)) continue;
    const index = generatedAreaDrafts.length;
    generatedAreaDrafts.push({
      clientDraftId: roomClientDraftId(roomName, areaDrafts.length + index),
      kind: "area",
      name: roomName,
      parentClientDraftId: "existing-estimate-root",
      sortOrder: areaDrafts.length + index,
    });
  }

  return {
    treeDraft: [
      {
        clientDraftId: "existing-estimate-root",
        kind: "group",
        name: rootNode?.name ?? readData.estimateSummary.name,
        parentClientDraftId: null,
        sortOrder: 0,
      },
      ...areaDrafts,
      ...generatedAreaDrafts,
    ],
    target: {
      projectId: readData.projectSummary.id,
      estimateId: readData.estimateSummary.id,
      selectedNodeId: readData.estimateSummary.firstNodeId,
      activeTabId: readData.estimateSummary.activeTabId ?? null,
      nodeIdsByClientDraftId,
      areaNodeIdsByClientDraftId,
    },
    blockedReason: !rootNode && generatedAreaDrafts.length > 0
      ? "Current estimate needs at least one Group Node before Ask Flip can create Area Nodes."
      : null,
  };
}

function scoreComponentForRoom(component: PackageBuilderComponentSummary, roomName: string) {
  const room = normalizeText(roomName);
  const haystack = buildComponentSearchHaystack(component);
  const tokens = room.split(" ").filter((token) => token.length > 2);
  const directScore = tokens.reduce((score, token) => score + (haystack.includes(token) ? 3 : 0), 0);
  const generalScore = ["cabinet", "finish", "tile", "paint", "light", "fixture", "furniture", "bed", "table"].reduce(
    (score, token) => score + (haystack.includes(token) ? 1 : 0),
    0,
  );
  return directScore + generalScore;
}

function normalizeProviderSearchTermHints(providerResult?: PackageBuilderProviderResult | null) {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const rawTerm of providerResult?.suggestion.searchTerms ?? []) {
    const term = normalizeText(rawTerm).slice(0, 80);
    if (term.length < 3 || seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
    if (terms.length >= MAX_PROVIDER_SEARCH_TERM_HINTS) break;
  }
  return terms;
}

function scoreProviderSearchTermHints(component: PackageBuilderComponentSummary, searchTermHints: string[]) {
  if (searchTermHints.length === 0) return 0;
  const haystack = buildComponentSearchHaystack(component);
  return searchTermHints.reduce((score, term) => score + (haystack.includes(term) ? 6 : 0), 0);
}

function getGenericRoomComponentTerms(roomName: string) {
  const normalized = normalizeText(roomName);
  if (normalized.includes("living")) {
    return ["living", "sofa", "couch", "lounge", "media console", "tv console", "console"];
  }
  if (normalized.includes("dining")) {
    return ["dining", "dining table", "table", "chair", "pendant", "light"];
  }
  return [];
}

function matchesGenericRoomComponentTerms(component: PackageBuilderComponentSummary, terms: string[]) {
  if (terms.length === 0) return false;
  const haystack = buildComponentSearchHaystack(component);
  return terms.some((term) => haystack.includes(normalizeText(term)));
}

function memoryRoomMatchesRoom(signalRoomName: string | null, roomName: string) {
  if (!signalRoomName) return true;
  const signalRoom = normalizeText(signalRoomName);
  const room = normalizeText(roomName);
  if (!signalRoom || !room) return true;
  if (signalRoom === room || signalRoom.includes(room) || room.includes(signalRoom)) return true;
  return ["bedroom", "toilet", "bath", "bathroom", "living", "dining", "kitchen", "general"].some((token) =>
    signalRoom.includes(token) && room.includes(token)
  );
}

function historicalUsageRoomMatchesRoom(historicalRoomName: string | null, roomName: string) {
  if (!historicalRoomName) return false;
  return memoryRoomMatchesRoom(historicalRoomName, roomName);
}

function scoreComponentMemoryPreference(
  component: PackageBuilderComponentSummary,
  roomName: string,
  memoryPreferences?: PackageBuilderMemoryPreferences,
) {
  const componentIds = new Set(
    [component.id, component.sourceLibraryItemId].filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  return (memoryPreferences?.componentSignals ?? []).reduce((score, signal) => {
    if (!componentIds.has(signal.sourceLibraryItemId)) return score;
    if (!memoryRoomMatchesRoom(signal.roomName, roomName)) return score;
    return score + signal.score;
  }, 0);
}

function getComponentSourceIds(component: PackageBuilderComponentSummary) {
  return new Set(
    [component.id, component.sourceLibraryItemId].filter((value): value is string => typeof value === "string" && value.length > 0),
  );
}

function scorePriorProjectComponentUsage({
  component,
  roomName,
  historicalRows,
  need,
}: {
  component: PackageBuilderComponentSummary;
  roomName: string;
  historicalRows: PackageBuilderHistoricalRowMatch[];
  need?: RoomComponentNeed;
}) {
  const componentIds = getComponentSourceIds(component);
  return historicalRows.reduce((score, row) => {
    if (!row.sourceLibraryItemId || !componentIds.has(row.sourceLibraryItemId)) return score;
    if (!historicalUsageRoomMatchesRoom(row.areaName, roomName)) return score;
    const haystack = normalizeText([
      row.projectName,
      row.estimateName,
      row.areaName,
      row.material,
      row.description,
      row.supplier,
    ].filter(Boolean).join(" "));
    const needScore = need
      ? need.searchTerms.reduce((sum, term) => sum + (haystack.includes(normalizeText(term)) ? 2 : 0), 0)
      : 0;
    return score + 8 + needScore;
  }, 0);
}

function chooseComponentsForGenericRoom(
  componentMatches: PackageBuilderComponentSummary[],
  roomName: string,
  usedIds: Set<string>,
  searchTermHints: string[],
  historicalRows: PackageBuilderHistoricalRowMatch[],
  memoryPreferences?: PackageBuilderMemoryPreferences,
) {
  const terms = getGenericRoomComponentTerms(roomName);
  if (terms.length === 0) return [];
  const scoredComponents = filterMap(componentMatches, (component) => {
    if (usedIds.has(component.id) || !matchesGenericRoomComponentTerms(component, terms)) return null;
    const score = scoreComponentForRoom(component, roomName)
      + scoreProviderSearchTermHints(component, searchTermHints)
      + scorePriorProjectComponentUsage({ component, roomName, historicalRows })
      + scoreComponentMemoryPreference(component, roomName, memoryPreferences);
    return score > 0 ? {
      component,
      score,
    } : null;
  }).sort((left, right) => right.score - left.score || left.component.material.localeCompare(right.component.material));
  return scoredComponents.slice(0, MAX_GENERIC_ROOM_COMPONENT_ROWS).map(({ component }) => component);
}

function scoreComponentForNeed(
  component: PackageBuilderComponentSummary,
  roomName: string,
  need: RoomComponentNeed,
  historicalRows: PackageBuilderHistoricalRowMatch[],
  memoryPreferences?: PackageBuilderMemoryPreferences,
) {
  const haystack = buildComponentSearchHaystack(component);
  const needScore = need.searchTerms.reduce((score, term) => score + (haystack.includes(normalizeText(term)) ? 4 : 0), 0);
  if (needScore === 0) return 0;
  return needScore
    + scoreComponentForRoom(component, roomName)
    + scorePriorProjectComponentUsage({ component, roomName, historicalRows, need })
    + scoreComponentMemoryPreference(component, roomName, memoryPreferences);
}

function chooseComponentForNeed(
  componentMatches: PackageBuilderComponentSummary[],
  roomName: string,
  usedIds: Set<string>,
  need: RoomComponentNeed,
  historicalRows: PackageBuilderHistoricalRowMatch[],
  memoryPreferences?: PackageBuilderMemoryPreferences,
) {
  return filterMap(componentMatches, (component) => {
    if (!need.allowReuse && usedIds.has(component.id)) return null;
    const score = scoreComponentForNeed(component, roomName, need, historicalRows, memoryPreferences);
    return score > 0 ? { component, score } : null;
  })
    .sort((left, right) => right.score - left.score || left.component.material.localeCompare(right.component.material))[0]?.component ?? null;
}

function scoreHistoricalRowForNeed(row: PackageBuilderHistoricalRowMatch, roomName: string, need: RoomComponentNeed) {
  const haystack = normalizeText([
    row.projectName,
    row.estimateName,
    row.areaName,
    row.material,
    row.description,
    row.supplier,
  ].filter(Boolean).join(" "));
  const needScore = need.searchTerms.reduce((score, term) => score + (haystack.includes(normalizeText(term)) ? 4 : 0), 0);
  if (needScore === 0) return 0;
  const roomTokens = normalizeText(roomName).split(" ").filter((token) => token.length > 2);
  const roomScore = roomTokens.reduce((score, token) => score + (haystack.includes(token) ? 2 : 0), 0);
  return needScore + roomScore;
}

function chooseHistoricalRowForNeed(
  historicalRows: PackageBuilderHistoricalRowMatch[],
  roomName: string,
  need: RoomComponentNeed,
) {
  return filterMap(historicalRows, (row) => {
    const score = scoreHistoricalRowForNeed(row, roomName, need);
    return score > 0 ? { row, score } : null;
  })
    .sort((left, right) => right.score - left.score || right.row.updatedAt.localeCompare(left.row.updatedAt) || left.row.material.localeCompare(right.row.material))[0]?.row ?? null;
}

function scoreHistoricalRowForRoom(row: PackageBuilderHistoricalRowMatch, roomName: string) {
  const haystack = normalizeText([
    row.projectName,
    row.estimateName,
    row.areaName,
    row.material,
    row.description,
    row.supplier,
  ].filter(Boolean).join(" "));
  const roomTokens = normalizeText(roomName).split(" ").filter((token) => token.length > 2);
  const roomScore = roomTokens.reduce((score, token) => score + (haystack.includes(token) ? 5 : 0), 0);
  if (roomScore === 0) return 0;
  const genericScore = ["paint", "tile", "finish", "light", "fixture", "cabinet", "console", "furniture", "general"].reduce(
    (score, token) => score + (haystack.includes(token) ? 1 : 0),
    0,
  );
  return roomScore + genericScore;
}

function chooseHistoricalRowForRoom(
  historicalRows: PackageBuilderHistoricalRowMatch[],
  roomName: string,
) {
  return filterMap(historicalRows, (row) => {
    const score = scoreHistoricalRowForRoom(row, roomName);
    return score > 0 ? { row, score } : null;
  })
    .sort((left, right) => right.score - left.score || right.row.updatedAt.localeCompare(left.row.updatedAt) || left.row.material.localeCompare(right.row.material))[0]?.row ?? null;
}

function templateRowMatchesRoom(row: PackageBuilderTemplateRowPreview, roomName: string) {
  const area = normalizeText(row.areaName ?? "");
  if (!area) return false;
  const room = normalizeText(roomName);
  if (room === area || room.includes(area) || area.includes(room)) return true;
  const areaTokens = area.split(" ").filter((token) => token.length > 2);
  return areaTokens.length > 0 && areaTokens.every((token) => room.includes(token));
}

function findTemplateRowsForRoom(templateMatches: PackageBuilderTemplateSummary[], roomName: string): TemplateRowNeedMatch[] {
  const matches: TemplateRowNeedMatch[] = [];
  for (const [templateIndex, template] of templateMatches.slice(0, 4).entries()) {
    for (const [rowIndex, row] of (template.rowPreviews ?? []).entries()) {
      if (!templateRowMatchesRoom(row, roomName)) continue;
      matches.push({ template, row, templateIndex, rowIndex });
      if (matches.length >= MAX_TEMPLATE_ROW_PREVIEWS_PER_AREA) return matches;
    }
  }
  return matches;
}

function comparableAreaMatchesRoom(areaName: string, roomName: string) {
  const area = normalizeText(areaName);
  if (!area) return false;
  const room = normalizeText(roomName);
  if (room === area || room.includes(area) || area.includes(room)) return true;
  const areaTokens = area.split(" ").filter((token) => token.length > 2);
  return areaTokens.length > 0 && areaTokens.every((token) => room.includes(token));
}

function scoreComparableRowForNeed(row: PackageBuilderComparablePackageRowPreview, roomName: string, need: RoomComponentNeed) {
  const haystack = normalizeText([
    row.areaName,
    row.material,
    row.description,
    row.supplier,
  ].filter(Boolean).join(" "));
  const needScore = need.searchTerms.reduce((score, term) => score + (haystack.includes(normalizeText(term)) ? 4 : 0), 0);
  if (needScore === 0) return 0;
  const roomTokens = normalizeText(roomName).split(" ").filter((token) => token.length > 2);
  const roomScore = roomTokens.reduce((score, token) => score + (haystack.includes(token) ? 2 : 0), 0);
  return needScore + roomScore;
}

function findComparableRowsForRoom(
  comparablePackages: PackageBuilderComparableEstimatePackage[],
  roomName: string,
): ComparableRowNeedMatch[] {
  const matches: ComparableRowNeedMatch[] = [];
  for (const [packageIndex, packageMatch] of comparablePackages.slice(0, 4).entries()) {
    for (const [areaIndex, area] of packageMatch.areas.entries()) {
      if (!comparableAreaMatchesRoom(area.areaName, roomName)) continue;
      for (const [rowIndex, row] of area.rowPreviews.entries()) {
        matches.push({ packageMatch, area, row, packageIndex, areaIndex, rowIndex });
        if (matches.length >= MAX_COMPARABLE_ROW_PREVIEWS_PER_AREA) return matches;
      }
    }
  }
  return matches;
}

function comparableRowMatchKey(match: ComparableRowNeedMatch) {
  return `${match.packageIndex}:${match.areaIndex}:${match.rowIndex}:${normalizeText(match.row.material)}`;
}

function comparableRowMatchesHistoricalRow(match: ComparableRowNeedMatch, historicalRow: PackageBuilderHistoricalRowMatch) {
  const comparableMaterial = normalizeText(match.row.material);
  const historicalMaterial = normalizeText(historicalRow.material);
  if (!comparableMaterial || comparableMaterial !== historicalMaterial) return false;

  const comparableArea = normalizeText(match.row.areaName ?? match.area.areaName);
  const historicalArea = normalizeText(historicalRow.areaName ?? "");
  return !comparableArea || !historicalArea || comparableArea === historicalArea;
}

function findComparableRowForNeed(
  comparablePackages: PackageBuilderComparableEstimatePackage[],
  roomName: string,
  need: RoomComponentNeed,
) {
  const matches: Array<ComparableRowNeedMatch & { score: number }> = [];
  for (const [packageIndex, packageMatch] of comparablePackages.slice(0, 4).entries()) {
    for (const [areaIndex, area] of packageMatch.areas.entries()) {
      if (!comparableAreaMatchesRoom(area.areaName, roomName)) continue;
      for (const [rowIndex, row] of area.rowPreviews.entries()) {
        const score = scoreComparableRowForNeed(row, roomName, need);
        if (score > 0) matches.push({ packageMatch, area, row, packageIndex, areaIndex, rowIndex, score });
      }
    }
  }
  return matches.sort((left, right) => right.score - left.score || left.row.material.localeCompare(right.row.material))[0] ?? null;
}

function getRoomComponentNeeds(roomName: string): RoomComponentNeed[] {
  const normalized = normalizeText(roomName);
  if (normalized.includes("bedroom")) {
    return [
      {
        id: "bed",
        searchTerms: ["bed", "bed frame", "bedroom"],
        allowanceMaterial: `${roomName} bed allowance`,
        allowanceDescription: "Generated bedroom bed allowance because no scoped bed component match was available.",
        costRatio: 0.035,
        allowReuse: true,
      },
      {
        id: "wardrobe",
        searchTerms: ["wardrobe", "cabinet", "bedroom storage", "closet system", "walk in closet"],
        allowanceMaterial: `${roomName} wardrobe allowance`,
        allowanceDescription: "Generated bedroom wardrobe allowance because no scoped wardrobe component match was available.",
        costRatio: 0.025,
        allowReuse: true,
      },
      {
        id: "paint-finish",
        searchTerms: ["bedroom paint", "paint finish", "wall finish", "ceiling finish"],
        allowanceMaterial: `${roomName} paint finish allowance`,
        allowanceDescription: "Generated bedroom finish allowance because no scoped paint component match was available.",
        costRatio: 0.02,
        allowReuse: true,
        sourceOnly: true,
      },
      {
        id: "light-fixture",
        searchTerms: ["bedroom light", "ceiling light", "light fixture", "lighting"],
        allowanceMaterial: `${roomName} light fixture allowance`,
        allowanceDescription: "Generated bedroom lighting allowance because no scoped fixture component match was available.",
        costRatio: 0.01,
        allowReuse: true,
        sourceOnly: true,
      },
    ];
  }
  if (normalized.includes("toilet") || normalized.includes("bathroom") || normalized.includes("bath")) {
    return [
      {
        id: "water-closet",
        searchTerms: ["water closet", "toilet", "sanitary"],
        allowanceMaterial: `${roomName} water closet allowance`,
        allowanceDescription: "Generated toilet fixture allowance because no scoped water closet component match was available.",
        costRatio: 0.05,
        allowReuse: true,
      },
      {
        id: "lavatory",
        searchTerms: ["lavatory", "basin", "sink", "faucet"],
        allowanceMaterial: `${roomName} lavatory allowance`,
        allowanceDescription: "Generated toilet fixture allowance because no scoped lavatory component match was available.",
        costRatio: 0.025,
        allowReuse: true,
      },
      {
        id: "tile-finish",
        searchTerms: ["toilet tile", "bath tile", "wall tile", "floor tile", "tile finish"],
        allowanceMaterial: `${roomName} tile finish allowance`,
        allowanceDescription: "Generated toilet tile allowance because no scoped tile component match was available.",
        costRatio: 0.035,
        allowReuse: true,
        sourceOnly: true,
      },
    ];
  }
  if (normalized.includes("kitchen")) {
    return [
      {
        id: "kitchen-cabinet",
        searchTerms: ["kitchen", "cabinet", "millwork"],
        allowanceMaterial: "Kitchen cabinet allowance",
        allowanceDescription: "Generated kitchen cabinet allowance because no scoped cabinet component match was available.",
        costRatio: 0.08,
        allowReuse: false,
      },
      {
        id: "kitchen-sink",
        searchTerms: ["kitchen sink", "sink", "faucet"],
        allowanceMaterial: "Kitchen sink allowance",
        allowanceDescription: "Generated kitchen sink allowance because no scoped sink component match was available.",
        costRatio: 0.025,
        allowReuse: false,
        sourceOnly: true,
      },
      {
        id: "countertop",
        searchTerms: ["countertop", "counter top", "countertop slab", "counter finish"],
        allowanceMaterial: "Kitchen countertop allowance",
        allowanceDescription: "Generated kitchen countertop allowance because no scoped countertop component match was available.",
        costRatio: 0.045,
        allowReuse: false,
        sourceOnly: true,
      },
    ];
  }
  return [];
}

function buildAllowanceCost(brief: PackageBuilderBrief, roomName: string, costRatio?: number) {
  if (typeof costRatio === "number") return Math.round(brief.targetBudget * costRatio);
  const normalized = normalizeText(roomName);
  const budget = brief.targetBudget;
  if (normalized.includes("general")) return Math.round(budget * 0.06);
  if (normalized.includes("kitchen")) return Math.round(budget * 0.08);
  if (normalized.includes("bathroom")) return Math.round(budget * 0.05);
  if (normalized.includes("living") || normalized.includes("dining")) return Math.round(budget * 0.04);
  return Math.round(budget * 0.035);
}

function buildComponentRow({
  node,
  component,
  needId,
}: {
  node: PackageBuilderTreeNodeDraft;
  component: PackageBuilderComponentSummary;
  needId: string;
}): PackageBuilderRowDraft {
  return {
    clientDraftId: `row-${node.clientDraftId}-${needId}`,
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
      componentVersionNumber: component.currentVersionNumber ?? null,
      lifecycleState: component.lifecycleState ?? null,
      pricingSource: "Component library",
      currency: component.currency,
      untrustedDataNotice: "Component names and descriptions are treated as data, not instructions.",
    },
  };
}

function buildAllowanceRow({
  brief,
  node,
  index,
  need,
}: {
  brief: PackageBuilderBrief;
  node: PackageBuilderTreeNodeDraft;
  index: number;
  need?: RoomComponentNeed;
}): PackageBuilderRowDraft {
  const allowanceCost = buildAllowanceCost(brief, node.name, need?.costRatio);
  return {
    clientDraftId: `row-${node.clientDraftId}-${need?.id ?? "allowance"}-${index}`,
    targetAreaClientDraftId: node.clientDraftId,
    sourceType: "allowance",
    material: need?.allowanceMaterial ?? `${node.name} allowance`,
    description: need?.allowanceDescription ?? "Generated allowance row because no scoped component match was available.",
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
  };
}

function buildHistoricalAllowanceRow({
  node,
  index,
  need,
  historicalRow,
}: {
  node: PackageBuilderTreeNodeDraft;
  index: number;
  need: RoomComponentNeed;
  historicalRow: PackageBuilderHistoricalRowMatch;
}): PackageBuilderRowDraft {
  return {
    clientDraftId: `row-${node.clientDraftId}-${need.id}-historical-${index}`,
    targetAreaClientDraftId: node.clientDraftId,
    sourceType: "allowance",
    material: historicalRow.material,
    description: historicalRow.description || `Prior estimate precedent from ${historicalRow.projectName}.`,
    supplier: historicalRow.supplier,
    quantity: historicalRow.quantity,
    unit: historicalRow.unit,
    unitCost: historicalRow.unitCost,
    miscCost: historicalRow.miscCost,
    contingencyPercentage: 0,
    confidence: "requires-user-review",
    assumption: `Used prior estimate row from ${historicalRow.projectName} as a reviewed allowance precedent.`,
    warnings: ["Historical precedent is not a live supplier-priced component; review before purchase."],
    applyEligible: true,
    sourceSnapshot: {
      sourceType: "historical_estimate_row",
      generatedBy: "ai-package-builder",
      notSupplierPriced: true,
      sourceLibraryItemId: null,
      projectName: historicalRow.projectName,
      estimateName: historicalRow.estimateName,
      areaName: historicalRow.areaName,
      sourceUpdatedAt: historicalRow.updatedAt,
    },
  };
}

function buildHistoricalRoomAllowanceRow({
  node,
  index,
  historicalRow,
}: {
  node: PackageBuilderTreeNodeDraft;
  index: number;
  historicalRow: PackageBuilderHistoricalRowMatch;
}): PackageBuilderRowDraft {
  const rowSlug = normalizeText(historicalRow.material).replace(/\s+/g, "-") || "historical";
  return {
    clientDraftId: `row-${node.clientDraftId}-historical-${rowSlug}-${index}`.slice(0, 120),
    targetAreaClientDraftId: node.clientDraftId,
    sourceType: "allowance",
    material: historicalRow.material,
    description: historicalRow.description || `Prior estimate precedent from ${historicalRow.projectName}.`,
    supplier: historicalRow.supplier,
    quantity: historicalRow.quantity,
    unit: historicalRow.unit,
    unitCost: historicalRow.unitCost,
    miscCost: historicalRow.miscCost,
    contingencyPercentage: 0,
    confidence: "requires-user-review",
    assumption: `Used prior estimate row from ${historicalRow.projectName} as a reviewed allowance precedent.`,
    warnings: ["Historical precedent is not a live supplier-priced component; review before purchase."],
    applyEligible: true,
    sourceSnapshot: {
      sourceType: "historical_estimate_row",
      generatedBy: "ai-package-builder",
      notSupplierPriced: true,
      sourceLibraryItemId: null,
      projectName: historicalRow.projectName,
      estimateName: historicalRow.estimateName,
      areaName: historicalRow.areaName,
      sourceUpdatedAt: historicalRow.updatedAt,
    },
  };
}

function buildTemplateAllowanceRow({
  node,
  match,
}: {
  node: PackageBuilderTreeNodeDraft;
  match: TemplateRowNeedMatch;
}): PackageBuilderRowDraft {
  const { template, row, templateIndex, rowIndex } = match;
  return {
    clientDraftId: `row-${node.clientDraftId}-template-${templateIndex}-${rowIndex}`,
    targetAreaClientDraftId: node.clientDraftId,
    sourceType: "allowance",
    sourceTemplateId: template.id,
    sourceLibraryItemId: null,
    material: row.material,
    description: row.description || `Template row precedent from ${template.name}.`,
    supplier: row.supplier,
    quantity: row.quantity,
    unit: row.unit,
    unitCost: row.unitCost,
    miscCost: row.miscCost,
    contingencyPercentage: row.adjustmentPercentage ?? row.contingencyPercentage,
    confidence: "requires-user-review",
    assumption: `Used estimate template row from ${template.name} as a reviewed allowance precedent.`,
    warnings: ["Template row is not a live supplier-priced component; review before purchase."],
    applyEligible: true,
    sourceSnapshot: {
      sourceType: "estimate_template_row",
      generatedBy: "ai-package-builder",
      notSupplierPriced: true,
      sourceLibraryItemId: null,
      sourceTemplateId: template.id,
      templateName: template.name,
      templateAreaName: row.areaName,
    },
  };
}

function buildComparableAllowanceRow({
  node,
  match,
  needId,
}: {
  node: PackageBuilderTreeNodeDraft;
  match: ComparableRowNeedMatch;
  needId?: string;
}): PackageBuilderRowDraft {
  const { packageMatch, area, row, packageIndex, areaIndex, rowIndex } = match;
  const rowSlug = normalizeText(row.material).replace(/\s+/g, "-") || `comparable-${rowIndex}`;
  return {
    clientDraftId: `row-${node.clientDraftId}-${needId ?? "comparable"}-${packageIndex}-${areaIndex}-${rowSlug}`.slice(0, 120),
    targetAreaClientDraftId: node.clientDraftId,
    sourceType: "allowance",
    sourceLibraryItemId: null,
    material: row.material,
    description: row.description || `Comparable prior estimate row from ${packageMatch.projectName}.`,
    supplier: row.supplier,
    quantity: row.quantity,
    unit: row.unit,
    unitCost: row.unitCost,
    miscCost: row.miscCost,
    contingencyPercentage: row.adjustmentPercentage ?? row.contingencyPercentage,
    confidence: "requires-user-review",
    assumption: `Used comparable prior estimate row from ${packageMatch.projectName} as a reviewed allowance precedent.`,
    warnings: ["Comparable estimate precedent is not a live supplier-priced component; review before purchase."],
    applyEligible: true,
    sourceSnapshot: {
      sourceType: "comparable_estimate_package",
      generatedBy: "ai-package-builder",
      notSupplierPriced: true,
      sourceLibraryItemId: null,
      projectName: packageMatch.projectName,
      estimateName: packageMatch.estimateName,
      sheetCode: packageMatch.sheetCode,
      areaName: row.areaName ?? area.areaName,
      sourceUpdatedAt: packageMatch.updatedAt,
    },
  };
}

function buildRows({
  brief,
  treeDraft,
  componentMatches,
  historicalRows,
  comparablePackages,
  templateMatches,
  searchTermHints,
  memoryPreferences,
}: {
  brief: PackageBuilderBrief;
  treeDraft: PackageBuilderTreeNodeDraft[];
  componentMatches: PackageBuilderComponentSummary[];
  historicalRows: PackageBuilderHistoricalRowMatch[];
  comparablePackages: PackageBuilderComparableEstimatePackage[];
  templateMatches: PackageBuilderTemplateSummary[];
  searchTermHints: string[];
  memoryPreferences?: PackageBuilderMemoryPreferences;
}): PackageBuilderRowDraft[] {
  const usedComponentIds = new Set<string>();
  let areaIndex = 0;
  return treeDraft.flatMap((node) => {
      if (node.kind !== "area") return [];
      const index = areaIndex;
      areaIndex += 1;
      const needs = getRoomComponentNeeds(node.name);
      const templateRows = findTemplateRowsForRoom(templateMatches, node.name).map((match) =>
        buildTemplateAllowanceRow({ node, match })
      );
      const comparableMatches = findComparableRowsForRoom(comparablePackages, node.name);
      const comparableRows = comparableMatches.map((match) =>
        buildComparableAllowanceRow({ node, match })
      );
      if (needs.length === 0) {
        const components = chooseComponentsForGenericRoom(componentMatches, node.name, usedComponentIds, searchTermHints, historicalRows, memoryPreferences);
        if (components.length > 0) {
          components.forEach((component) => usedComponentIds.add(component.id));
          return [
            ...components.map((component, componentIndex) =>
              buildComponentRow({ node, component, needId: `component-${componentIndex + 1}` })
            ),
            ...comparableRows,
            ...templateRows,
          ];
        }
        const historicalRow = chooseHistoricalRowForRoom(historicalRows, node.name);
        if (historicalRow) {
          const remainingComparableRows = filterMapBy(
            comparableMatches,
            (match) => !comparableRowMatchesHistoricalRow(match, historicalRow),
            (match) => buildComparableAllowanceRow({ node, match }),
          );
          return [buildHistoricalRoomAllowanceRow({ node, index, historicalRow }), ...remainingComparableRows, ...templateRows];
        }
        if (comparableRows.length > 0) return [...comparableRows, ...templateRows];
        if (templateRows.length > 0) return templateRows;
        return [buildAllowanceRow({ brief, node, index })];
      }

      const usedComparableRowKeys = new Set<string>();
      const needRows = filterMap(needs, (need) => {
        const component = chooseComponentForNeed(componentMatches, node.name, usedComponentIds, need, historicalRows, memoryPreferences);
        if (component) {
          if (!need.allowReuse) usedComponentIds.add(component.id);
          return buildComponentRow({ node, component, needId: need.id });
        }
        const historicalRow = chooseHistoricalRowForNeed(historicalRows, node.name, need);
        if (historicalRow) return buildHistoricalAllowanceRow({ node, index, need, historicalRow });
        const comparableRow = findComparableRowForNeed(comparablePackages, node.name, need);
        if (comparableRow) {
          usedComparableRowKeys.add(comparableRowMatchKey(comparableRow));
          return buildComparableAllowanceRow({ node, match: comparableRow, needId: need.id });
        }
        if (need.sourceOnly) return null;
        return buildAllowanceRow({ brief, node, index, need });
      });
      const extraComparableRows = filterMapBy(
        comparableMatches,
        (match) => !usedComparableRowKeys.has(comparableRowMatchKey(match)),
        (match) => buildComparableAllowanceRow({ node, match }),
      );
      return [...needRows, ...extraComparableRows, ...templateRows];
    });
}

function usedComparablePackagePrecedents(rowDraft: PackageBuilderRowDraft[]) {
  return rowDraft.some((row) => row.sourceSnapshot?.sourceType === "comparable_estimate_package");
}

function usedPriorProjectComponentUsage({
  rowDraft,
  treeDraft,
  historicalRows,
}: {
  rowDraft: PackageBuilderRowDraft[];
  treeDraft: PackageBuilderTreeNodeDraft[];
  historicalRows: PackageBuilderHistoricalRowMatch[];
}) {
  if (historicalRows.length === 0) return false;
  const areaNameByClientDraftId = new Map(
    filterMapBy(
      treeDraft,
      (node) => node.kind === "area",
      (node) => [node.clientDraftId, node.name] as const,
    ),
  );
  return rowDraft.some((row) => {
    if (row.sourceType !== "library_item" || !row.sourceLibraryItemId) return false;
    const areaName = areaNameByClientDraftId.get(row.targetAreaClientDraftId);
    if (!areaName) return false;
    return historicalRows.some((historicalRow) =>
      historicalRow.sourceLibraryItemId === row.sourceLibraryItemId
      && historicalUsageRoomMatchesRoom(historicalRow.areaName, areaName)
    );
  });
}

const EDITABLE_ROW_NUMBER_PATTERN_CACHE = new Map<string, RegExp>();

function getEditableRowNumberPattern(label: string) {
  let pattern = EDITABLE_ROW_NUMBER_PATTERN_CACHE.get(label);
  if (!pattern) {
    pattern = new RegExp(`\\b${label}\\b\\s*(?:to|is|=)?\\s*([0-9]+(?:\\.[0-9]+)?)\\b`);
    EDITABLE_ROW_NUMBER_PATTERN_CACHE.set(label, pattern);
  }
  return pattern;
}

function parseEditableRowPatch(message: string) {
  const normalized = normalizeText(message);
  const readLabeledNumber = (labels: string[]) => {
    for (const label of labels) {
      const match = normalized.match(getEditableRowNumberPattern(label));
      if (match) return Number(match[1]);
    }
    return undefined;
  };
  const patch = {
    quantity: readLabeledNumber(["quantity", "qty"]),
    miscCost: readLabeledNumber(["misc cost", "misc"]),
    contingencyPercentage: readLabeledNumber(["contingency percentage", "contingency"]),
  };
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as PackageBuilderRowUpdateDraft["patch"];
}

function scoreAreaRowForUpdate(row: PackageBuilderCompactAreaRow, message: string) {
  const normalizedMessage = normalizeText(message);
  const material = normalizeText(row.material);
  if (!material) return 0;
  if (normalizedMessage.includes(material)) return 100;
  const ignored = new Set(["change", "update", "adjust", "revise", "set", "the", "this", "current", "estimate", "sheet", "row", "item", "quantity", "qty", "misc", "cost", "contingency", "percentage", "and", "to"]);
  return material
    .split(" ")
    .filter((token) => token.length > 2 && !ignored.has(token))
    .reduce((score, token) => score + (normalizedMessage.includes(token) ? 1 : 0), 0);
}

function chooseCurrentEstimateRowForMutation(message: string, readData: PackageBuilderReadToolsData) {
  const scoredRows = filterMap(readData.areaRows, (candidate) => {
    const score = scoreAreaRowForUpdate(candidate, message);
    return score > 0 ? { row: candidate, score } : null;
  })
    .sort((left, right) => right.score - left.score || left.row.material.localeCompare(right.row.material));

  const bestRow = scoredRows[0] ?? null;
  const nextRow = scoredRows[1] ?? null;
  if (bestRow && nextRow && bestRow.score === nextRow.score) {
    return {
      row: null,
      blockedReason: "Ask Flip matched more than one current estimate row; name the exact row before Apply.",
    };
  }
  return { row: bestRow?.row ?? null, blockedReason: null };
}

function scoreComponentForReplacement(component: PackageBuilderComponentSummary, message: string) {
  const normalizedMessage = normalizeText(message);
  const material = normalizeText(component.material);
  if (material && normalizedMessage.includes(material)) return 100;
  const haystack = normalizeText([component.material, component.description, component.category, component.supplier, component.brand].filter(Boolean).join(" "));
  return haystack
    .split(" ")
    .filter((token) => token.length > 2)
    .reduce((score, token) => score + (normalizedMessage.includes(token) ? 1 : 0), 0);
}

function buildRowUpdateDrafts(message: string, readData: PackageBuilderReadToolsData): {
  rowUpdateDraft: PackageBuilderRowUpdateDraft[];
  blockedReason: string | null;
} {
  const patch = parseEditableRowPatch(message);
  if (Object.keys(patch).length === 0) {
    return { rowUpdateDraft: [], blockedReason: "Ask Flip needs a quantity, Misc Cost, or contingency change before it can update an existing row." };
  }

  const rowMatch = chooseCurrentEstimateRowForMutation(message, readData);
  if (rowMatch.blockedReason) return { rowUpdateDraft: [], blockedReason: rowMatch.blockedReason };
  const row = rowMatch.row;

  if (!row) return { rowUpdateDraft: [], blockedReason: "Ask Flip could not match the requested update to a current estimate row." };
  if (typeof row.rowRevision !== "number") {
    return { rowUpdateDraft: [], blockedReason: "Ask Flip needs the current row revision before updating an estimate row." };
  }

  const rowSlug = normalizeText(row.material).replace(/\s+/g, "-") || "row";
  return {
    rowUpdateDraft: [
      {
        clientDraftId: `update-row-${rowSlug}`.slice(0, 120),
        targetRowId: row.id,
        expectedRowRevision: row.rowRevision,
        patch,
        warnings: ["Review the row change before Apply; this updates an existing estimate row."],
        applyEligible: true,
      },
    ],
    blockedReason: null,
  };
}

function buildRowReplacementDrafts(message: string, readData: PackageBuilderReadToolsData): {
  rowReplacementDraft: PackageBuilderRowReplacementDraft[];
  blockedReason: string | null;
} {
  const rowMatch = chooseCurrentEstimateRowForMutation(message, readData);
  if (rowMatch.blockedReason) return { rowReplacementDraft: [], blockedReason: rowMatch.blockedReason };
  const row = rowMatch.row;
  if (!row) return { rowReplacementDraft: [], blockedReason: "Ask Flip could not match the requested replacement to a current estimate row." };
  if (typeof row.rowRevision !== "number") {
    return { rowReplacementDraft: [], blockedReason: "Ask Flip needs the current row revision before replacing an estimate row." };
  }

  const component = filterMap(readData.componentMatches, (candidate) => {
    const score = scoreComponentForReplacement(candidate, message);
    return score > 0 ? { component: candidate, score } : null;
  })
    .sort((left, right) => right.score - left.score || left.component.material.localeCompare(right.component.material))[0]?.component ?? null;
  if (!component?.sourceLibraryItemId && !component?.id) {
    return { rowReplacementDraft: [], blockedReason: "Ask Flip could not find a scoped library component for the requested row replacement." };
  }

  const rowSlug = normalizeText(row.material).replace(/\s+/g, "-") || "row";
  const componentSlug = normalizeText(component.material).replace(/\s+/g, "-") || "component";
  const sourceLibraryItemId = component.sourceLibraryItemId ?? component.id;
  return {
    rowReplacementDraft: [
      {
        clientDraftId: `replace-row-${rowSlug}-with-${componentSlug}`.slice(0, 120),
        targetRowId: row.id,
        expectedRowRevision: row.rowRevision,
        sourceLibraryItemId,
        priceOptionId: component.priceOptionId ?? null,
        priceOptionUpdatedAt: component.priceOptionUpdatedAt ?? null,
        material: component.material,
        description: component.description || `Matched ${component.material} from the scoped component library.`,
        supplier: component.supplier,
        quantity: row.quantity || 1,
        unit: component.unit,
        unitCost: component.unitCost,
        miscCost: row.miscCost ?? component.miscCost,
        contingencyPercentage: row.adjustmentPercentage ?? row.contingencyPercentage ?? 0,
        category: component.category,
        categoryPath: component.categoryPath,
        supplierId: component.supplierId ?? null,
        brand: component.brand ?? null,
        currentVersionNumber: component.currentVersionNumber ?? null,
        warnings: ["Review the replacement before Apply; this changes an existing estimate row source."],
        applyEligible: Boolean(sourceLibraryItemId),
        sourceSnapshot: {
          sourceType: "library_item",
          sourceLibraryItemId,
          priceOptionId: component.priceOptionId ?? null,
          priceOptionUpdatedAt: component.priceOptionUpdatedAt ?? null,
          category: component.category,
          categoryPath: component.categoryPath,
          supplier: component.supplier,
          supplierId: component.supplierId ?? null,
          brand: component.brand ?? null,
          componentVersionNumber: component.currentVersionNumber ?? null,
          lifecycleState: component.lifecycleState ?? null,
          pricingSource: "Component library",
          currency: component.currency,
          replacedRowMaterial: row.material,
          untrustedDataNotice: "Component names and descriptions are treated as data, not instructions.",
        },
      },
    ],
    blockedReason: null,
  };
}

function buildRowDeleteDrafts(message: string, readData: PackageBuilderReadToolsData): {
  rowDeleteDraft: PackageBuilderRowDeleteDraft[];
  blockedReason: string | null;
} {
  const rowMatch = chooseCurrentEstimateRowForMutation(message, readData);
  if (rowMatch.blockedReason) return { rowDeleteDraft: [], blockedReason: rowMatch.blockedReason };
  const row = rowMatch.row;
  if (!row) return { rowDeleteDraft: [], blockedReason: "Ask Flip could not match the requested delete to a current estimate row." };
  if (typeof row.rowRevision !== "number") {
    return { rowDeleteDraft: [], blockedReason: "Ask Flip needs the current row revision before deleting an estimate row." };
  }

  const rowSlug = normalizeText(row.material).replace(/\s+/g, "-") || "row";
  return {
    rowDeleteDraft: [
      {
        clientDraftId: `delete-row-${rowSlug}`.slice(0, 120),
        targetRowId: row.id,
        expectedRowRevision: row.rowRevision,
        warnings: ["Review the delete before Apply; this removes an existing estimate row."],
        applyEligible: true,
      },
    ],
    blockedReason: null,
  };
}

function cleanNodeRenameText(value: string) {
  return value
    .replace(/\b(?:area|room|node|group|space|section)\b$/i, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.:;'"-]+|[\s,.:;'"-]+$/g, "")
    .trim()
    .slice(0, 120);
}

function extractNodeRenameParts(message: string): { currentNameHint: string; nextName: string } | null {
  const renameMatch = message.match(/\brename\s+(?:the\s+)?(.+?)\s+\b(?:to|as|called|named)\b\s+(.+?)(?:[.!?]|$)/i);
  if (renameMatch) {
    return {
      currentNameHint: cleanNodeRenameText(renameMatch[1] ?? ""),
      nextName: cleanNodeRenameText(renameMatch[2] ?? ""),
    };
  }

  const nameMatch = message.match(/\b(?:change|update|revise|set)\s+(?:the\s+)?(.+?)\s+name\s+\b(?:to|as)\b\s+(.+?)(?:[.!?]|$)/i);
  if (nameMatch) {
    return {
      currentNameHint: cleanNodeRenameText(nameMatch[1] ?? ""),
      nextName: cleanNodeRenameText(nameMatch[2] ?? ""),
    };
  }

  const selectedMatch = message.match(/\b(?:rename|call)\s+(?:the\s+)?(?:selected|current|this)\s+(?:area|room|node|group|space|section)\s+\b(?:to|as|called|named)\b\s+(.+?)(?:[.!?]|$)/i);
  if (selectedMatch) {
    return {
      currentNameHint: "selected",
      nextName: cleanNodeRenameText(selectedMatch[1] ?? ""),
    };
  }

  return null;
}

function scoreNodeForRename(node: PackageBuilderCompactTreeNode, currentNameHint: string) {
  const hint = normalizeText(currentNameHint);
  const nodeName = normalizeText(node.name);
  const path = normalizeText(node.path.join(" "));
  if (!hint || ["selected", "current", "this"].includes(hint)) return 0;
  if (nodeName === hint) return 100;
  if (nodeName.includes(hint) || hint.includes(nodeName)) return 60;
  const ignored = new Set(["the", "area", "room", "node", "group", "space", "section", "named", "called", "current"]);
  return hint
    .split(" ")
    .filter((token) => token.length > 2 && !ignored.has(token))
    .reduce((score, token) => score + (nodeName.includes(token) ? 3 : path.includes(token) ? 1 : 0), 0);
}

function chooseCurrentEstimateNodeForRename(message: string, readData: PackageBuilderReadToolsData) {
  const parts = extractNodeRenameParts(message);
  if (!parts?.nextName) {
    return {
      node: null,
      nextName: "",
      blockedReason: "Ask Flip needs the new node name before renaming an estimate node.",
    };
  }

  const selectedNodeId = readData.estimateSummary?.firstNodeId ?? null;
  const hint = normalizeText(parts.currentNameHint);
  const selectedNode = selectedNodeId ? readData.estimateTree.find((node) => node.id === selectedNodeId) ?? null : null;
  if (selectedNode && ["selected", "current", "this", "selected node", "current node", "this node"].includes(hint)) {
    return { node: selectedNode, nextName: parts.nextName, blockedReason: null };
  }

  const scoredNodes = filterMap(readData.estimateTree, (candidate) => {
    const score = scoreNodeForRename(candidate, parts.currentNameHint);
    return score > 0 ? { node: candidate, score } : null;
  })
    .sort((left, right) => right.score - left.score || left.node.name.localeCompare(right.node.name));
  const bestNode = scoredNodes[0] ?? null;
  const nextNode = scoredNodes[1] ?? null;
  if (bestNode && nextNode && bestNode.score === nextNode.score) {
    return {
      node: null,
      nextName: parts.nextName,
      blockedReason: "Ask Flip matched more than one current estimate node; name the exact Area or Group before Apply.",
    };
  }

  if (!bestNode && selectedNode && /\b(selected|current|this)\b/.test(hint)) {
    return { node: selectedNode, nextName: parts.nextName, blockedReason: null };
  }

  return {
    node: bestNode?.node ?? null,
    nextName: parts.nextName,
    blockedReason: bestNode ? null : "Ask Flip could not match the requested rename to a current estimate node.",
  };
}

function buildNodeRenameDrafts(message: string, readData: PackageBuilderReadToolsData): {
  nodeRenameDraft: PackageBuilderNodeRenameDraft[];
  blockedReason: string | null;
} {
  const nodeMatch = chooseCurrentEstimateNodeForRename(message, readData);
  if (nodeMatch.blockedReason) return { nodeRenameDraft: [], blockedReason: nodeMatch.blockedReason };
  if (!nodeMatch.node) return { nodeRenameDraft: [], blockedReason: "Ask Flip could not match the requested rename to a current estimate node." };
  if (normalizeText(nodeMatch.node.name) === normalizeText(nodeMatch.nextName)) {
    return { nodeRenameDraft: [], blockedReason: "Ask Flip needs a different node name before renaming an estimate node." };
  }

  const nodeSlug = normalizeText(nodeMatch.node.name).replace(/\s+/g, "-") || "node";
  return {
    nodeRenameDraft: [
      {
        clientDraftId: `rename-node-${nodeSlug}`.slice(0, 120),
        targetNodeId: nodeMatch.node.id,
        currentName: nodeMatch.node.name,
        nextName: nodeMatch.nextName,
        warnings: ["Review the rename before Apply; this changes an existing estimate tree node."],
        applyEligible: true,
      },
    ],
    blockedReason: null,
  };
}

function scoreTemplateRowForCopy(row: PackageBuilderTemplateRowPreview, message: string) {
  const normalizedMessage = normalizeText(message);
  const material = normalizeText(row.material);
  if (material && normalizedMessage.includes(material)) return 100;
  const haystack = normalizeText([row.areaName, row.material, row.description, row.supplier].filter(Boolean).join(" "));
  return haystack
    .split(" ")
    .filter((token) => token.length > 2)
    .reduce((score, token) => score + (normalizedMessage.includes(token) ? 1 : 0), 0);
}

function chooseTargetAreaForTemplateRowCopy({
  row,
  targetTree,
  target,
}: {
  row: PackageBuilderTemplateRowPreview;
  targetTree: PackageBuilderTreeNodeDraft[];
  target: PackageBuilderTarget | null;
}) {
  const areaDrafts = targetTree.filter((node) => node.kind === "area");
  if (areaDrafts.length === 0 || !target) return null;
  const rowArea = normalizeText(row.areaName ?? "");
  const matchedArea = rowArea
    ? areaDrafts.find((area) => {
        const areaName = normalizeText(area.name);
        return areaName === rowArea || areaName.includes(rowArea) || rowArea.includes(areaName);
      })
    : null;
  if (matchedArea && target.areaNodeIdsByClientDraftId[matchedArea.clientDraftId]) return matchedArea;
  const selectedArea = areaDrafts.find((area) => target.areaNodeIdsByClientDraftId[area.clientDraftId] === target.selectedNodeId);
  if (selectedArea) return selectedArea;
  return areaDrafts.find((area) => target.areaNodeIdsByClientDraftId[area.clientDraftId]) ?? null;
}

function buildTemplateRowCopyDrafts({
  message,
  targetTree,
  target,
  templateMatches,
}: {
  message: string;
  targetTree: PackageBuilderTreeNodeDraft[];
  target: PackageBuilderTarget | null;
  templateMatches: PackageBuilderTemplateSummary[];
}): {
  templateRowCopyDraft: PackageBuilderTemplateRowCopyDraft[];
  blockedReason: string | null;
} {
  const matches: Array<{
    template: PackageBuilderTemplateSummary;
    row: PackageBuilderTemplateRowPreview;
    score: number;
  }> = [];
  for (const template of templateMatches) {
    const templateScore = scoreTemplateForInsert(template, message);
    const rowPreviews = template.rowPreviews ?? [];
    for (const row of rowPreviews) {
      const rowScore = scoreTemplateRowForCopy(row, message);
      const canUseTemplateOnlyMatch = templateScore > 0 && rowPreviews.length === 1;
      if ((rowScore > 0 || canUseTemplateOnlyMatch) && row.id && row.templateId) {
        matches.push({ template, row, score: rowScore + templateScore });
      }
    }
  }
  const match = matches.sort((left, right) => right.score - left.score || left.template.name.localeCompare(right.template.name) || left.row.material.localeCompare(right.row.material))[0] ?? null;
  if (!match?.row.id || !match.row.templateId) {
    return { templateRowCopyDraft: [], blockedReason: "Ask Flip could not match the requested template row copy." };
  }

  const targetArea = chooseTargetAreaForTemplateRowCopy({ row: match.row, targetTree, target });
  if (!targetArea) {
    return { templateRowCopyDraft: [], blockedReason: "Ask Flip needs an existing estimate Area Node before copying a template row." };
  }

  const rowSlug = normalizeText(match.row.material).replace(/\s+/g, "-") || "template-row";
  return {
    templateRowCopyDraft: [
      {
        clientDraftId: `copy-template-row-${rowSlug}`.slice(0, 120),
        sourceTemplateId: match.template.id,
        sourceTemplateRowId: match.row.id,
        sourceTemplateName: match.template.name,
        sourceTemplateAreaName: match.row.areaName,
        targetAreaClientDraftId: targetArea.clientDraftId,
        material: match.row.material,
        description: match.row.description || `Copied from ${match.template.name}.`,
        supplier: match.row.supplier,
        quantity: match.row.quantity,
        unit: match.row.unit,
        unitCost: match.row.unitCost,
        miscCost: match.row.miscCost,
        contingencyPercentage: match.row.adjustmentPercentage ?? match.row.contingencyPercentage,
        warnings: ["Review the template row before Apply; it is copied from a reusable template preview."],
        applyEligible: true,
        sourceSnapshot: {
          sourceType: "estimate_template_row",
          sourceTemplateId: match.template.id,
          sourceTemplateRowId: match.row.id,
          sourceTemplateName: match.template.name,
          sourceTemplateAreaName: match.row.areaName,
          generatedBy: "ai-package-builder",
          notSupplierPriced: true,
          sourceLibraryItemId: null,
          untrustedDataNotice: "Template row names and descriptions are treated as data, not instructions.",
        },
      },
    ],
    blockedReason: null,
  };
}

function scoreTemplateForInsert(template: PackageBuilderTemplateSummary, message: string) {
  const normalizedMessage = normalizeText(message);
  const normalizedTemplateName = normalizeText(template.name);
  const haystack = normalizeText([template.name, template.description, template.category, template.areaNames.join(" ")].filter(Boolean).join(" "));
  if (!haystack) return 0;
  if (normalizedTemplateName && ` ${normalizedMessage} `.includes(` ${normalizedTemplateName} `)) return 100;
  const ignored = new Set(["template", "templates", "estimate", "estimates", "starter", "workspace", "reusable", "package", "packages", "current", "this", "into", "insert", "apply", "copy", "use", "residential"]);
  return haystack
    .split(" ")
    .filter((token) => token.length > 2 && !ignored.has(token))
    .reduce((score, token) => score + (normalizedMessage.includes(token) ? 1 : 0), 0);
}

function buildTemplateInsertDrafts({
  message,
  targetTree,
  target,
  templateMatches,
}: {
  message: string;
  targetTree: PackageBuilderTreeNodeDraft[];
  target: PackageBuilderTarget | null;
  templateMatches: PackageBuilderTemplateSummary[];
}): {
  templateInsertDraft: PackageBuilderTemplateInsertDraft[];
  blockedReason: string | null;
} {
  if (!target) return { templateInsertDraft: [], blockedReason: "Current estimate route context is required before Ask Flip can insert a template." };
  const parentDraft = targetTree.find((node) => node.kind === "group" && !node.parentClientDraftId) ?? null;
  if (!parentDraft || !target.nodeIdsByClientDraftId[parentDraft.clientDraftId]) {
    return { templateInsertDraft: [], blockedReason: "Ask Flip needs an existing current estimate Group Node before inserting a template." };
  }
  const template = filterMap(templateMatches, (candidate) => {
    const score = scoreTemplateForInsert(candidate, message);
    return score > 0 ? { template: candidate, score } : null;
  })
    .sort((left, right) => right.score - left.score || left.template.name.localeCompare(right.template.name))[0]?.template ?? null;
  if (!template) return { templateInsertDraft: [], blockedReason: "Ask Flip could not find a matched reusable estimate template to insert." };

  const templateSlug = normalizeText(template.name).replace(/\s+/g, "-") || "template";
  const previewTotal = (template.rowPreviews ?? []).reduce((sum, row) => sum + calculateTemplateRowPreviewTotal(row), 0);
  return {
    templateInsertDraft: [
      {
        clientDraftId: `insert-template-${templateSlug}`.slice(0, 120),
        sourceTemplateId: template.id,
        sourceTemplateName: template.name,
        targetParentClientDraftId: parentDraft.clientDraftId,
        expectedNodeCount: template.nodeCount,
        expectedRowCount: template.rowCount,
        previewTotal,
        warnings: ["Review the template copy before Apply; this inserts the template into the current estimate."],
        applyEligible: true,
      },
    ],
    blockedReason: null,
  };
}

function cleanComponentDraftText(value: string, fallback: string) {
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "")
    .trim();
  return cleaned || fallback;
}

function extractLabeledText(message: string, label: string, stopWords: string[]) {
  const stopPattern = stopWords.map((word) => `\\b${word}\\b`).join("|");
  const match = message.match(new RegExp(`\\b${label}\\b\\s+(.+?)(?:,|${stopPattern}|$)`, "i"));
  return match ? cleanComponentDraftText(match[1] ?? "", "") : "";
}

function inferComponentCreateName(message: string) {
  const named = message.match(/\b(?:called|named)\s+(.+?)(?:,|\bcategory\b|\bunit\b|\bcost\b|\bprice\b|\bfrom\b|$)/i);
  if (named) return cleanComponentDraftText(named[1] ?? "", "Library component");
  const component = message.match(/\bcomponent\s+(.+?)(?:,|\bcategory\b|\bunit\b|\bcost\b|\bprice\b|\bfrom\b|$)/i);
  if (component) return cleanComponentDraftText(component[1] ?? "", "Library component");
  return "Library component";
}

function inferComponentCreateUnit(message: string) {
  return extractLabeledText(message, "unit", ["cost", "price", "from"]) || "unit";
}

function inferComponentCreateCategory(message: string) {
  return extractLabeledText(message, "category", ["unit", "cost", "price", "from"]) || "General";
}

function inferComponentCreateSupplier(message: string) {
  const match = message.match(/\bfrom\s+(.+?)(?:,|\bcategory\b|\bunit\b|\bcost\b|\bprice\b|$)/i);
  return match ? cleanComponentDraftText(match[1] ?? "", "") || null : null;
}

function inferComponentCreateCost(message: string) {
  const normalized = message.replace(/,/g, "");
  const labeled = normalized.match(/\b(?:unit cost|cost|price|priced at)\b\s*(?:php|peso|pesos)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (labeled) return Number(labeled[1]);
  const currencyAfter = normalized.match(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:php|peso|pesos)\b/i);
  if (currencyAfter) return Number(currencyAfter[1]);
  return 0;
}

function buildComponentCreateDrafts(message: string): {
  componentCreateDraft: PackageBuilderComponentCreateDraft[];
  blockedReason: string | null;
} {
  const name = inferComponentCreateName(message);
  const unit = inferComponentCreateUnit(message);
  const unitCost = inferComponentCreateCost(message);
  if (unitCost <= 0) {
    return {
      componentCreateDraft: [],
      blockedReason: "Ask Flip needs a non-zero component cost before creating a library component.",
    };
  }

  const componentSlug = normalizeText(name).replace(/\s+/g, "-") || "component";
  return {
    componentCreateDraft: [
      {
        clientDraftId: `component-${componentSlug}`.slice(0, 120),
        name,
        description: `${name} drafted by Ask Flip for component-library review.`,
        category: inferComponentCreateCategory(message),
        supplier: inferComponentCreateSupplier(message),
        brand: null,
        unit,
        unitCost,
        miscCost: 0,
        currencyCode: "PHP",
        pricingSource: "Ask Flip draft",
        confidence: "requires-user-review",
        lifecycleState: "available",
        warnings: ["Review supplier and pricing before Apply."],
        applyEligible: true,
      },
    ],
    blockedReason: null,
  };
}

function buildOperations({
  treeDraft,
  rowDraft,
  componentCreateDraft,
  rowUpdateDraft,
  rowReplacementDraft,
  rowDeleteDraft,
  nodeRenameDraft,
  templateRowCopyDraft,
  templateInsertDraft,
  intent,
  target,
}: {
  treeDraft: PackageBuilderTreeNodeDraft[];
  rowDraft: PackageBuilderRowDraft[];
  componentCreateDraft: PackageBuilderComponentCreateDraft[];
  rowUpdateDraft: PackageBuilderRowUpdateDraft[];
  rowReplacementDraft: PackageBuilderRowReplacementDraft[];
  rowDeleteDraft: PackageBuilderRowDeleteDraft[];
  nodeRenameDraft: PackageBuilderNodeRenameDraft[];
  templateRowCopyDraft: PackageBuilderTemplateRowCopyDraft[];
  templateInsertDraft: PackageBuilderTemplateInsertDraft[];
  intent: PackageBuilderDraft["intent"];
  target: PackageBuilderTarget | null;
}): PackageBuilderOperation[] {
  const existingNodeIds = new Set(Object.keys(target?.nodeIdsByClientDraftId ?? {}));
  const shouldCreateMissingAreas = rowDraft.length > 0;
  const treeOperations = filterMapBy(
    treeDraft,
    (node) => intent === "create_package_project" || (shouldCreateMissingAreas && node.kind === "area" && !existingNodeIds.has(node.clientDraftId)),
    (node) => ({
    operationId: `op-tree-${node.clientDraftId}`,
    type: "create_tree_node" as const,
    clientDraftId: node.clientDraftId,
    applyEligible: true,
  }));

  return [
    ...(intent === "create_package_project"
      ? [
          { operationId: "op-create-project", type: "create_project" as const, applyEligible: true },
          { operationId: "op-create-estimate", type: "create_estimate" as const, applyEligible: true },
        ]
      : []),
    ...treeOperations,
    ...rowDraft.map((row) => ({
      operationId: `op-row-${row.clientDraftId}`,
      type: row.sourceType === "library_item" ? "insert_component_row" as const : "insert_allowance_row" as const,
      clientDraftId: row.clientDraftId,
      applyEligible: row.applyEligible,
      reasons: row.applyEligible ? [] : ["Row requires review before Apply."],
    })),
    ...componentCreateDraft.map((component) => ({
      operationId: `op-${component.clientDraftId}`,
      type: "create_library_component" as const,
      clientDraftId: component.clientDraftId,
      applyEligible: component.applyEligible,
      reasons: component.applyEligible ? [] : ["Component create requires review before Apply."],
    })),
    ...rowUpdateDraft.map((update) => ({
      operationId: `op-update-${update.clientDraftId}`,
      type: "update_existing_row" as const,
      clientDraftId: update.clientDraftId,
      applyEligible: update.applyEligible,
      reasons: update.applyEligible ? [] : ["Row update requires review before Apply."],
    })),
    ...rowReplacementDraft.map((replacement) => ({
      operationId: `op-${replacement.clientDraftId}`,
      type: "replace_existing_row" as const,
      clientDraftId: replacement.clientDraftId,
      applyEligible: replacement.applyEligible,
      reasons: replacement.applyEligible ? [] : ["Row replacement requires review before Apply."],
    })),
    ...rowDeleteDraft.map((deletion) => ({
      operationId: `op-${deletion.clientDraftId}`,
      type: "delete_existing_row" as const,
      clientDraftId: deletion.clientDraftId,
      applyEligible: deletion.applyEligible,
      reasons: deletion.applyEligible ? [] : ["Row delete requires review before Apply."],
    })),
    ...nodeRenameDraft.map((rename) => ({
      operationId: `op-${rename.clientDraftId}`,
      type: "rename_estimate_node" as const,
      clientDraftId: rename.clientDraftId,
      applyEligible: rename.applyEligible,
      reasons: rename.applyEligible ? [] : ["Node rename requires review before Apply."],
    })),
    ...templateRowCopyDraft.map((copy) => ({
      operationId: `op-${copy.clientDraftId}`,
      type: "copy_template_row" as const,
      clientDraftId: copy.clientDraftId,
      applyEligible: copy.applyEligible,
      reasons: copy.applyEligible ? [] : ["Template row copy requires review before Apply."],
    })),
    ...templateInsertDraft.map((templateInsert) => ({
      operationId: `op-template-${templateInsert.clientDraftId}`,
      type: "insert_template" as const,
      clientDraftId: templateInsert.clientDraftId,
      applyEligible: templateInsert.applyEligible,
      reasons: templateInsert.applyEligible ? [] : ["Template insert requires review before Apply."],
    })),
  ];
}

function calculateTemplateRowPreviewTotal(row: PackageBuilderTemplateRowPreview) {
  const base = row.quantity * row.unitCost;
  return base + row.miscCost + (base * (row.adjustmentPercentage ?? row.contingencyPercentage)) / 100;
}

function calculateRowLikeTotal(row: Pick<PackageBuilderRowDraft, "quantity" | "unitCost" | "miscCost" | "contingencyPercentage">) {
  const base = row.quantity * row.unitCost;
  return base + row.miscCost + (base * row.contingencyPercentage) / 100;
}

function calculateDraftAdditionalTotal({
  rowReplacementDraft,
  templateRowCopyDraft,
  templateInsertDraft,
}: {
  rowReplacementDraft: PackageBuilderRowReplacementDraft[];
  templateRowCopyDraft: PackageBuilderTemplateRowCopyDraft[];
  templateInsertDraft: PackageBuilderTemplateInsertDraft[];
}) {
  const templateInsertPreviewTotal = templateInsertDraft.reduce((sum, templateInsert) => sum + templateInsert.previewTotal, 0);
  const rowReplacementPreviewTotal = rowReplacementDraft.reduce((sum, replacement) => sum + calculateRowLikeTotal(replacement), 0);
  const templateRowCopyPreviewTotal = templateRowCopyDraft.reduce((sum, copy) => sum + calculateRowLikeTotal(copy), 0);
  return templateInsertPreviewTotal + rowReplacementPreviewTotal + templateRowCopyPreviewTotal;
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function chooseRevisionArea(treeDraft: PackageBuilderTreeNodeDraft[], message: string) {
  const areaDrafts = treeDraft.filter((node) => node.kind === "area");
  const normalizedMessage = normalizeText(message);
  return filterMap(areaDrafts, (area) => {
      const areaName = normalizeText(area.name);
      const exactScore = areaName && normalizedMessage.includes(areaName) ? 100 : 0;
      const tokenScore = areaName
        .split(" ")
        .filter((token) => token.length > 2)
        .reduce((score, token) => score + (normalizedMessage.includes(token) ? 2 : 0), 0);
      const score = exactScore + tokenScore;
      return score > 0 ? { area, score } : null;
    })
    .sort((left, right) => right.score - left.score || left.area.sortOrder - right.area.sortOrder)[0]?.area
    ?? areaDrafts[0]
    ?? null;
}

function chooseRevisionComponent({
  componentMatches,
  message,
  baseDraft,
  targetAreaClientDraftId,
}: {
  componentMatches: PackageBuilderComponentSummary[];
  message: string;
  baseDraft: PackageBuilderDraft;
  targetAreaClientDraftId: string;
}) {
  const existingMaterialsInArea = new Set(
    filterMap(baseDraft.rowDraft, (row) => {
      if (row.targetAreaClientDraftId !== targetAreaClientDraftId) return null;
      const normalizedMaterial = normalizeText(row.material);
      return normalizedMaterial || null;
    }),
  );
  return filterMap(componentMatches, (component) => {
    if (existingMaterialsInArea.has(normalizeText(component.material))) return null;
    const score = scoreComponentForReplacement(component, message);
    return score > 0 ? { component, score } : null;
  })
    .sort((left, right) => right.score - left.score || left.component.material.localeCompare(right.component.material))[0]?.component
    ?? null;
}

function makeUniqueRowClientDraftId(baseDraft: PackageBuilderDraft, preferredId: string) {
  const existing = new Set(baseDraft.rowDraft.map((row) => row.clientDraftId));
  if (!existing.has(preferredId)) return preferredId;
  const prefix = preferredId.slice(0, 108);
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${prefix}-${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function buildRevisedPendingDraft({
  message,
  readData,
  baseDraft,
}: {
  message: string;
  readData: PackageBuilderReadToolsData;
  baseDraft: PackageBuilderDraft;
}) {
  const parsedBaseDraft = parsePackageBuilderDraft(baseDraft);
  const targetArea = chooseRevisionArea(parsedBaseDraft.treeDraft, message);
  let revisionBlockedReason: string | null = null;
  let addedRow: PackageBuilderRowDraft | null = null;

  if (!targetArea) {
    revisionBlockedReason = "Ask Flip needs at least one Area Node in the pending draft before it can revise rows.";
  } else {
    const component = chooseRevisionComponent({
      componentMatches: readData.componentMatches,
      message,
      baseDraft: parsedBaseDraft,
      targetAreaClientDraftId: targetArea.clientDraftId,
    });

    if (!component) {
      revisionBlockedReason = "Ask Flip could not match the requested draft revision to a scoped library component.";
    } else {
      const componentSlug = normalizeText(component.material).replace(/\s+/g, "-") || "component";
      const row = buildComponentRow({ node: targetArea, component, needId: componentSlug });
      addedRow = {
        ...row,
        clientDraftId: makeUniqueRowClientDraftId(parsedBaseDraft, row.clientDraftId),
        assumption: `Added to ${targetArea.name} while revising the pending draft before Apply.`,
      };
    }
  }

  const rowUpdateDraft = parsedBaseDraft.rowUpdateDraft ?? [];
  const rowReplacementDraft = parsedBaseDraft.rowReplacementDraft ?? [];
  const rowDeleteDraft = parsedBaseDraft.rowDeleteDraft ?? [];
  const nodeRenameDraft = parsedBaseDraft.nodeRenameDraft ?? [];
  const templateRowCopyDraft = parsedBaseDraft.templateRowCopyDraft ?? [];
  const templateInsertDraft = parsedBaseDraft.templateInsertDraft ?? [];
  const rowDraft = addedRow ? [...parsedBaseDraft.rowDraft, addedRow] : parsedBaseDraft.rowDraft;
  const operations = buildOperations({
    treeDraft: parsedBaseDraft.treeDraft,
    rowDraft,
    componentCreateDraft: parsedBaseDraft.componentCreateDraft ?? [],
    rowUpdateDraft,
    rowReplacementDraft,
    rowDeleteDraft,
    nodeRenameDraft,
    templateRowCopyDraft,
    templateInsertDraft,
    intent: parsedBaseDraft.intent,
    target: parsedBaseDraft.target,
  });
  const budgetSummary = buildPackageBudgetSummary({
    rows: rowDraft,
    additionalAllowanceTotal: calculateDraftAdditionalTotal({ rowReplacementDraft, templateRowCopyDraft, templateInsertDraft }),
    targetBudget: parsedBaseDraft.budgetSummary.targetBudget,
    currencyCode: parsedBaseDraft.budgetSummary.currencyCode,
  });
  const revisionAssumptions = addedRow ? [`Revised the pending draft to add ${addedRow.material} before Apply.`] : [];
  const revisionWarnings = revisionBlockedReason ? [revisionBlockedReason] : [];
  const draft: PackageBuilderDraft = {
    ...parsedBaseDraft,
    draftId: `package-draft-${randomUUID()}`,
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
    assumptions: uniqueStrings([...parsedBaseDraft.assumptions, ...revisionAssumptions]),
    warnings: uniqueStrings([...parsedBaseDraft.warnings, ...revisionWarnings]),
    applyEligibility: revisionBlockedReason
      ? { eligible: false, reasons: [revisionBlockedReason] }
      : { eligible: true, reasons: [] },
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

function shouldReduceDraftAllowances(message: string) {
  const normalized = normalizeText(message);
  return /\b(cheaper|less expensive|lower cost|reduce|decrease|trim|cut)\b/.test(normalized)
    || /\bmake\b.*\b(cheap|cheaper|budget|cost)\b/.test(normalized);
}

function getRemovedAreaIds(message: string, treeDraft: PackageBuilderTreeNodeDraft[]) {
  const normalized = normalizeText(message);
  if (!/\b(remove|delete|drop|omit|exclude)\b/.test(normalized)) return new Set<string>();

  return new Set(
    filterMap(treeDraft, (node) => {
      if (node.kind !== "area") return null;
      const areaName = normalizeText(node.name);
      if (!areaName || !` ${normalized} `.includes(` ${areaName} `)) return null;
      return node.clientDraftId;
    }),
  );
}

function pruneTargetToTree(target: PackageBuilderTarget | null, treeDraft: PackageBuilderTreeNodeDraft[]) {
  if (!target) return null;
  const treeIds = new Set(treeDraft.map((node) => node.clientDraftId));
  return {
    ...target,
    nodeIdsByClientDraftId: Object.fromEntries(
      Object.entries(target.nodeIdsByClientDraftId).filter(([clientDraftId]) => treeIds.has(clientDraftId)),
    ),
    areaNodeIdsByClientDraftId: Object.fromEntries(
      Object.entries(target.areaNodeIdsByClientDraftId).filter(([clientDraftId]) => treeIds.has(clientDraftId)),
    ),
  };
}

export function refinePackageBuilderDraft({
  message,
  baseDraft,
  readData,
}: {
  message: string;
  baseDraft: PackageBuilderDraft;
  readData?: PackageBuilderReadToolsData;
}): PackageBuilderDraft {
  const parsedBaseDraft = parsePackageBuilderDraft(baseDraft);
  const willReduceAllowances = shouldReduceDraftAllowances(message);
  const removedAreaIdsForRouting = getRemovedAreaIds(message, parsedBaseDraft.treeDraft);
  if (readData && !willReduceAllowances && removedAreaIdsForRouting.size === 0) {
    return buildRevisedPendingDraft({ message, readData, baseDraft: parsedBaseDraft });
  }

  let treeDraft = parsedBaseDraft.treeDraft.map((node) => ({ ...node }));
  let rowDraft = parsedBaseDraft.rowDraft.map((row) => ({ ...row, warnings: [...row.warnings] }));
  const rowUpdateDraft = (parsedBaseDraft.rowUpdateDraft ?? []).map((update) => ({ ...update, patch: { ...update.patch }, warnings: [...update.warnings] }));
  const rowReplacementDraft = (parsedBaseDraft.rowReplacementDraft ?? []).map((replacement) => ({ ...replacement, categoryPath: [...replacement.categoryPath], warnings: [...replacement.warnings] }));
  const rowDeleteDraft = (parsedBaseDraft.rowDeleteDraft ?? []).map((deletion) => ({ ...deletion, warnings: [...deletion.warnings] }));
  const nodeRenameDraft = (parsedBaseDraft.nodeRenameDraft ?? []).map((rename) => ({ ...rename, warnings: [...rename.warnings] }));
  const templateRowCopyDraft = (parsedBaseDraft.templateRowCopyDraft ?? []).map((copy) => ({ ...copy, warnings: [...copy.warnings] }));
  const templateInsertDraft = (parsedBaseDraft.templateInsertDraft ?? []).map((templateInsert) => ({ ...templateInsert, warnings: [...templateInsert.warnings] }));
  const refinementAssumptions = [`Refined from previous package draft: ${message.trim().replace(/\s+/g, " ").slice(0, 160)}`];
  const refinementWarnings: string[] = [];

  if (shouldReduceDraftAllowances(message)) {
    let reducedAllowanceCount = 0;
    rowDraft = rowDraft.map((row) => {
      if (row.sourceType !== "allowance") return row;
      reducedAllowanceCount += 1;
      return {
        ...row,
        unitCost: Math.max(0, Math.round(row.unitCost * 0.9)),
        miscCost: Math.max(0, Math.round(row.miscCost * 0.9)),
        warnings: uniqueStrings([...row.warnings, "Reduced review allowance by 10% during refinement."]),
      };
    });
    if (reducedAllowanceCount > 0) {
      refinementWarnings.push("Reduced review allowance rows by 10%; matched library prices were not changed.");
    } else {
      refinementWarnings.push("No allowance rows were reduced; matched library/template prices stay fixed until the source data changes.");
    }
  }

  const removedAreaIds = getRemovedAreaIds(message, treeDraft);
  if (removedAreaIds.size > 0) {
    treeDraft = treeDraft.filter((node) => !removedAreaIds.has(node.clientDraftId));
    rowDraft = rowDraft.filter((row) => !removedAreaIds.has(row.targetAreaClientDraftId));
    refinementWarnings.push("Removed the matched draft area and its pending rows from the preview.");
  }

  const target = pruneTargetToTree(parsedBaseDraft.target, treeDraft);
  const operations = buildOperations({
    treeDraft,
    rowDraft,
    componentCreateDraft: parsedBaseDraft.componentCreateDraft ?? [],
    rowUpdateDraft,
    rowReplacementDraft,
    rowDeleteDraft,
    nodeRenameDraft,
    templateRowCopyDraft,
    templateInsertDraft,
    intent: parsedBaseDraft.intent,
    target,
  });
  const budgetSummary = buildPackageBudgetSummary({
    rows: rowDraft,
    additionalAllowanceTotal: calculateDraftAdditionalTotal({ rowReplacementDraft, templateRowCopyDraft, templateInsertDraft }),
    targetBudget: parsedBaseDraft.budgetSummary.targetBudget,
    currencyCode: parsedBaseDraft.budgetSummary.currencyCode,
  });
  const draft: PackageBuilderDraft = {
    ...parsedBaseDraft,
    draftId: `package-draft-${randomUUID()}`,
    target,
    treeDraft,
    rowDraft,
    rowUpdateDraft,
    rowReplacementDraft,
    rowDeleteDraft,
    nodeRenameDraft,
    templateRowCopyDraft,
    templateInsertDraft,
    operations,
    budgetSummary,
    assumptions: uniqueStrings([...parsedBaseDraft.assumptions, ...refinementAssumptions]),
    warnings: uniqueStrings([...parsedBaseDraft.warnings, ...refinementWarnings]),
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

function compactTemplateRowPreview(row: PackageBuilderTemplateRowPreview) {
  return {
    areaName: row.areaName,
    material: row.material,
    description: row.description,
    supplier: row.supplier,
    quantity: row.quantity,
    unit: row.unit,
    unitCost: row.unitCost,
    miscCost: row.miscCost,
    contingencyPercentage: row.contingencyPercentage,
    adjustmentPercentage: row.adjustmentPercentage,
    total: typeof row.total === "number" ? row.total : calculateTemplateRowPreviewTotal(row),
  };
}

function compactTemplateMatch(template: PackageBuilderTemplateSummary) {
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    nodeCount: template.nodeCount,
    rowCount: template.rowCount,
    areaNames: template.areaNames,
    rowPreviews: (template.rowPreviews ?? []).slice(0, 12).map(compactTemplateRowPreview),
  };
}

export function buildPackageBuilderDraft({
  message,
  readData,
  providerResult,
  baseDraft,
}: BuildPackageBuilderDraftInput): PackageBuilderDraft {
  if (baseDraft) {
    return refinePackageBuilderDraft({ message, readData, baseDraft });
  }

  const brief = buildBrief(message, providerResult);
  const searchTermHints = normalizeProviderSearchTermHints(providerResult);
  const roomNames = buildRoomNames(brief, message, readData.templateMatches, readData.comparableEstimatePackages, providerResult);
  const componentCreateRequested = isLibraryComponentCreateRequest(message);
  const templateRowCopyRequested = isTemplateRowCopyCurrentEstimateRequest(message);
  const templateInsertRequested = isTemplateInsertCurrentEstimateRequest(message) && !templateRowCopyRequested;
  const rowReplacementRequested = isReplaceCurrentEstimateRequest(message);
  const rowDeleteRequested = isDeleteCurrentEstimateRequest(message);
  const nodeRenameRequested = isRenameCurrentEstimateNodeRequest(message);
  const targetsCurrentEstimate = !componentCreateRequested && (
    isFillCurrentEstimateRequest(message)
    || isUpdateCurrentEstimateRequest(message)
    || rowReplacementRequested
    || rowDeleteRequested
    || nodeRenameRequested
    || templateRowCopyRequested
    || templateInsertRequested
  );
  const currentEstimateTarget = targetsCurrentEstimate ? buildCurrentEstimateTargetTree(readData, templateInsertRequested || nodeRenameRequested ? [] : roomNames) : null;
  const intent: PackageBuilderDraft["intent"] = componentCreateRequested
    ? "create_library_component"
    : targetsCurrentEstimate
      ? "fill_current_estimate"
      : "create_package_project";
  const fillCurrentEstimateBlockedReason = intent === "fill_current_estimate"
    ? currentEstimateTarget?.blockedReason ?? (currentEstimateTarget ? null : "Current estimate route context is required before Ask Flip can update or fill an existing estimate.")
    : null;
  const rowUpdatePlan = isUpdateCurrentEstimateRequest(message) && currentEstimateTarget ? buildRowUpdateDrafts(message, readData) : { rowUpdateDraft: [], blockedReason: null };
  const rowReplacementPlan = rowReplacementRequested && currentEstimateTarget ? buildRowReplacementDrafts(message, readData) : { rowReplacementDraft: [], blockedReason: null };
  const rowDeletePlan = rowDeleteRequested && currentEstimateTarget ? buildRowDeleteDrafts(message, readData) : { rowDeleteDraft: [], blockedReason: null };
  const nodeRenamePlan = nodeRenameRequested && currentEstimateTarget ? buildNodeRenameDrafts(message, readData) : { nodeRenameDraft: [], blockedReason: null };
  const treeDraft = componentCreateRequested
    ? []
    : currentEstimateTarget?.treeDraft ?? (targetsCurrentEstimate ? [] : buildTreeDraft(roomNames));
  const templateRowCopyPlan = templateRowCopyRequested && currentEstimateTarget
    ? buildTemplateRowCopyDrafts({
        message,
        targetTree: treeDraft,
        target: currentEstimateTarget.target,
        templateMatches: readData.templateMatches,
      })
    : { templateRowCopyDraft: [], blockedReason: null };
  const templateInsertPlan = templateInsertRequested && currentEstimateTarget
    ? buildTemplateInsertDrafts({
        message,
        targetTree: treeDraft,
        target: currentEstimateTarget.target,
        templateMatches: readData.templateMatches,
      })
    : { templateInsertDraft: [], blockedReason: null };
  const componentCreatePlan = componentCreateRequested
    ? buildComponentCreateDrafts(message)
    : { componentCreateDraft: [], blockedReason: null };
  const blockedReason = fillCurrentEstimateBlockedReason
    ?? componentCreatePlan.blockedReason
    ?? rowUpdatePlan.blockedReason
    ?? rowReplacementPlan.blockedReason
    ?? rowDeletePlan.blockedReason
    ?? nodeRenamePlan.blockedReason
    ?? templateRowCopyPlan.blockedReason
    ?? templateInsertPlan.blockedReason;
  const componentCreateDraft = blockedReason ? [] : componentCreatePlan.componentCreateDraft;
  const rowUpdateDraft = blockedReason ? [] : rowUpdatePlan.rowUpdateDraft;
  const rowReplacementDraft = blockedReason ? [] : rowReplacementPlan.rowReplacementDraft;
  const rowDeleteDraft = blockedReason ? [] : rowDeletePlan.rowDeleteDraft;
  const nodeRenameDraft = blockedReason ? [] : nodeRenamePlan.nodeRenameDraft;
  const templateRowCopyDraft = blockedReason ? [] : templateRowCopyPlan.templateRowCopyDraft;
  const templateInsertDraft = blockedReason ? [] : templateInsertPlan.templateInsertDraft;
  const rowDraft = blockedReason || componentCreateDraft.length > 0 || rowUpdateDraft.length > 0 || rowReplacementDraft.length > 0 || rowDeleteDraft.length > 0 || nodeRenameDraft.length > 0 || templateRowCopyDraft.length > 0 || templateInsertDraft.length > 0
    ? []
    : buildRows({
        brief,
        treeDraft,
        componentMatches: readData.componentMatches,
        historicalRows: readData.historicalRowMatches,
        comparablePackages: readData.comparableEstimatePackages,
        templateMatches: readData.templateMatches,
        searchTermHints,
        memoryPreferences: readData.memoryPreferences,
      });
  const componentCreateTotal = componentCreateDraft.reduce((sum, component) => sum + component.unitCost + component.miscCost, 0);
  const budgetSummary = componentCreateDraft.length > 0
    ? {
        targetBudget: componentCreateTotal,
        draftSubtotal: componentCreateTotal,
        allowanceTotal: 0,
        contingencyTotal: 0,
        draftTotal: componentCreateTotal,
        variance: 0,
        currencyCode: "PHP",
        completeness: "review-required" as const,
      }
    : buildPackageBudgetSummary({
        rows: rowDraft,
        additionalAllowanceTotal: calculateDraftAdditionalTotal({ rowReplacementDraft, templateRowCopyDraft, templateInsertDraft }),
        targetBudget: brief.targetBudget,
        currencyCode: brief.currencyCode,
      });
  const operations = buildOperations({
    treeDraft,
    rowDraft,
    componentCreateDraft,
    rowUpdateDraft,
    rowReplacementDraft,
    rowDeleteDraft,
    nodeRenameDraft,
    templateRowCopyDraft,
    templateInsertDraft,
    intent,
    target: currentEstimateTarget?.target ?? null,
  });
  const providerAssumptions = providerResult?.suggestion.assumptions?.filter(Boolean) ?? [];
  const providerWarnings = providerResult?.suggestion.warnings?.filter(Boolean) ?? [];
  const usedHistoricalPrecedents = rowDraft.some((row) => row.sourceSnapshot?.sourceType === "historical_estimate_row");
  const usedTemplateRowPrecedents = rowDraft.some((row) => row.sourceSnapshot?.sourceType === "estimate_template_row");
  const usedComparablePrecedents = usedComparablePackagePrecedents(rowDraft);
  const usedPortfolioComponentUsage = usedPriorProjectComponentUsage({
    rowDraft,
    treeDraft,
    historicalRows: readData.historicalRowMatches,
  });
  const usedMemoryPreferences = (readData.memoryPreferences?.componentSignals.length ?? 0) > 0
    || (readData.memoryPreferences?.templateSignals.length ?? 0) > 0;
  const firstComponentCreate = componentCreateDraft[0] ?? null;
  const projectDraftName = intent === "create_library_component"
    ? firstComponentCreate?.name ?? "Library Component Draft"
    : intent === "fill_current_estimate"
      ? readData.projectSummary?.name ?? brief.projectName
      : brief.projectName;
  const estimateDraftName = intent === "create_library_component"
    ? "Component Library"
    : intent === "fill_current_estimate"
    ? readData.estimateSummary?.name ?? `Initial ${brief.bedrooms} Bedroom Package Estimate`
    : `Initial ${brief.bedrooms} Bedroom Package Estimate`;
  const estimateSheetCode = intent === "create_library_component"
    ? null
    : intent === "fill_current_estimate"
      ? readData.estimateSummary?.sheetCode ?? "ES-001"
      : "ES-001";
  const warnings = [
    ...(intent === "create_library_component" ? [] : ["Generated/unmatched allowance rows are review items, not real supplier-priced component rows."]),
    ...providerWarnings,
    ...componentCreateDraft.flatMap((component) => component.warnings),
  ];

  const draft: PackageBuilderDraft = {
    schemaVersion: 1,
    mode: "draft",
    intent,
    draftId: `package-draft-${randomUUID()}`,
    target: currentEstimateTarget?.target ?? null,
    brief,
    projectDraft: {
      name: projectDraftName,
      clientName: null,
      location: null,
      projectBudget: budgetSummary.targetBudget,
    },
    estimateDraft: {
      name: estimateDraftName,
      sheetCode: estimateSheetCode,
    },
    treeDraft,
    rowDraft,
    rowUpdateDraft,
    rowReplacementDraft,
    rowDeleteDraft,
    nodeRenameDraft,
    templateRowCopyDraft,
    templateInsertDraft,
    componentCreateDraft,
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
      ...(intent === "fill_current_estimate" ? ["This draft targets the current estimate and may create missing Area Nodes before inserting reviewed rows; it does not create a project or estimate."] : []),
      ...componentCreateDraft.map((component) => `Component create will add ${component.name} to the workspace component library.`),
      ...nodeRenameDraft.map((rename) => `Node rename will change ${rename.currentName} to ${rename.nextName}.`),
      ...rowReplacementDraft.map((replacement) => `Row replacement will use ${replacement.material} from the scoped component library.`),
      ...rowDeleteDraft.map((deletion) => `Row delete will remove ${deletion.clientDraftId.replace(/^delete-row-/, "").replaceAll("-", " ")} from the current estimate.`),
      ...templateRowCopyDraft.map((copy) => `Template row copy will add ${copy.material} from ${copy.sourceTemplateName}.`),
      ...templateInsertDraft.map((templateInsert) => `Template insert will copy ${templateInsert.sourceTemplateName} into the current estimate root.`),
      ...buildTemplateAssumptions(readData.templateMatches),
      ...(usedMemoryPreferences ? ["Used previous Ask Flip accepted/rejected package feedback as ranking hints only."] : []),
      ...(usedPortfolioComponentUsage ? ["Used prior project component usage as ranking hints only."] : []),
      ...(usedComparablePrecedents ? ["Used comparable prior estimate packages as room and row pattern hints only."] : []),
      ...(usedHistoricalPrecedents ? ["Used matched prior project estimate rows as reviewed allowance precedents."] : []),
      ...(usedTemplateRowPrecedents ? ["Used matched estimate template rows as review-required allowance rows."] : []),
      ...providerAssumptions,
    ],
    warnings,
    applyEligibility: blockedReason
      ? { eligible: false, reasons: [blockedReason] }
      : { eligible: true, reasons: [] },
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
