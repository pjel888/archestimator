export const CLIENT_PORTAL_NARRATIVE_SCHEMA_VERSION = 1 as const;

export const CLIENT_PORTAL_NARRATIVE_CATEGORIES = [
  "summary",
  "included",
  "excluded",
  "unresolved",
  "warnings",
] as const;

export type ClientPortalNarrativeCategory = (typeof CLIENT_PORTAL_NARRATIVE_CATEGORIES)[number];

export type ClientPortalNarrativeInput = {
  schemaVersion: typeof CLIENT_PORTAL_NARRATIVE_SCHEMA_VERSION;
  issueLabel: string;
  issueKind: string;
  comparison: {
    baselineLabel: string | null;
    issueLabel: string | null;
  };
  included: {
    estimates: string[];
    artifacts: string[];
    requests: string[];
  };
  assumptions: string[];
  exclusions: string[];
  unresolved: string[];
  requestedDecision: string;
};

type ClientPortalNarrativeFact = {
  id: string;
  text: string;
};

export type ClientPortalNarrativeFacts = Record<ClientPortalNarrativeCategory, ClientPortalNarrativeFact[]>;

export type ClientPortalNarrativeSelection = Record<ClientPortalNarrativeCategory, string[]>;

export type ClientPortalNarrativeResponse = {
  schemaVersion: typeof CLIENT_PORTAL_NARRATIVE_SCHEMA_VERSION;
  draftRevision: number;
  inputFingerprint: string;
  narrative: string;
  selection: ClientPortalNarrativeSelection;
  source: "ai" | "deterministic";
  provider: string;
  model: string;
  fallbackReason: "disabled" | "unconfigured" | "timeout" | "invalid_output" | "provider_error" | null;
  runId: string;
  generatedAt: string;
  inputHash: string;
  outputHash: string;
};

type NarrativeDraft = {
  assumptions: string[];
  artifacts: Array<{ artifactVersionId: string; sortOrder: number }>;
  basedOnBaselineId: string | null;
  comparisonIssueId: string | null;
  draftRevision: number;
  estimates: Array<{ estimateId: string; included: boolean; sortOrder: number }>;
  exclusions: string[];
  issueKind: string;
  requestedDecision: string;
  requests: Array<{ requestVersionId: string; sortOrder: number }>;
  unresolvedItems: string[];
  versionLabel: string | null;
};

type NarrativeSources = {
  artifacts: Array<{ artifactVersionId: string; revisionLabel: string | null; title: string; versionNumber: number }>;
  baselines: Array<{ id: string; issueLabel: string }>;
  estimates: Array<{ id: string; name: string; sheetCode: string | null }>;
  issues: Array<{ id: string; issueNumber: number; versionLabel: string }>;
  requests: Array<{ requestCode: string; requestVersionId: string; title: string }>;
};

const MAX_TEXT_LENGTH = 240;
const MAX_FACTS_PER_CATEGORY = 32;

function cleanText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
}

function cleanList(values: readonly string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = cleanText(value);
    const key = cleaned.toLocaleLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length === MAX_FACTS_PER_CATEGORY) break;
  }
  return result;
}

function sorted<T extends { sortOrder: number }>(values: readonly T[]) {
  return [...values].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function buildClientPortalNarrativeInput(input: { draft: NarrativeDraft; sources: NarrativeSources }): ClientPortalNarrativeInput {
  const estimateById = new Map(input.sources.estimates.map((source) => [source.id, source]));
  const artifactByVersionId = new Map(input.sources.artifacts.map((source) => [source.artifactVersionId, source]));
  const requestByVersionId = new Map(input.sources.requests.map((source) => [source.requestVersionId, source]));
  const baselineById = new Map(input.sources.baselines.map((source) => [source.id, source]));
  const issueById = new Map(input.sources.issues.map((source) => [source.id, source]));

  return {
    schemaVersion: CLIENT_PORTAL_NARRATIVE_SCHEMA_VERSION,
    issueLabel: cleanText(input.draft.versionLabel, "This issue"),
    issueKind: cleanText(input.draft.issueKind.replaceAll("_", " "), "issue"),
    comparison: {
      baselineLabel: input.draft.basedOnBaselineId
        ? cleanText(baselineById.get(input.draft.basedOnBaselineId)?.issueLabel) || null
        : null,
      issueLabel: input.draft.comparisonIssueId
        ? (() => {
            const issue = issueById.get(input.draft.comparisonIssueId);
            return issue ? cleanText(`#${issue.issueNumber} · ${issue.versionLabel}`) : null;
          })()
        : null,
    },
    included: {
      estimates: cleanList(sorted(input.draft.estimates).flatMap((selection) => {
        if (!selection.included) return [];
        const source = estimateById.get(selection.estimateId);
        return source ? [`${source.sheetCode ? `${source.sheetCode} · ` : ""}${source.name}`] : [];
      })),
      artifacts: cleanList(sorted(input.draft.artifacts).flatMap((selection) => {
        const source = artifactByVersionId.get(selection.artifactVersionId);
        return source ? [`${source.title} · v${source.versionNumber}${source.revisionLabel ? ` · ${source.revisionLabel}` : ""}`] : [];
      })),
      requests: cleanList(sorted(input.draft.requests).flatMap((selection) => {
        const source = requestByVersionId.get(selection.requestVersionId);
        return source ? [`${source.requestCode} · ${source.title}`] : [];
      })),
    },
    assumptions: cleanList(input.draft.assumptions),
    exclusions: cleanList(input.draft.exclusions),
    unresolved: cleanList(input.draft.unresolvedItems),
    requestedDecision: cleanText(input.draft.requestedDecision.replaceAll("_", " "), "none"),
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, canonicalize(nested)]));
}

export function canonicalSerializeClientPortalNarrative(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

export function buildClientPortalNarrativeInputFingerprint(input: { draftRevision: number; changeSet: ClientPortalNarrativeInput }) {
  const value = canonicalSerializeClientPortalNarrative(input.changeSet);
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `narrative-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function countPhrase(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function facts(category: ClientPortalNarrativeCategory, values: readonly string[]): ClientPortalNarrativeFact[] {
  return cleanList(values).map((text, index) => ({ id: `${category}-${index + 1}`, text }));
}

export function buildClientPortalNarrativeFacts(input: ClientPortalNarrativeInput): ClientPortalNarrativeFacts {
  const summary = [
    `${input.issueLabel} is a ${input.issueKind} package.`,
    input.comparison.baselineLabel ? `It is based on ${input.comparison.baselineLabel}.` : "No accepted baseline is selected.",
    input.comparison.issueLabel ? `It is compared with ${input.comparison.issueLabel}.` : "No prior issue comparison is selected.",
    `It includes ${countPhrase(input.included.estimates.length, "estimate")}, ${countPhrase(input.included.artifacts.length, "artifact")}, and ${countPhrase(input.included.requests.length, "change request")}.`,
    input.requestedDecision === "none" ? "No recipient decision is requested." : `The requested recipient decision is ${input.requestedDecision}.`,
  ];
  return {
    summary: facts("summary", summary),
    included: facts("included", [
      ...input.included.estimates.map((value) => `Estimate: ${value}`),
      ...input.included.artifacts.map((value) => `Artifact: ${value}`),
      ...input.included.requests.map((value) => `Change request: ${value}`),
    ]),
    excluded: facts("excluded", input.exclusions),
    unresolved: facts("unresolved", input.unresolved),
    warnings: facts("warnings", input.assumptions.map((value) => `Assumption: ${value}`)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value: Record<string, unknown>) {
  const keys = Object.keys(value).sort();
  const expected = [...CLIENT_PORTAL_NARRATIVE_CATEGORIES].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error("Narrative provider output must contain only summary, included, excluded, unresolved, and warnings.");
  }
}

export function parseClientPortalNarrativeSelection(value: unknown, availableFacts: ClientPortalNarrativeFacts): ClientPortalNarrativeSelection {
  if (!isRecord(value)) throw new Error("Narrative provider output must be an object.");
  assertExactKeys(value);
  const selection = {} as ClientPortalNarrativeSelection;
  for (const category of CLIENT_PORTAL_NARRATIVE_CATEGORIES) {
    const selectedIds = value[category];
    if (!Array.isArray(selectedIds) || selectedIds.length > MAX_FACTS_PER_CATEGORY || selectedIds.some((id) => typeof id !== "string")) {
      throw new Error(`Narrative provider ${category} must be an array of fact IDs.`);
    }
    const allowed = new Set(availableFacts[category].map((fact) => fact.id));
    const unique = [...new Set(selectedIds as string[])];
    if (unique.length !== selectedIds.length || unique.some((id) => !allowed.has(id))) {
      throw new Error(`Narrative provider ${category} contains an unsupported fact ID.`);
    }
    selection[category] = unique;
  }
  if (selection.summary.length === 0) throw new Error("Narrative provider must select at least one summary fact.");
  return selection;
}

export function createDeterministicClientPortalNarrativeSelection(factsByCategory: ClientPortalNarrativeFacts): ClientPortalNarrativeSelection {
  return Object.fromEntries(CLIENT_PORTAL_NARRATIVE_CATEGORIES.map((category) => [category, factsByCategory[category].map((fact) => fact.id)])) as ClientPortalNarrativeSelection;
}

export function renderClientPortalNarrative(factsByCategory: ClientPortalNarrativeFacts, selection: ClientPortalNarrativeSelection) {
  const textById = new Map(CLIENT_PORTAL_NARRATIVE_CATEGORIES.flatMap((category) => factsByCategory[category].map((fact) => [fact.id, fact.text] as const)));
  const selectedText = (category: ClientPortalNarrativeCategory) => selection[category].map((id) => textById.get(id)).filter((value): value is string => Boolean(value));
  const summary = selectedText("summary").join(" ");
  const sections = [
    ["Included", selectedText("included")],
    ["Excluded", selectedText("excluded")],
    ["Unresolved", selectedText("unresolved")],
    ["Warnings", selectedText("warnings")],
  ] as const;
  return [summary, ...sections.flatMap(([label, values]) => values.length ? [`${label}: ${values.join("; ")}.`] : [])].filter(Boolean).join("\n\n");
}

const NARRATIVE_RESPONSE_STRING_FIELDS = ["inputFingerprint", "narrative", "provider", "model", "runId", "generatedAt", "inputHash", "outputHash"] as const;
const NARRATIVE_FALLBACK_REASONS = new Set([null, "disabled", "unconfigured", "timeout", "invalid_output", "provider_error"]);

function assertNarrativeResponseMetadata(value: Record<string, unknown>) {
  const validIdentity = value.schemaVersion === CLIENT_PORTAL_NARRATIVE_SCHEMA_VERSION && Number.isInteger(value.draftRevision);
  const validStrings = NARRATIVE_RESPONSE_STRING_FIELDS.every((field) => typeof value[field] === "string");
  const validSource = value.source === "ai" || value.source === "deterministic";
  const validFallback = NARRATIVE_FALLBACK_REASONS.has((value.fallbackReason ?? null) as never);
  if (!validIdentity || !validStrings || !validSource || !validFallback) {
    throw new Error("Narrative response metadata is invalid.");
  }
}

function narrativeResponseSelection(value: unknown) {
  if (!isRecord(value)) throw new Error("Narrative response selection is invalid.");
  const selection = {} as ClientPortalNarrativeSelection;
  for (const category of CLIENT_PORTAL_NARRATIVE_CATEGORIES) {
    const identifiers = value[category];
    if (!Array.isArray(identifiers) || identifiers.some((identifier) => typeof identifier !== "string")) {
      throw new Error("Narrative response selection is invalid.");
    }
    selection[category] = [...identifiers] as string[];
  }
  return selection;
}

export function parseClientPortalNarrativeResponse(value: unknown): ClientPortalNarrativeResponse {
  if (!isRecord(value)) throw new Error("Narrative response is invalid.");
  assertNarrativeResponseMetadata(value);
  const selection = narrativeResponseSelection(value.selection);
  return { ...value, fallbackReason: (value.fallbackReason ?? null) as ClientPortalNarrativeResponse["fallbackReason"], selection } as ClientPortalNarrativeResponse;
}
