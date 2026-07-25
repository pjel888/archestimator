import type { QualityFinding } from "./common";

export interface KnipIssueIdentity {
  type: string;
  file: string;
  symbol: string;
}

export interface KnipJson {
  issues: Array<Record<string, unknown> & { file?: string }>;
}

export interface KnipBaseline {
  schema_version: 1;
  tool: "knip";
  identity_contract: "type-file-symbol-v1";
  measurement: { issue_count: number };
  measured_legacy_issues: KnipIssueIdentity[];
}

const KNIP_METADATA_KEYS = new Set(["file", "owners"]);

function itemSymbol(item: unknown): string {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return JSON.stringify(item);
  if (Array.isArray(item)) {
    return item.map(itemSymbol).sort().join(" <-> ");
  }
  const value = item as Record<string, unknown>;
  if (typeof value.name === "string") return value.name;
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !["line", "col", "pos"].includes(key))
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
}

export function normalizeKnipIssues(payload: KnipJson): KnipIssueIdentity[] {
  const identities: KnipIssueIdentity[] = [];
  for (const issue of payload.issues ?? []) {
    const file = typeof issue.file === "string" ? issue.file : "package.json";
    for (const [type, rawItems] of Object.entries(issue)) {
      if (KNIP_METADATA_KEYS.has(type) || !Array.isArray(rawItems)) continue;
      if (type === "duplicates") {
        if (rawItems.length > 0) {
          identities.push({
            type,
            file,
            symbol: rawItems.map(itemSymbol).sort().join(" <-> "),
          });
        }
        continue;
      }
      for (const item of rawItems) {
        identities.push({ type, file, symbol: itemSymbol(item) });
      }
    }
  }
  return [...new Map(
    identities
      .sort(compareKnipIdentities)
      .map((identity) => [knipIdentityKey(identity), identity]),
  ).values()];
}

export function knipIdentityKey(identity: KnipIssueIdentity): string {
  return `${identity.type}\u0000${identity.file}\u0000${identity.symbol}`;
}

function compareKnipIdentities(
  left: KnipIssueIdentity,
  right: KnipIssueIdentity,
): number {
  return knipIdentityKey(left).localeCompare(knipIdentityKey(right));
}

export function compareKnipBaseline(
  measured: KnipIssueIdentity[],
  baseline: KnipIssueIdentity[],
  maximumNewIssues: number,
): {
  findings: QualityFinding[];
  new_issues: KnipIssueIdentity[];
  resolved_legacy_issues: KnipIssueIdentity[];
} {
  const measuredKeys = new Map(measured.map((identity) => [knipIdentityKey(identity), identity]));
  const baselineKeys = new Map(baseline.map((identity) => [knipIdentityKey(identity), identity]));
  const newIssues = [...measuredKeys]
    .filter(([key]) => !baselineKeys.has(key))
    .map(([, identity]) => identity)
    .sort(compareKnipIdentities);
  const resolvedLegacyIssues = [...baselineKeys]
    .filter(([key]) => !measuredKeys.has(key))
    .map(([, identity]) => identity)
    .sort(compareKnipIdentities);
  const findings: QualityFinding[] = [];

  if (newIssues.length > maximumNewIssues) {
    for (const identity of newIssues) {
      findings.push({
        code: identity.type === "cycles" ? "NEW_IMPORT_CYCLE" : "NEW_KNIP_DEBT",
        message: `New Knip ${identity.type} identity: ${identity.file} :: ${identity.symbol}`,
        path: identity.file,
        detail: identity,
      });
    }
  }
  if (resolvedLegacyIssues.length > 0) {
    findings.push({
      code: "STATIC_BASELINE_RATCHET_REQUIRED",
      message:
        `${resolvedLegacyIssues.length} legacy Knip identity/identities were resolved; ` +
        "remove them from quality/static-debt-baseline.json",
      detail: resolvedLegacyIssues,
    });
  }
  return { findings, new_issues: newIssues, resolved_legacy_issues: resolvedLegacyIssues };
}

export function validateKnipBaseline(baseline: KnipBaseline): QualityFinding[] {
  const findings: QualityFinding[] = [];
  if (
    baseline.schema_version !== 1 ||
    baseline.tool !== "knip" ||
    baseline.identity_contract !== "type-file-symbol-v1" ||
    !Array.isArray(baseline.measured_legacy_issues)
  ) {
    return [{
      code: "STATIC_BASELINE_MALFORMED",
      message: "Static debt baseline metadata or identity array is malformed",
    }];
  }
  const keys = baseline.measured_legacy_issues.map(knipIdentityKey);
  if (new Set(keys).size !== keys.length) {
    findings.push({
      code: "STATIC_BASELINE_DUPLICATE",
      message: "Static debt baseline contains duplicate Knip identities",
    });
  }
  if (baseline.measurement?.issue_count !== keys.length) {
    findings.push({
      code: "STATIC_BASELINE_COUNT",
      message:
        `Static debt baseline declares ${baseline.measurement?.issue_count} identities ` +
        `but contains ${keys.length}`,
    });
  }
  if (
    JSON.stringify(keys) !==
    JSON.stringify([...keys].sort((left, right) => left.localeCompare(right)))
  ) {
    findings.push({
      code: "STATIC_BASELINE_ORDER",
      message: "Static debt baseline identities must use deterministic sorted order",
    });
  }
  return findings;
}
