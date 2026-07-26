import type { QualityFinding } from "./common";
import { unique } from "./common";

export const PROFILES = [
  "Q0_CONTRACT_ONLY",
  "Q1_CHANGE_GATE",
  "Q2_CRITICAL_CHANGE_GATE",
  "Q3_RELEASE_GATE",
] as const;

export type QualityProfile = (typeof PROFILES)[number];

export interface RiskRule {
  id: string;
  profile: QualityProfile;
  patterns: string[];
  capabilities?: string[];
  reason: string;
}

export interface RiskMap {
  schema_version: 1;
  rules: RiskRule[];
  prose_extensions: string[];
  executable_extensions: string[];
  release_flags: string[];
}

export interface Classification {
  profile: QualityProfile;
  reasons: string[];
  files: string[];
  affected_capabilities: string[];
  fail_closed: boolean;
  rejected_downgrade?: QualityProfile;
}

export function profileRank(profile: QualityProfile): number {
  return PROFILES.indexOf(profile);
}

function globMatches(path: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replaceAll("**", "\u0000")
    .replaceAll("*", "[^/]*")
    .replaceAll("\u0000", ".*");
  return new RegExp(`^${escaped}$`, "u").test(path);
}

function extensionOf(path: string): string {
  const match = path.match(/(\.[^./]+)$/u);
  return match?.[1]?.toLowerCase() ?? "";
}

interface ClassificationState {
  profile: QualityProfile;
  reasons: string[];
  capabilities: string[];
  failClosed: boolean;
}

function raiseProfile(state: ClassificationState, candidate: QualityProfile): void {
  if (profileRank(candidate) > profileRank(state.profile)) state.profile = candidate;
}

function applyMatchingRules(
  file: string,
  matchingRules: RiskRule[],
  state: ClassificationState,
): void {
  for (const rule of matchingRules) {
    raiseProfile(state, rule.profile);
    state.reasons.push(`${rule.id}: ${file}: ${rule.reason}`);
    state.capabilities.push(...(rule.capabilities ?? []));
  }
}

function classifyFile(file: string, riskMap: RiskMap, state: ClassificationState): void {
  const matchingRules = riskMap.rules.filter((rule) =>
    rule.patterns.some((pattern) => globMatches(file, pattern))
  );
  if (matchingRules.length > 0) {
    applyMatchingRules(file, matchingRules, state);
    return;
  }

  const extension = extensionOf(file);
  if (riskMap.prose_extensions.includes(extension)) {
    state.reasons.push(`PROSE: ${file}: contract or prose-only change`);
    return;
  }
  if (riskMap.executable_extensions.includes(extension)) {
    raiseProfile(state, "Q1_CHANGE_GATE");
    state.reasons.push(`EXECUTABLE: ${file}: ordinary executable change`);
    return;
  }
  state.profile = "Q2_CRITICAL_CHANGE_GATE";
  state.failClosed = true;
  state.reasons.push(`UNKNOWN: ${file}: no deterministic risk rule; fail closed`);
}

function applyReleaseSelection(
  files: string[],
  riskMap: RiskMap,
  release: boolean | undefined,
  state: ClassificationState,
): void {
  const releasePathChanged = files.some((file) =>
    riskMap.release_flags.some((pattern) => globMatches(file, pattern))
  );
  if (!release && !releasePathChanged) return;
  state.profile = "Q3_RELEASE_GATE";
  state.reasons.push("RELEASE: release flag or release workflow selected");
}

function applyImpactSelection(
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined,
  state: ClassificationState,
): void {
  if (risk !== "HIGH" && risk !== "CRITICAL") return;
  raiseProfile(state, "Q2_CRITICAL_CHANGE_GATE");
  state.reasons.push(`GITNEXUS: ${risk} upstream impact`);
}

function applyRequestedProfile(
  requestedProfile: QualityProfile | undefined,
  state: ClassificationState,
  findings: QualityFinding[],
): QualityProfile | undefined {
  if (!requestedProfile) return undefined;
  const requestedRank = profileRank(requestedProfile);
  const selectedRank = profileRank(state.profile);
  if (requestedRank < selectedRank) {
    findings.push({
      code: "PROFILE_DOWNGRADE_REJECTED",
      message: `Requested ${requestedProfile} is weaker than selected ${state.profile}`,
    });
    return requestedProfile;
  }
  if (requestedRank > selectedRank) {
    state.profile = requestedProfile;
    state.reasons.push(`USER_ESCALATION: explicitly escalated to ${requestedProfile}`);
  }
  return undefined;
}

export function classifyFiles(
  inputFiles: string[],
  riskMap: RiskMap,
  options: {
    requestedProfile?: QualityProfile;
    release?: boolean;
    gitNexusRisk?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    classifierError?: string;
  } = {},
): { classification: Classification; findings: QualityFinding[] } {
  const findings: QualityFinding[] = [];
  const files = unique(inputFiles.map((file) => file.trim()).filter(Boolean)).sort();
  const state: ClassificationState = {
    profile: "Q0_CONTRACT_ONLY",
    reasons: [],
    capabilities: [],
    failClosed: false,
  };

  if (options.classifierError || files.length === 0) {
    state.profile = "Q2_CRITICAL_CHANGE_GATE";
    state.failClosed = true;
    state.reasons.push(
      options.classifierError ?? "No changed paths were available; fail closed.",
    );
  }

  for (const file of files) classifyFile(file, riskMap, state);
  applyReleaseSelection(files, riskMap, options.release, state);
  applyImpactSelection(options.gitNexusRisk, state);
  const rejectedDowngrade = applyRequestedProfile(options.requestedProfile, state, findings);

  return {
    classification: {
      profile: state.profile,
      reasons: unique(state.reasons),
      files,
      affected_capabilities: unique(state.capabilities).sort(),
      fail_closed: state.failClosed,
      ...(rejectedDowngrade ? { rejected_downgrade: rejectedDowngrade } : {}),
    },
    findings,
  };
}
