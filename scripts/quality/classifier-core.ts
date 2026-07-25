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
  const reasons: string[] = [];
  const capabilities: string[] = [];
  let profile: QualityProfile = "Q0_CONTRACT_ONLY";
  let failClosed = false;

  if (options.classifierError || files.length === 0) {
    profile = "Q2_CRITICAL_CHANGE_GATE";
    failClosed = true;
    reasons.push(options.classifierError ?? "No changed paths were available; fail closed.");
  }

  for (const file of files) {
    const matchingRules = riskMap.rules.filter((rule) =>
      rule.patterns.some((pattern) => globMatches(file, pattern))
    );
    if (matchingRules.length > 0) {
      for (const rule of matchingRules) {
        if (profileRank(rule.profile) > profileRank(profile)) profile = rule.profile;
        reasons.push(`${rule.id}: ${file}: ${rule.reason}`);
        capabilities.push(...(rule.capabilities ?? []));
      }
      continue;
    }

    const extension = extensionOf(file);
    if (riskMap.prose_extensions.includes(extension)) {
      reasons.push(`PROSE: ${file}: contract or prose-only change`);
    } else if (riskMap.executable_extensions.includes(extension)) {
      if (profileRank(profile) < profileRank("Q1_CHANGE_GATE")) profile = "Q1_CHANGE_GATE";
      reasons.push(`EXECUTABLE: ${file}: ordinary executable change`);
    } else {
      profile = "Q2_CRITICAL_CHANGE_GATE";
      failClosed = true;
      reasons.push(`UNKNOWN: ${file}: no deterministic risk rule; fail closed`);
    }
  }

  if (
    options.release ||
    files.some((file) => riskMap.release_flags.some((pattern) => globMatches(file, pattern)))
  ) {
    profile = "Q3_RELEASE_GATE";
    reasons.push("RELEASE: release flag or release workflow selected");
  }

  if (options.gitNexusRisk === "HIGH" || options.gitNexusRisk === "CRITICAL") {
    if (profileRank(profile) < profileRank("Q2_CRITICAL_CHANGE_GATE")) {
      profile = "Q2_CRITICAL_CHANGE_GATE";
    }
    reasons.push(`GITNEXUS: ${options.gitNexusRisk} upstream impact`);
  }

  let rejectedDowngrade: QualityProfile | undefined;
  if (options.requestedProfile) {
    const requestedRank = profileRank(options.requestedProfile);
    const selectedRank = profileRank(profile);
    if (requestedRank < selectedRank) {
      rejectedDowngrade = options.requestedProfile;
      findings.push({
        code: "PROFILE_DOWNGRADE_REJECTED",
        message: `Requested ${options.requestedProfile} is weaker than selected ${profile}`,
      });
    } else if (requestedRank > selectedRank) {
      profile = options.requestedProfile;
      reasons.push(`USER_ESCALATION: explicitly escalated to ${options.requestedProfile}`);
    }
  }

  return {
    classification: {
      profile,
      reasons: unique(reasons),
      files,
      affected_capabilities: unique(capabilities).sort(),
      fail_closed: failClosed,
      ...(rejectedDowngrade ? { rejected_downgrade: rejectedDowngrade } : {}),
    },
    findings,
  };
}
