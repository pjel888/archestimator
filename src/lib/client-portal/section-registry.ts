import { CLIENT_PORTAL_SECTION_KINDS, type ClientPortalSectionKind } from "@/lib/client-portal/contracts";

export const CLIENT_PORTAL_SECTION_DRAFT_SCHEMA_VERSION = 1 as const;
export const CLIENT_PORTAL_SECTION_PUBLIC_SCHEMA_VERSION = 1 as const;

const CLIENT_PORTAL_LAYOUT_MODES = ["standard", "wide", "split", "rail"] as const;
const CLIENT_PORTAL_FORBIDDEN_ISSUED_FIELDS = new Set([
  "margin",
  "internal_markup",
  "internal_source",
  "provenance",
  "html",
  "css",
  "script",
  "sql",
  "query",
]);
const CLIENT_PORTAL_CONTROLLED_ISSUED_FIELDS = new Set(["supplier", "unit_cost", "misc_cost", "adjustment_detail"]);

export type ClientPortalLayoutMode = (typeof CLIENT_PORTAL_LAYOUT_MODES)[number];
export type ClientPortalPublicValue = string | number | boolean | null | ClientPortalPublicValue[] | { [key: string]: ClientPortalPublicValue };

type ClientPortalSectionConfigByKind = {
  overview: { showProjectDates?: boolean; showPreparedFor?: boolean; showIssueTotal?: boolean };
  estimate_browser: { selectedEstimateIds?: string[]; defaultGrouping?: "area" | "group" | "discipline"; allowRowDiscussion?: boolean };
  financial_summary: { metricIds?: string[]; includeContingency?: boolean };
  cost_breakdown: { groupBy?: "area" | "category" | "discipline" | "supplier"; includeCharts?: boolean };
  estimate_comparison: { compareIssueIds?: string[]; displayMode?: "absolute" | "percentage" };
  assumptions_exclusions: { showAssumptions?: boolean; showExclusions?: boolean };
  discussion: { defaultTarget?: "all" | "section" | "estimate"; allowClientCreation?: boolean };
  activity: { mode?: "none" | "collaboration" | "full_safe"; showReadReceipts?: boolean };
  decision: { showFormalDecision?: boolean; confirmationCopy?: string };
};

export type ClientPortalSectionDraftByKind = {
  [Kind in ClientPortalSectionKind]: {
    schemaVersion: typeof CLIENT_PORTAL_SECTION_DRAFT_SCHEMA_VERSION;
    id: string;
    kind: Kind;
    title: string;
    description: string | null;
    sortOrder: number;
    enabled: boolean;
    layoutMode: ClientPortalLayoutMode;
    visibleFields: string[];
    commentable: boolean;
    downloadable: boolean;
    config: ClientPortalSectionConfigByKind[Kind];
  };
}[ClientPortalSectionKind];

export type ClientPortalSectionDraft = ClientPortalSectionDraftByKind;

export type ClientPortalPublicSectionManifest = {
  schemaVersion: typeof CLIENT_PORTAL_SECTION_PUBLIC_SCHEMA_VERSION;
  id: string;
  kind: ClientPortalSectionKind;
  title: string;
  description: string | null;
  sortOrder: number;
  layoutMode: ClientPortalLayoutMode;
  payloadHash: string;
  payload: ClientPortalPublicValue;
};

export type ClientPortalSectionRegistryEntry = {
  kind: ClientPortalSectionKind;
  draftSchemaVersion: typeof CLIENT_PORTAL_SECTION_DRAFT_SCHEMA_VERSION;
  publicSchemaVersion: typeof CLIENT_PORTAL_SECTION_PUBLIC_SCHEMA_VERSION;
  allowedLayoutModes: readonly ClientPortalLayoutMode[];
  defaultLayoutMode: ClientPortalLayoutMode;
  defaultCommentable: boolean;
  defaultDownloadable: boolean;
  configKeys: readonly string[];
};

const configKeysByKind: Record<ClientPortalSectionKind, readonly string[]> = {
  overview: ["showProjectDates", "showPreparedFor", "showIssueTotal"],
  estimate_browser: ["selectedEstimateIds", "defaultGrouping", "allowRowDiscussion"],
  financial_summary: ["metricIds", "includeContingency"],
  cost_breakdown: ["groupBy", "includeCharts"],
  estimate_comparison: ["compareIssueIds", "displayMode"],
  assumptions_exclusions: ["showAssumptions", "showExclusions"],
  discussion: ["defaultTarget", "allowClientCreation"],
  activity: ["mode", "showReadReceipts"],
  decision: ["showFormalDecision", "confirmationCopy"],
};

export const CLIENT_PORTAL_SECTION_REGISTRY: Record<ClientPortalSectionKind, ClientPortalSectionRegistryEntry> = {
  overview: entry("overview", ["standard", "wide"], "standard", true, false),
  estimate_browser: entry("estimate_browser", ["standard", "wide", "split"], "wide", true, true),
  financial_summary: entry("financial_summary", ["standard", "wide"], "wide", true, true),
  cost_breakdown: entry("cost_breakdown", ["standard", "wide"], "wide", true, true),
  estimate_comparison: entry("estimate_comparison", ["standard", "wide"], "wide", true, true),
  assumptions_exclusions: entry("assumptions_exclusions", ["standard", "wide"], "standard", true, true),
  discussion: entry("discussion", ["standard", "wide", "split"], "split", true, false),
  activity: entry("activity", ["standard", "wide"], "standard", false, false),
  decision: entry("decision", ["standard", "wide"], "standard", true, true),
};

export class ClientPortalSectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientPortalSectionValidationError";
  }
}

function entry(
  kind: ClientPortalSectionKind,
  allowedLayoutModes: readonly ClientPortalLayoutMode[],
  defaultLayoutMode: ClientPortalLayoutMode,
  defaultCommentable: boolean,
  defaultDownloadable: boolean,
): ClientPortalSectionRegistryEntry {
  return {
    kind,
    draftSchemaVersion: CLIENT_PORTAL_SECTION_DRAFT_SCHEMA_VERSION,
    publicSchemaVersion: CLIENT_PORTAL_SECTION_PUBLIC_SCHEMA_VERSION,
    allowedLayoutModes,
    defaultLayoutMode,
    defaultCommentable,
    defaultDownloadable,
    configKeys: configKeysByKind[kind],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, path: string) {
  if (typeof value !== "string" || value.trim().length === 0) throw new ClientPortalSectionValidationError(`${path} must be a non-empty string`);
  return value;
}

function requireBoolean(value: unknown, path: string) {
  if (typeof value !== "boolean") throw new ClientPortalSectionValidationError(`${path} must be a boolean`);
  return value;
}

function requireStringArray(value: unknown, path: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new ClientPortalSectionValidationError(`${path} must be an array of non-empty strings`);
  }
  return [...value];
}

function optionalBoolean(config: Record<string, unknown>, key: string) {
  if (config[key] === undefined) return undefined;
  return requireBoolean(config[key], `config.${key}`);
}

function optionalStringArray(config: Record<string, unknown>, key: string) {
  if (config[key] === undefined) return undefined;
  return requireStringArray(config[key], `config.${key}`);
}

function optionalEnum<Value extends string>(config: Record<string, unknown>, key: string, values: readonly Value[]) {
  if (config[key] === undefined) return undefined;
  if (typeof config[key] !== "string" || !values.includes(config[key] as Value)) {
    throw new ClientPortalSectionValidationError(`config.${key} must be one of: ${values.join(", ")}`);
  }
  return config[key] as Value;
}

function validateConfig(kind: ClientPortalSectionKind, value: unknown): ClientPortalSectionConfigByKind[ClientPortalSectionKind] {
  if (!isRecord(value)) throw new ClientPortalSectionValidationError("config must be an object");

  const allowedKeys = configKeysByKind[kind];
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) throw new ClientPortalSectionValidationError(`config.${key} is not allowed for ${kind}`);
  }

  switch (kind) {
    case "overview":
      return { showProjectDates: optionalBoolean(value, "showProjectDates"), showPreparedFor: optionalBoolean(value, "showPreparedFor"), showIssueTotal: optionalBoolean(value, "showIssueTotal") };
    case "estimate_browser":
      return { selectedEstimateIds: optionalStringArray(value, "selectedEstimateIds"), defaultGrouping: optionalEnum(value, "defaultGrouping", ["area", "group", "discipline"]), allowRowDiscussion: optionalBoolean(value, "allowRowDiscussion") };
    case "financial_summary":
      return { metricIds: optionalStringArray(value, "metricIds"), includeContingency: optionalBoolean(value, "includeContingency") };
    case "cost_breakdown":
      return { groupBy: optionalEnum(value, "groupBy", ["area", "category", "discipline", "supplier"]), includeCharts: optionalBoolean(value, "includeCharts") };
    case "estimate_comparison":
      return { compareIssueIds: optionalStringArray(value, "compareIssueIds"), displayMode: optionalEnum(value, "displayMode", ["absolute", "percentage"]) };
    case "assumptions_exclusions":
      return { showAssumptions: optionalBoolean(value, "showAssumptions"), showExclusions: optionalBoolean(value, "showExclusions") };
    case "discussion":
      return { defaultTarget: optionalEnum(value, "defaultTarget", ["all", "section", "estimate"]), allowClientCreation: optionalBoolean(value, "allowClientCreation") };
    case "activity":
      return { mode: optionalEnum(value, "mode", ["none", "collaboration", "full_safe"]), showReadReceipts: optionalBoolean(value, "showReadReceipts") };
    case "decision":
      return { showFormalDecision: optionalBoolean(value, "showFormalDecision"), confirmationCopy: value.confirmationCopy === undefined ? undefined : requireString(value.confirmationCopy, "config.confirmationCopy") };
  }
}

export function parseClientPortalSectionDraft(value: unknown): ClientPortalSectionDraft {
  if (!isRecord(value)) throw new ClientPortalSectionValidationError("section draft must be an object");

  const allowedKeys = new Set(["schemaVersion", "id", "kind", "title", "description", "sortOrder", "enabled", "layoutMode", "visibleFields", "commentable", "downloadable", "config"]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) throw new ClientPortalSectionValidationError(`section draft field ${key} is not allowed`);
  }
  if (value.schemaVersion !== CLIENT_PORTAL_SECTION_DRAFT_SCHEMA_VERSION) throw new ClientPortalSectionValidationError("unsupported section draft schemaVersion");
  if (typeof value.kind !== "string" || !CLIENT_PORTAL_SECTION_KINDS.includes(value.kind as ClientPortalSectionKind)) {
    throw new ClientPortalSectionValidationError("unknown section kind");
  }

  const kind = value.kind as ClientPortalSectionKind;
  const registryEntry = CLIENT_PORTAL_SECTION_REGISTRY[kind];
  if (typeof value.layoutMode !== "string" || !registryEntry.allowedLayoutModes.includes(value.layoutMode as ClientPortalLayoutMode)) {
    throw new ClientPortalSectionValidationError(`layoutMode is not allowed for ${kind}`);
  }
  if (!Number.isInteger(value.sortOrder) || (value.sortOrder as number) < 0) throw new ClientPortalSectionValidationError("sortOrder must be a non-negative integer");
  if (value.description !== null && typeof value.description !== "string") throw new ClientPortalSectionValidationError("description must be a string or null");

  return {
    schemaVersion: CLIENT_PORTAL_SECTION_DRAFT_SCHEMA_VERSION,
    id: requireString(value.id, "id"),
    kind,
    title: requireString(value.title, "title"),
    description: value.description as string | null,
    sortOrder: value.sortOrder as number,
    enabled: requireBoolean(value.enabled, "enabled"),
    layoutMode: value.layoutMode as ClientPortalLayoutMode,
    visibleFields: requireStringArray(value.visibleFields, "visibleFields"),
    commentable: requireBoolean(value.commentable, "commentable"),
    downloadable: requireBoolean(value.downloadable, "downloadable"),
    config: validateConfig(kind, value.config),
  } as ClientPortalSectionDraft;
}

export function sanitizeClientPortalIssuedPayload(value: unknown, visibleFields: readonly string[]): ClientPortalPublicValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeClientPortalIssuedPayload(item, visibleFields));
  if (!isRecord(value)) throw new ClientPortalSectionValidationError("issued payload values must be JSON compatible");

  const payload: Record<string, ClientPortalPublicValue> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (CLIENT_PORTAL_FORBIDDEN_ISSUED_FIELDS.has(key)) continue;
    if (CLIENT_PORTAL_CONTROLLED_ISSUED_FIELDS.has(key) && !visibleFields.includes(key)) continue;
    payload[key] = sanitizeClientPortalIssuedPayload(nestedValue, visibleFields);
  }
  return payload;
}

export function buildClientPortalPublicSection(
  draft: ClientPortalSectionDraft,
  payloadHash: string,
  payload: unknown,
): ClientPortalPublicSectionManifest {
  if (!payloadHash.trim()) throw new ClientPortalSectionValidationError("payloadHash must be a non-empty string");

  return {
    schemaVersion: CLIENT_PORTAL_SECTION_PUBLIC_SCHEMA_VERSION,
    id: draft.id,
    kind: draft.kind,
    title: draft.title,
    description: draft.description,
    sortOrder: draft.sortOrder,
    layoutMode: draft.layoutMode,
    payloadHash,
    payload: sanitizeClientPortalIssuedPayload(payload, draft.visibleFields),
  };
}
